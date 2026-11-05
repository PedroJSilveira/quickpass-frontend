import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import {
  FotoChave,
  FotosVistoria,
  Payment,
  Protecao,
  Reserva,
  StatusReserva,
  Vistoria,
} from '../models/domain.models';
import { PaymentGateway } from '../adapters/payment.gateway';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { diasEntre, intervalosSeSobrepoem } from '../../shared/utils/date.util';
import { CatalogService } from './catalog.service';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';
import { ClockService } from './clock.service';
import { DepositService } from './deposit.service';
import { ExperimentService } from './experiment.service';
import { ReferralService } from './referral.service';
import { OwnerService } from './owner.service';
import { PayoutService } from './payout.service';
import { PricingService } from './pricing.service';
import { ReviewService } from './review.service';
import { SchedulerService } from './scheduler.service';

export const FOTOS_OBRIGATORIAS: { chave: FotoChave; rotulo: string }[] = [
  { chave: 'frente', rotulo: 'frente' },
  { chave: 'traseira', rotulo: 'traseira' },
  { chave: 'lateral_esquerda', rotulo: 'lateral esquerda' },
  { chave: 'lateral_direita', rotulo: 'lateral direita' },
  { chave: 'painel', rotulo: 'painel / km' },
  { chave: 'estofamento', rotulo: 'estofamento' },
  { chave: 'combustivel', rotulo: 'combustível' },
];

/**
 * Transições permitidas da reserva (QUICKPASS_REQUISITOS.md §4.2). Qualquer
 * outra é rejeitada por `mover`.
 */
export const TRANSICOES_RESERVA: Record<StatusReserva, StatusReserva[]> = {
  aguardando_kyc: ['solicitada', 'expirada', 'cancelada'],
  solicitada: ['aprovada', 'rejeitada', 'expirada', 'cancelada'],
  aprovada: ['confirmada', 'falha_pagamento', 'expirada', 'cancelada'],
  confirmada: ['em_andamento', 'cancelada'],
  em_andamento: ['concluida', 'em_disputa'],
  em_disputa: ['concluida'],
  concluida: [],
  rejeitada: [],
  expirada: [],
  cancelada: [],
  falha_pagamento: [],
};

/** Estados que ocupam a agenda do veículo. `aguardando_kyc`/`solicitada`/`aprovada` são holds com prazo. */
const OCUPAM_AGENDA: StatusReserva[] = ['aguardando_kyc', 'solicitada', 'aprovada', 'confirmada', 'em_andamento'];
const HOLDS: StatusReserva[] = ['aguardando_kyc', 'solicitada', 'aprovada'];
const PAGAS: StatusReserva[] = ['confirmada', 'em_andamento', 'em_disputa', 'concluida'];

/**
 * Orquestração da reserva (RF12). Cada transição é validada, auditada e emite
 * o evento correspondente; efeitos financeiros passam pelo PaymentGateway e
 * pelo DepositService.
 */
@Injectable({ providedIn: 'root' })
export class BookingService {
  private pricing = inject(PricingService);
  private config = inject(AppConfigService);
  private clock = inject(ClockService);
  private audit = inject(AuditService);
  private bus = inject(EventBusService);
  private auth = inject(AuthService);
  private gateway = inject(PaymentGateway);
  private deposit = inject(DepositService);
  private payout = inject(PayoutService);
  // OwnerService depende de BookingService (deriva as solicitações): resolvido sob demanda para evitar ciclo.
  private injector = inject(Injector);
  private seq = 2300;

  private readonly _reservas = signal<Reserva[]>([]);
  private readonly _pagamentos = signal<Payment[]>([]);
  private readonly _vistorias = signal<Vistoria[]>([]);
  /** Rascunhos de vistoria em edição (sobrevivem à troca de papel/tela para os dois aceites). */
  private readonly _rascunhos = signal<Record<string, Vistoria>>({});

  readonly reservas = this._reservas.asReadonly();
  readonly pagamentos = this._pagamentos.asReadonly();
  readonly vistorias = this._vistorias.asReadonly();

  constructor() {
    this.semear();
    const sched = inject(SchedulerService);
    sched.registrar('reservas-expiracao', () => this.expirarPendentes());
    sched.registrar('reservas-repasse', () => this.processarRepasses());
  }

  // ───────────── consultas ─────────────

  reservasDoLocatario(locatarioId: string) {
    return computed(() => this._reservas().filter((r) => r.locatarioId === locatarioId));
  }

  porId(id: string): Reserva | undefined {
    return this._reservas().find((r) => r.id === id);
  }

  pagamentoDaReserva(id: string): Payment | undefined {
    return this._pagamentos().find((p) => p.reservaId === id);
  }

  /** Pagamento e caução confirmados (libera o endereço exato — RNF02). */
  pagamentoConfirmado(id: string): boolean {
    const r = this.porId(id);
    const p = this.pagamentoDaReserva(id);
    return !!r && PAGAS.includes(r.status) && (p?.status === 'finalizado' || p?.status === 'estornado_parcial');
  }

  /** Há reserva/hold ativo que ocupa a agenda do veículo no intervalo [inicio, fim)? */
  temConflito(veiculoId: string, inicio: string, fim: string, ignorarId?: string): boolean {
    return this._reservas().some(
      (r) =>
        r.veiculoId === veiculoId &&
        r.id !== ignorarId &&
        this.ocupaAgenda(r) &&
        intervalosSeSobrepoem(inicio, fim, r.inicio, r.fim),
    );
  }

  private ocupaAgenda(r: Reserva): boolean {
    if (!OCUPAM_AGENDA.includes(r.status)) return false;
    // Hold vencido não ocupa mais (o job também move para `expirada`).
    return !(HOLDS.includes(r.status) && this.clock.passou(r.holdExpiraEm));
  }

  // ───────────── solicitação ─────────────

  /**
   * Cria a solicitação. Sem KYC aprovado, a reserva fica em `aguardando_kyc`
   * com hold de HOLD_KYC_MINUTOS (BDD 9.1); a UI deve redirecionar ao KYC.
   */
  solicitar(params: {
    veiculoId: string;
    locatarioId: string;
    inicio: string;
    fim: string;
    protecao: Protecao;
    diaria: number;
    origem?: string;
  }): Reserva {
    if (this.temConflito(params.veiculoId, params.inicio, params.fim)) {
      throw new Error('Veículo indisponível no período: há reserva ou hold ativo.');
    }
    const owner = this.injector.get(OwnerService);
    if (!owner.diasLiberados(params.veiculoId, diasEntre(params.inicio, params.fim))) {
      throw new Error('O proprietário não liberou todas as datas do período.');
    }

    owner.validarPreferencias(params.veiculoId, params.inicio, params.fim);

    const kycOk = this.auth.verificarExpiracao();
    const agora = this.clock.iso();
    const reserva: Reserva = {
      id: 'QP-' + ++this.seq,
      veiculoId: params.veiculoId,
      locatarioId: params.locatarioId,
      inicio: params.inicio,
      fim: params.fim,
      protecao: params.protecao,
      status: kycOk ? 'solicitada' : 'aguardando_kyc',
      valores: this.pricing.calcular(params.diaria, params.protecao, params.inicio, params.fim),
      avaliada: false,
      origem: params.origem ?? this.injector.get(CatalogService).origemSolicitacao(),
      criadaEm: agora,
      holdExpiraEm: kycOk
        ? this.clock.maisHoras(this.config.get('PRAZO_APROVACAO_RESERVA_HORAS'))
        : this.clock.maisMinutos(this.config.get('HOLD_KYC_MINUTOS')),
      aprovacaoExpiraEm: kycOk ? this.clock.maisHoras(this.config.get('PRAZO_APROVACAO_RESERVA_HORAS')) : null,
      checkoutEm: null,
    };
    this._reservas.update((l) => [reserva, ...l]);
    this.injector.get(CatalogService).origemSolicitacao.set('busca');
    this.audit.registrar({ entidade: 'reserva', entidadeId: reserva.id, de: null, para: reserva.status, ator: params.locatarioId });
    if (kycOk) this.aoSolicitar(reserva);
    return reserva;
  }

  /** Depois que o KYC é aprovado, a reserva retida segue para a fila do proprietário. */
  continuarAposKyc(id: string): Reserva {
    const r = this.obrigatoria(id);
    if (r.status !== 'aguardando_kyc') throw new Error('Reserva não está aguardando KYC.');
    if (this.clock.passou(r.holdExpiraEm)) {
      this.expirar(r, 'hold de KYC vencido');
      throw new Error('O prazo de reserva das datas terminou.');
    }
    if (!this.auth.verificarExpiracao()) throw new Error('KYC ainda não aprovado.');
    const prazo = this.clock.maisHoras(this.config.get('PRAZO_APROVACAO_RESERVA_HORAS'));
    this.mover(id, 'solicitada', r.locatarioId, undefined, { holdExpiraEm: prazo, aprovacaoExpiraEm: prazo });
    this.aoSolicitar(this.obrigatoria(id));
    return this.obrigatoria(id);
  }

  private aoSolicitar(r: Reserva): void {
    this.bus.emitir('reserva_solicitada', {
      reservation_id: r.id,
      vehicle_id: r.veiculoId,
      total_amount: r.valores.total,
      origem: r.origem,
    });
    this.bus.emitir('solicitacao_recebida', { reservation_id: r.id, vehicle_id: r.veiculoId });
    // Aprovação automática: investimento do proprietário (RF12/RF17).
    // Só para locatários bem avaliados (reputação publicada, senão a nota do cadastro).
    const nota = this.injector.get(ReviewService).reputacaoDoLocatario(r.locatarioId).media ?? (r.locatarioId === this.auth.conta().id ? this.auth.conta().nota : 0);
    if (this.injector.get(OwnerService).aceiteAutomatico(r.veiculoId) && nota >= this.config.get('NOTA_MINIMA_APROVACAO_AUTOMATICA')) {
      this.aprovar(r.id, 'sistema', 'aprovação automática');
    }
  }

  // ───────────── resposta do proprietário ─────────────

  aprovar(id: string, ator = 'proprietario', motivo?: string): void {
    this.mover(id, 'aprovada', ator, motivo, { holdExpiraEm: this.clock.maisHoras(this.config.get('PRAZO_PAGAMENTO_HORAS')) });
    this.bus.emitir('reserva_aprovada', { reservation_id: id, ator });
  }

  rejeitar(id: string, ator = 'proprietario', motivo?: string): void {
    this.mover(id, 'rejeitada', ator, motivo, { holdExpiraEm: null });
    this.bus.emitir('reserva_rejeitada', { reservation_id: id, ator, motivo });
  }

  // ───────────── pagamento + caução → confirmada ─────────────

  /**
   * Cobra a diária e pré-autoriza a caução. Só confirma se AMBOS passarem;
   * qualquer falha vai a `falha_pagamento`, libera o hold e (se já cobrou) estorna.
   */
  async pagar(id: string): Promise<Reserva> {
    const r = this.obrigatoria(id);
    if (r.status !== 'aprovada') throw new Error('Só é possível pagar uma reserva aprovada.');
    if (this.clock.passou(r.holdExpiraEm)) {
      this.expirar(r, 'prazo de pagamento vencido');
      throw new Error('O prazo para pagamento terminou.');
    }
    if (this.temConflitoConfirmado(r)) throw new Error('Há outra reserva confirmada sobreposta.');

    const v = r.valores;
    this.salvarPagamento({ reservaId: id, valorDiaria: v.diaria, taxaPlataforma: v.taxa, desconto: 0, total: v.total, estornado: 0, status: 'pendente', pagoEm: null });

    const cobranca = await this.gateway.cobrar(id, v.total);
    if (!cobranca.ok) {
      this.atualizarPagamento(id, { status: 'falhou' });
      this.bus.emitir('pagamento_falhou', { reservation_id: id, valor: v.total, taxa_plataforma: v.taxa, desconto: 0, motivo: cobranca.motivo });
      this.mover(id, 'falha_pagamento', 'sistema', cobranca.motivo, { holdExpiraEm: null });
      return this.obrigatoria(id);
    }

    const caucaoOk = await this.deposit.preAutorizar(id, v.caucao, r.fim);
    if (!caucaoOk) {
      await this.gateway.estornar(id, v.total);
      this.atualizarPagamento(id, { status: 'falhou' });
      this.bus.emitir('pagamento_falhou', { reservation_id: id, valor: v.total, taxa_plataforma: v.taxa, desconto: 0, motivo: 'caução não pré-autorizada' });
      this.mover(id, 'falha_pagamento', 'sistema', 'falha na pré-autorização da caução', { holdExpiraEm: null });
      return this.obrigatoria(id);
    }

    // RF09: isenção da taxa na 1ª locação de novos proprietários (grupo tratamento do experimento).
    const ownerId = this.injector.get(OwnerService).proprietarioDoVeiculo(r.veiculoId);
    const desconto = ownerId ? this.injector.get(ExperimentService).avaliarDesconto(ownerId, v.taxa, this.proprietarioTemConcluida(ownerId), id) : 0;
    this.atualizarPagamento(id, { status: 'finalizado', pagoEm: this.clock.iso(), desconto });
    this.mover(id, 'confirmada', r.locatarioId, undefined, { holdExpiraEm: null });
    this.bus.emitir('pagamento_finalizado', { reservation_id: id, valor: v.total, taxa_plataforma: v.taxa, desconto });
    return this.obrigatoria(id);
  }

  private proprietarioTemConcluida(ownerId: string): boolean {
    const cat = this.injector.get(CatalogService);
    return this._reservas().some((x) => x.status === 'concluida' && cat.porId(x.veiculoId)?.proprietarioId === ownerId);
  }

  private temConflitoConfirmado(r: Reserva): boolean {
    return this._reservas().some(
      (o) => o.id !== r.id && o.veiculoId === r.veiculoId && ['confirmada', 'em_andamento'].includes(o.status) && intervalosSeSobrepoem(r.inicio, r.fim, o.inicio, o.fim),
    );
  }

  // ───────────── cancelamento ─────────────

  /** Cancela e aplica a política de estorno por antecedência (config; ponto em aberto §14.5). */
  async cancelar(id: string, ator: string, motivo?: string): Promise<void> {
    const r = this.obrigatoria(id);
    const paga = r.status === 'confirmada';
    this.mover(id, 'cancelada', ator, motivo, { holdExpiraEm: null });
    this.bus.emitir('reserva_cancelada', { reservation_id: id, ator, motivo });
    if (!paga) return;

    const horasAte = (new Date(r.inicio + 'T00:00:00').getTime() - this.clock.now().getTime()) / 3600_000;
    const total = this.pagamentoDaReserva(id)?.total ?? r.valores.total;
    const pct = horasAte >= this.config.get('CANCELAMENTO_REEMBOLSO_TOTAL_HORAS') ? 100 : this.config.get('CANCELAMENTO_REEMBOLSO_PARCIAL_PCT');
    const valor = (total * pct) / 100;
    await this.gateway.estornar(id, valor);
    this.atualizarPagamento(id, { estornado: valor, status: pct === 100 ? 'estornado_total' : 'estornado_parcial' });
    this.audit.registrar({ entidade: 'pagamento', entidadeId: id, de: 'finalizado', para: pct === 100 ? 'estornado_total' : 'estornado_parcial', ator, motivo: `política de cancelamento (${pct}%)` });
    await this.deposit.liberarPorCancelamento(id);
  }

  // ───────────── vistorias (RF03) ─────────────

  vistoriaVazia(reservaId: string, tipo: 'checkin' | 'checkout'): Vistoria {
    const fotos = {} as FotosVistoria;
    for (const f of FOTOS_OBRIGATORIAS) {
      fotos[f.chave] = { status: 'pendente', progresso: 0, tentativas: 0, tiradaEm: null, localAproximada: null };
    }
    return {
      reservaId,
      tipo,
      fotos,
      km: null,
      combustivel: '3/4',
      observacoes: '',
      criadaEm: this.clock.iso(),
      aceiteLocatario: false,
      aceiteProprietario: false,
    };
  }

  /** Rascunho da vistoria (criado vazio se não existir). Só lê; grava via `atualizarRascunho`. */
  rascunho(reservaId: string, tipo: 'checkin' | 'checkout'): Vistoria {
    return this._rascunhos()[`${reservaId}:${tipo}`] ?? this.vistoriaVazia(reservaId, tipo);
  }

  atualizarRascunho(reservaId: string, tipo: 'checkin' | 'checkout', alterar: (v: Vistoria) => Vistoria): void {
    const chave = `${reservaId}:${tipo}`;
    this._rascunhos.update((m) => ({ ...m, [chave]: alterar(m[chave] ?? this.vistoriaVazia(reservaId, tipo)) }));
  }

  /** Fotos já confirmadas como recebidas pelo servidor. */
  contarFotos(fotos: FotosVistoria): number {
    return Object.values(fotos).filter((f) => f.status === 'enviada').length;
  }

  /** O check-in só é aceito dentro da janela da reserva (JANELA_CHECKIN_MINUTOS). */
  dentroDaJanelaCheckin(r: Reserva): boolean {
    const abre = new Date(r.inicio + 'T00:00:00').getTime() - this.config.get('JANELA_CHECKIN_MINUTOS') * 60_000;
    const fecha = new Date(r.fim + 'T23:59:59').getTime();
    const t = this.clock.now().getTime();
    return t >= abre && t <= fecha;
  }

  /**
   * Conclui a vistoria. Exige as 7 fotos confirmadas pelo servidor E o aceite
   * das duas partes; só então o status muda. No check-out, `avaria` leva a
   * `em_disputa`; caso contrário a `concluida` e a caução entra na fila de
   * liberação automática.
   */
  registrarVistoria(vistoria: Vistoria, opcoes: { avaria?: boolean } = {}): void {
    const r = this.obrigatoria(vistoria.reservaId);
    const obrigatorias = this.config.get('FOTOS_VISTORIA_OBRIGATORIAS');
    if (this.contarFotos(vistoria.fotos) < obrigatorias) throw new Error(`Faltam fotos: são obrigatórias ${obrigatorias} confirmadas.`);
    if (!vistoria.aceiteLocatario || !vistoria.aceiteProprietario) throw new Error('É necessário o aceite do locatário e do proprietário.');

    if (vistoria.tipo === 'checkin') {
      if (r.status !== 'confirmada') throw new Error('Check-in só é possível em reserva confirmada.');
      if (!this.dentroDaJanelaCheckin(r)) throw new Error('Fora da janela de check-in da reserva.');
      this._vistorias.update((l) => [...l, vistoria]);
      this.mover(r.id, 'em_andamento', 'locatario');
      this.bus.emitir('checkin_concluido', { reservation_id: r.id, qtd_fotos: this.contarFotos(vistoria.fotos), status_localizacao: this.statusLocalizacao(vistoria) });
      this.garantirPrevisto(r);
      return;
    }

    if (r.status !== 'em_andamento') throw new Error('Check-out só é possível em reserva em andamento.');
    this.garantirPrevisto(r);
    this._vistorias.update((l) => [...l, vistoria]);
    const avaria = !!opcoes.avaria;
    this.mover(r.id, avaria ? 'em_disputa' : 'concluida', 'locatario', undefined, { checkoutEm: this.clock.iso() });
    const horas = (Date.now() - new Date(r.inicio + 'T00:00:00').getTime()) / 3600_000;
    this.bus.emitir('checkout_concluido', { reservation_id: r.id, duracao_horas: Math.max(0, Math.round(horas)), avaria_flag: avaria });
    if (!avaria) {
      this.deposit.agendarLiberacao(r.id);
      void this.processarRepasses();
    }
  }

  private garantirPrevisto(r: Reserva): void {
    const titulo = this.injector.get(OwnerService).veiculoTitulo(r.veiculoId);
    this.payout.registrarPrevisto({ reservaId: r.id, veiculoId: r.veiculoId, veiculoTitulo: titulo, periodo: this.pricing.formatarPeriodo(r.inicio, r.fim), bruto: r.valores.subtotal, desconto: this.pagamentoDaReserva(r.id)?.desconto ?? 0 });
  }

  private statusLocalizacao(v: Vistoria): 'registrada' | 'nao_informada' {
    return Object.values(v.fotos).some((f) => f.localAproximada) ? 'registrada' : 'nao_informada';
  }

  // ───────────── conclusão pós-disputa e repasse ─────────────

  /** Chamado pelo DisputeService após decisão registrada. */
  concluirAposDisputa(id: string, ator: string): void {
    this.mover(id, 'concluida', ator, 'disputa decidida');
    void this.processarRepasses();
  }

  /**
   * Repasse só após `concluida` + caução resolvida (RF12). Idempotente; também
   * emite `transacao_concluida`.
   */
  async processarRepasses(): Promise<void> {
    for (const r of this._reservas()) {
      if (r.status !== 'concluida' || !this.deposit.resolvida(r.id)) continue;
      const rep = this.payout.daReserva(r.id);
      if (!rep || rep.status === 'Pago') continue;
      this.payout.pagar(r.id, this.clock.iso().slice(0, 10));
      const p = this.pagamentoDaReserva(r.id);
      this.bus.emitir('repasse_realizado', { reservation_id: r.id, owner_id: this.injector.get(OwnerService).proprietarioDoVeiculo(r.veiculoId), valor: rep.liquido });
      this.bus.emitir('transacao_concluida', {
        reservation_id: r.id,
        gmv: r.valores.total,
        taxa_plataforma: r.valores.taxa,
        desconto: p?.desconto ?? 0,
        estornado: (p?.estornado ?? 0) >= (p?.total ?? Infinity),
        locatario_id: r.locatarioId,
        owner_id: this.injector.get(OwnerService).proprietarioDoVeiculo(r.veiculoId),
      });
      // Indicação qualifica quando o convidado conclui E paga a 1ª locação.
      const anteriores = this._reservas().filter((x) => x.locatarioId === r.locatarioId && x.status === 'concluida' && x.id !== r.id && (x.concluidaEm ?? '') <= (r.concluidaEm ?? '')).length;
      if (anteriores === 0 && (p?.status === 'finalizado' || p?.status === 'estornado_parcial')) this.injector.get(ReferralService).qualificar(r.locatarioId);
    }
  }

  // ───────────── jobs ─────────────

  /** Job: holds de KYC vencidos e solicitações sem resposta viram `expirada` (libera a agenda). */
  expirarPendentes(): void {
    for (const r of this._reservas()) {
      if (HOLDS.includes(r.status) && this.clock.passou(r.holdExpiraEm)) {
        this.expirar(r, r.status === 'aguardando_kyc' ? 'hold de KYC vencido' : r.status === 'solicitada' ? 'sem resposta do proprietário no prazo' : 'prazo de pagamento vencido');
      }
    }
  }

  private expirar(r: Reserva, motivo: string): void {
    this.mover(r.id, 'expirada', 'sistema', motivo, { holdExpiraEm: null });
    this.bus.emitir('reserva_expirada', { reservation_id: r.id, ator: 'sistema', motivo });
  }

  // ───────────── avaliação ─────────────

  /** Marca a reserva como avaliada pelo locatário (a avaliação em si vive no ReviewService). */
  marcarAvaliada(id: string): void {
    this._reservas.update((lista) => lista.map((r) => (r.id === id ? { ...r, avaliada: true } : r)));
  }

  // ───────────── núcleo da máquina de estados ─────────────

  /** Única porta de mudança de status: valida a tabela, audita e persiste. */
  mover(id: string, para: StatusReserva, ator: string, motivo?: string, patch: Partial<Reserva> = {}): void {
    const r = this.obrigatoria(id);
    if (!TRANSICOES_RESERVA[r.status].includes(para)) {
      throw new Error(`Transição inválida de reserva: ${r.status} → ${para}`);
    }
    const concluidaEm = para === 'concluida' ? { concluidaEm: this.clock.iso() } : {};
    this._reservas.update((l) => l.map((x) => (x.id === id ? { ...x, ...patch, ...concluidaEm, status: para } : x)));
    this.audit.registrar({ entidade: 'reserva', entidadeId: id, de: r.status, para, ator, motivo });
  }

  private obrigatoria(id: string): Reserva {
    const r = this.porId(id);
    if (!r) throw new Error('Reserva não encontrada: ' + id);
    return r;
  }

  private salvarPagamento(p: Payment): void {
    this._pagamentos.update((l) => [...l.filter((x) => x.reservaId !== p.reservaId), p]);
  }

  private atualizarPagamento(id: string, patch: Partial<Payment>): void {
    this._pagamentos.update((l) => l.map((p) => (p.reservaId === id ? { ...p, ...patch } : p)));
  }

  // ───────────── dados de demonstração ─────────────

  private semear(): void {
    const hoje = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const base = (r: Pick<Reserva, 'id' | 'veiculoId' | 'locatarioId' | 'inicio' | 'fim' | 'protecao' | 'status'>, diaria: number): Reserva => ({
      ...r,
      valores: this.pricing.calcular(diaria, r.protecao, r.inicio, r.fim),
      avaliada: false,
      origem: 'busca',
      criadaEm: this.clock.iso(),
      holdExpiraEm: null,
      aprovacaoExpiraEm: null,
      checkoutEm: null,
    });
    const seeds: Reserva[] = [
      base({ id: 'QP-2291', veiculoId: '3', locatarioId: 'u1', inicio: '2026-08-21', fim: '2026-08-24', protecao: 'completa', status: 'em_andamento' }, 240),
      { ...base({ id: 'QP-2107', veiculoId: '2', locatarioId: 'u1', inicio: '2026-07-10', fim: '2026-07-12', protecao: 'basica', status: 'concluida' }, 95), concluidaEm: '2026-07-12T12:00:00.000Z' },
      // Demonstra o check-in: confirmada com retirada hoje.
      base({ id: 'QP-2330', veiculoId: '5', locatarioId: 'u1', inicio: hoje(0), fim: hoje(2), protecao: 'basica', status: 'confirmada' }, 220),
    ];
    const pendente = base({ id: 'QP-2310', veiculoId: '1', locatarioId: 'u9', inicio: hoje(30), fim: hoje(32), protecao: 'completa', status: 'solicitada' }, 180);
    pendente.finalidade = 'Viagem de trabalho';
    pendente.holdExpiraEm = this.clock.maisHoras(12);
    pendente.aprovacaoExpiraEm = pendente.holdExpiraEm;
    seeds.push(pendente);
    this._reservas.set(seeds);
    this.deposit.semear('QP-2291', seeds[0].valores.caucao, 'PRE_AUTORIZADA');
    this.deposit.semear('QP-2107', seeds[1].valores.caucao, 'LIBERADA');
    this.deposit.semear('QP-2330', seeds[2].valores.caucao, 'PRE_AUTORIZADA');
    for (const r of seeds) {
      if (['concluida', 'em_andamento', 'confirmada'].includes(r.status)) {
        this._pagamentos.update((l) => [
          ...l,
          { reservaId: r.id, valorDiaria: r.valores.diaria, taxaPlataforma: r.valores.taxa, desconto: 0, total: r.valores.total, estornado: 0, status: 'finalizado', pagoEm: r.criadaEm },
        ]);
      }
    }
  }
}
