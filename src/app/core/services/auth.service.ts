import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapConta } from '../api/mappers';
import { SessaoStore } from '../api/sessao.store';
import { CanalNotificacao, Conta, FinalidadeConsentimento, Papel, StatusKyc } from '../models/domain.models';
import { AttributionService } from './attribution.service';
import { ReferralService } from './referral.service';

type ItemKyc = 'doc' | 'cnh' | 'selfie' | 'banco';

const CONTA_VAZIA: Conta = {
  id: '',
  nome: '',
  email: '',
  cpf: '',
  papeis: [],
  admin: false,
  kyc: { doc: false, cnh: false, selfie: false, banco: false, aprovado: false },
  nota: 0,
  cnhAnos: 0,
  membroDesde: '2000-01',
  validadeCnh: '',
  origem: null,
  consentimentos: {
    push: { marketing: false, transacional: true },
    email: { marketing: false, transacional: true },
    sms: { marketing: false, transacional: true },
  },
};

/**
 * Conta, sessão e KYC, tudo contra a API. O token fica em `SessaoStore`; papéis (locatário e/ou
 * proprietário) e o status do KYC vêm do servidor. Contas admin só existem no banco: não há
 * cadastro nem promoção a ADMIN pela interface.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private sessao = inject(SessaoStore);
  private attribution = inject(AttributionService);
  private referral = inject(ReferralService);

  private readonly _conta = signal<Conta | null>(null);
  private readonly _statusKyc = signal<StatusKyc>('PENDENTE');

  /** Conta logada (ou uma conta vazia enquanto ninguém entrou — use `logado()` para distinguir). */
  readonly conta = computed(() => this._conta() ?? CONTA_VAZIA);
  readonly logado = computed(() => this._conta() !== null);
  readonly admin = computed(() => this._conta()?.admin ?? false);
  readonly statusKyc = this._statusKyc.asReadonly();

  /** Papel em uso agora (um usuário pode ter os dois e alternar). */
  readonly papelAtivo = computed<Papel>(() => {
    const papeis = this.conta().papeis;
    const salvo = this.sessao.papelAtivo();
    if (salvo && papeis.includes(salvo)) return salvo;
    return papeis[0] ?? 'locatario';
  });

  readonly itensKycConcluidos = computed(() => {
    const { doc, cnh, selfie, banco } = this.conta().kyc;
    return [doc, cnh, selfie, banco].filter(Boolean).length;
  });

  /** Só `APROVADO` libera reservar/publicar (RF02). */
  readonly contaVerificada = computed(() => this._statusKyc() === 'APROVADO');

  temPapel(p: Papel): boolean {
    return this.conta().papeis.includes(p);
  }

  /** Para onde levar o usuário logo após entrar. */
  rotaInicial(): string {
    if (this.admin()) return '/admin/veiculos';
    return this.papelAtivo() === 'proprietario' ? '/proprietario' : '/buscar';
  }

  // ───────────── sessão ─────────────

  private aplicar(raw: any): void {
    this._conta.set(mapConta(raw));
    this._statusKyc.set(raw.statusKyc as StatusKyc);
    const c = this._conta()!;
    if (!c.papeis.includes(this.sessao.papelAtivo() as Papel)) this.sessao.definirPapel(c.papeis[0] ?? null);
  }

  /** Recarrega a conta no servidor (status do KYC, nota, papéis…). */
  async atualizar(): Promise<void> {
    this.aplicar(await this.api.get('/me'));
  }

  /** No início do app: retoma a sessão salva, se o token ainda valer. */
  async restaurar(): Promise<void> {
    if (!this.sessao.token) return;
    try {
      await this.atualizar();
      void this.iniciarSessao();
    } catch {
      this.sessao.definirToken(null);
      this.sessao.definirPapel(null);
    }
  }

  async entrar(email: string, senha: string): Promise<void> {
    const origem = new URLSearchParams(globalThis.location?.search ?? '').get('origem');
    const r = await this.api.post<{ token: string; usuario: unknown }>('/auth/login', { email, senha, origem });
    this.sessao.definirToken(r.token);
    this.sessao.definirPapel(null);
    this.aplicar(r.usuario);
  }

  async cadastrar(d: { nome: string; email: string; cpf: string; senha: string; papeis: Papel[]; cnhAnos: number }): Promise<void> {
    const a = this.attribution.paraCadastro();
    const r = await this.api.post<{ token: string; usuario: unknown }>('/auth/cadastro', {
      nome: d.nome,
      email: d.email,
      cpf: d.cpf,
      senha: d.senha,
      papeis: d.papeis.map((p) => p.toUpperCase()),
      cnhAnos: d.cnhAnos,
      dispositivo: this.referral.dispositivoAtual(),
      atribuicao: { utmSource: a.utm_source, utmMedium: a.utm_medium, utmCampaign: a.utm_campaign, utmTerm: a.utm_term, utmContent: a.utm_content, ref: a.referral_code, referrer: globalThis.document?.referrer || null },
    });
    this.sessao.definirToken(r.token);
    this.sessao.definirPapel(d.papeis[0]);
    this.aplicar(r.usuario);
  }

  async sair(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch {
      /* já inválida no servidor */
    }
    this.sessao.definirToken(null);
    this.sessao.definirPapel(null);
    this._conta.set(null);
    this._statusKyc.set('PENDENTE');
  }

  /** Início de sessão do app (retorno espontâneo x notificado — RF15). */
  async iniciarSessao(): Promise<void> {
    const q = new URLSearchParams(globalThis.location?.search ?? '');
    try {
      await this.api.post('/me/sessao', { origem: q.get('origem') ?? undefined, notificacaoId: q.get('notificacao_id') ?? undefined });
    } catch {
      /* métrica não deve quebrar o app */
    }
  }

  // ───────────── papéis ─────────────

  alternarPapel(papel: Papel): void {
    if (this.temPapel(papel)) this.sessao.definirPapel(papel);
  }

  /** Define quais papéis a própria conta usa (pode ser os dois). */
  async definirPapeis(papeis: Papel[]): Promise<void> {
    this.aplicar(await this.api.put('/me/papeis', { papeis: papeis.map((p) => p.toUpperCase()) }));
  }

  // ───────────── KYC ─────────────

  /** Envia o arquivo de um item do KYC; com os 4 itens a análise é concluída no servidor. */
  async enviarItemKyc(item: ItemKyc, arquivo: Blob): Promise<void> {
    this.aplicar(await this.api.upload(`/me/kyc/${item.toUpperCase()}`, { arquivos: { arquivo } }));
  }

  /** true se o KYC está aprovado e não expirou (consulta o servidor). */
  async verificarExpiracao(): Promise<boolean> {
    if (!this.logado()) return false;
    try {
      await this.atualizar();
    } catch {
      /* usa o último estado conhecido */
    }
    return this.contaVerificada();
  }

  // ───────────── consentimento (RNF03) ─────────────

  async definirConsentimento(canal: CanalNotificacao, finalidade: FinalidadeConsentimento, valor: boolean): Promise<void> {
    this.aplicar(await this.api.put('/me/consentimentos', { canal: canal.toUpperCase(), finalidade: finalidade.toUpperCase(), valor }));
  }
}
