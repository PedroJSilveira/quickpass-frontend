import { Injectable, computed, inject, signal } from '@angular/core';
import { AcquisitionAttribution, Conta, Kyc, Papel, StatusKyc } from '../models/domain.models';
import { KycProvider } from '../adapters/kyc.provider';
import { EventBusService } from '../analytics/event-bus.service';
import { AttributionService } from './attribution.service';
import { AuditService } from './audit.service';
import { ClockService } from './clock.service';
import { SchedulerService } from './scheduler.service';
import { ReferralService } from './referral.service';

/**
 * Conta e sessão do usuário: cadastro, papel ativo (locatário/proprietário)
 * e KYC (RF02). O provedor de KYC é um adapter (KycProvider). Em produção isto
 * conversa com um serviço de identidade/JWT — aqui mantemos o estado em
 * memória via signals.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private provider = inject(KycProvider);
  private bus = inject(EventBusService);
  private attribution = inject(AttributionService);
  private audit = inject(AuditService);
  private clock = inject(ClockService);
  private referral = inject(ReferralService);

  private readonly _conta = signal<Conta>({
    id: 'u1',
    nome: 'Mariana Souza',
    email: 'mariana.souza@example.com',
    cpf: '',
    papel: 'locatario',
    kyc: { doc: false, cnh: false, selfie: false, banco: false, aprovado: false },
    nota: 4.8,
    cnhAnos: 6,
    membroDesde: '2025-03-01',
    validadeCnh: '',
    origem: null,
  });
  private readonly _statusKyc = signal<StatusKyc>('PENDENTE');
  private kycIniciadoEm: number | null = null;

  readonly conta = this._conta.asReadonly();
  readonly statusKyc = this._statusKyc.asReadonly();
  readonly papelAtivo = computed(() => this._conta().papel);

  readonly itensKycConcluidos = computed(() => {
    const { doc, cnh, selfie, banco } = this._conta().kyc;
    return [doc, cnh, selfie, banco].filter(Boolean).length;
  });

  /** Só `APROVADO` libera reservar/publicar (RF02). */
  readonly contaVerificada = computed(() => this._statusKyc() === 'APROVADO');

  constructor() {
    inject(SchedulerService).registrar('kyc-expiracao', () => this.verificarExpiracao());
  }

  cadastrar(dados: { nome: string; email: string; cpf: string; papel: Papel }): void {
    const jaTinhaOrigem = this._conta().origem !== null;
    // First-touch imutável: só grava se ainda não existe (RF08).
    const origem: AcquisitionAttribution | null = jaTinhaOrigem ? this._conta().origem : this.attribution.paraCadastro();
    this._conta.update((c) => ({ ...c, ...dados, origem }));
    if (!jaTinhaOrigem && origem) {
      // Indicação: autoindicação (mesmo usuário/dispositivo/documento) não é registrada.
      if (origem.referral_code) {
        this.referral.registrarCadastro(origem.referral_code, { id: this._conta().id, cpf: dados.cpf, dispositivo: this.referral.dispositivoAtual() });
      }
      this.bus.emitir('cadastro_concluido', {
        user_id: this._conta().id,
        canal_origem: origem.canal,
        utm_source: origem.utm_source,
        utm_medium: origem.utm_medium,
        utm_campaign: origem.utm_campaign,
        referral_code: origem.referral_code,
      });
    }
  }

  alternarPapel(papel: Papel): void {
    this._conta.update((c) => ({ ...c, papel }));
    this.bus.atualizarContexto({ userId: this._conta().id, papel });
  }

  enviarItemKyc(item: keyof Kyc): void {
    if (item === 'aprovado') return;
    const antes = this._statusKyc();
    this._conta.update((c) => ({ ...c, kyc: { ...c.kyc, [item]: true } }));
    if (antes === 'PENDENTE' || antes === 'REPROVADO' || antes === 'EXPIRADO') {
      this.mudarStatus('EM_ANALISE');
      this.kycIniciadoEm = Date.now();
      this.bus.emitir('kyc_iniciado', { user_id: this._conta().id, tipo_usuario: this._conta().papel });
    }
    if (this.itensKycConcluidos() === 4) void this.concluirAnalise();
  }

  /** Retorna true se o KYC está aprovado e a CNH ainda é válida; marca EXPIRADO caso contrário. */
  verificarExpiracao(): boolean {
    const c = this._conta();
    if (this._statusKyc() === 'APROVADO' && c.validadeCnh && this.clock.passou(c.validadeCnh + 'T23:59:59')) {
      this._conta.update((x) => ({ ...x, kyc: { ...x.kyc, aprovado: false } }));
      this.mudarStatus('EXPIRADO');
    }
    return this._statusKyc() === 'APROVADO';
  }

  private async concluirAnalise(): Promise<void> {
    const resultado = await this.provider.analisar(this._conta().id, this._conta().kyc);
    const tempo = Math.round((Date.now() - (this.kycIniciadoEm ?? Date.now())) / 1000);
    if (resultado.status === 'APROVADO') {
      this._conta.update((c) => ({ ...c, validadeCnh: resultado.validadeCnh, kyc: { ...c.kyc, aprovado: true } }));
      this.mudarStatus('APROVADO');
      this.bus.emitir('kyc_aprovado', { user_id: this._conta().id, tempo_analise_sec: tempo, tipo_usuario: this._conta().papel });
    } else {
      this.mudarStatus('REPROVADO');
      this.bus.emitir('kyc_reprovado', { user_id: this._conta().id, tipo_usuario: this._conta().papel });
    }
  }

  private mudarStatus(para: StatusKyc): void {
    const de = this._statusKyc();
    if (de === para) return;
    this._statusKyc.set(para);
    this.audit.registrar({ entidade: 'kyc', entidadeId: this._conta().id, de, para, ator: this._conta().id });
  }
}
