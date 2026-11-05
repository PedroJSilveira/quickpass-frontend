import { Injectable, inject, signal } from '@angular/core';
import { DecisaoDisputa, DepositHold } from '../models/domain.models';
import { PaymentGateway } from '../adapters/payment.gateway';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { AuditService } from './audit.service';
import { ClockService } from './clock.service';
import { PricingService } from './pricing.service';
import { SchedulerService } from './scheduler.service';

/**
 * Caução (RF04, §4.3). Regra central: a caução NUNCA é capturada sem decisão
 * registrada — a única via de captura é `aplicarDecisao`, que exige uma
 * `DecisaoDisputa` completa (tipo, valor, justificativa, mediador).
 */
@Injectable({ providedIn: 'root' })
export class DepositService {
  private gateway = inject(PaymentGateway);
  private bus = inject(EventBusService);
  private config = inject(AppConfigService);
  private audit = inject(AuditService);
  private clock = inject(ClockService);
  private pricing = inject(PricingService);

  private readonly _caucoes = signal<DepositHold[]>([]);
  readonly caucoes = this._caucoes.asReadonly();

  constructor() {
    inject(SchedulerService).registrar('caucao-liberacao', () => void this.processarLiberacoes());
  }

  porReserva(reservaId: string): DepositHold | undefined {
    return this._caucoes().find((c) => c.reservaId === reservaId);
  }

  /** Dados de demonstração (reservas semente). */
  semear(reservaId: string, valor: number, status: DepositHold['status']): void {
    this.upsert({ reservaId, valor, status, preAutorizadaEm: this.clock.iso(), validaAte: this.clock.maisHoras(24 * 14), valorCapturado: 0, liberarEm: null });
  }

  /** Caução resolvida = não há mais pendência financeira sobre ela. */
  resolvida(reservaId: string): boolean {
    const s = this.porReserva(reservaId)?.status;
    return s === 'LIBERADA' || s === 'CAPTURADA_TOTAL' || s === 'CAPTURADA_PARCIAL';
  }

  /**
   * Pré-autoriza a caução. A validade cobre a locação + prazo de liberação +
   * prazo de contestação (RF04 regra 6). Falha → reserva não confirma (RF12).
   */
  async preAutorizar(reservaId: string, valor: number, fimLocacao: string): Promise<boolean> {
    const horasExtras = this.config.get('PRAZO_LIBERACAO_CAUCAO_HORAS') + this.config.get('PRAZO_CONTESTACAO_HORAS');
    const validaAte = new Date(new Date(fimLocacao + 'T23:59:59').getTime() + horasExtras * 3600_000).toISOString();
    this.upsert({ reservaId, valor, status: 'PENDENTE_PRE_AUTORIZACAO', preAutorizadaEm: null, validaAte, valorCapturado: 0, liberarEm: null });

    const r = await this.gateway.preAutorizar(reservaId, valor, validaAte);
    if (!r.ok) {
      this.mudar(reservaId, 'FALHA', 'gateway', r.motivo);
      this.bus.emitir('caucao_falhou', { reservation_id: reservaId, valor });
      return false;
    }
    this.upsert({ ...this.porReserva(reservaId)!, preAutorizadaEm: this.clock.iso() });
    this.mudar(reservaId, 'PRE_AUTORIZADA', 'gateway');
    this.bus.emitir('caucao_pre_autorizada', { reservation_id: reservaId, valor });
    return true;
  }

  /** Check-out sem ocorrência: agenda liberação automática após PRAZO_LIBERACAO_CAUCAO. */
  agendarLiberacao(reservaId: string): void {
    const c = this.porReserva(reservaId);
    if (c?.status !== 'PRE_AUTORIZADA') return;
    this.upsert({ ...c, liberarEm: this.clock.maisHoras(this.config.get('PRAZO_LIBERACAO_CAUCAO_HORAS')) });
  }

  /** Avaria informada: caução fica retida até decisão (não captura nada). */
  reter(reservaId: string): void {
    const c = this.porReserva(reservaId);
    if (c?.status !== 'PRE_AUTORIZADA') throw new Error('Só é possível reter uma caução pré-autorizada.');
    this.upsert({ ...c, liberarEm: null });
    this.mudar(reservaId, 'RETIDA_EM_DISPUTA', 'sistema');
  }

  /** Única via de captura/liberação pós-disputa: exige decisão registrada. */
  async aplicarDecisao(reservaId: string, decisao: DecisaoDisputa): Promise<void> {
    const c = this.porReserva(reservaId);
    if (c?.status !== 'RETIDA_EM_DISPUTA') throw new Error('Caução não está retida em disputa.');
    if (!decisao?.decididaPor || !decisao.justificativa?.trim() || !decisao.decididaEm) {
      throw new Error('Captura exige decisão registrada com justificativa e responsável.');
    }
    if (decisao.tipo === 'captura_total' && decisao.valor !== c.valor) throw new Error('Captura total deve ser igual ao valor da caução.');
    if (decisao.tipo === 'captura_parcial' && !(decisao.valor > 0 && decisao.valor < c.valor)) {
      throw new Error('Captura parcial deve estar entre 0 e o valor da caução.');
    }

    if (decisao.tipo === 'liberacao') {
      await this.gateway.liberar(reservaId);
      this.upsert({ ...c, valorCapturado: 0 });
      this.mudar(reservaId, 'LIBERADA', decisao.decididaPor, decisao.justificativa);
      this.bus.emitir('caucao_liberada', { reservation_id: reservaId, valor: c.valor });
      return;
    }
    await this.gateway.capturar(reservaId, decisao.valor);
    this.upsert({ ...c, valorCapturado: decisao.valor });
    this.mudar(reservaId, decisao.tipo === 'captura_total' ? 'CAPTURADA_TOTAL' : 'CAPTURADA_PARCIAL', decisao.decididaPor, decisao.justificativa);
    this.bus.emitir('caucao_capturada', { reservation_id: reservaId, valor: decisao.valor });
  }

  /** Cancelamento antes do check-in: devolve a pré-autorização. */
  async liberarPorCancelamento(reservaId: string): Promise<void> {
    const c = this.porReserva(reservaId);
    if (c?.status !== 'PRE_AUTORIZADA') return;
    await this.gateway.liberar(reservaId);
    this.mudar(reservaId, 'LIBERADA', 'sistema', 'cancelamento');
    this.bus.emitir('caucao_liberada', { reservation_id: reservaId, valor: c.valor });
  }

  /** Job: libera cauções sem ocorrência cujo prazo venceu. */
  async processarLiberacoes(): Promise<void> {
    const vencidas = this._caucoes().filter((c) => c.status === 'PRE_AUTORIZADA' && c.liberarEm && this.clock.passou(c.liberarEm));
    for (const c of vencidas) {
      await this.gateway.liberar(c.reservaId);
      this.mudar(c.reservaId, 'LIBERADA', 'sistema', 'prazo sem ocorrência');
      this.bus.emitir('caucao_liberada', { reservation_id: c.reservaId, valor: c.valor });
    }
  }

  private upsert(c: DepositHold): void {
    this._caucoes.update((l) => (l.some((x) => x.reservaId === c.reservaId) ? l.map((x) => (x.reservaId === c.reservaId ? c : x)) : [...l, c]));
  }

  private mudar(reservaId: string, para: DepositHold['status'], ator: string, motivo?: string): void {
    const atual = this.porReserva(reservaId)!;
    this.audit.registrar({ entidade: 'caucao', entidadeId: reservaId, de: atual.status, para, ator, motivo });
    this.upsert({ ...atual, status: para });
  }

  /** Valor padrão da caução (fonte única: PricingService). */
  get valorPadrao(): number {
    return this.pricing.caucao;
  }
}
