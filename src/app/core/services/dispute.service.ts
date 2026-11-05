import { Injectable, computed, inject, signal } from '@angular/core';
import { DecisaoDisputa, Dispute, TipoDecisao } from '../models/domain.models';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { AuditService } from './audit.service';
import { BookingService } from './booking.service';
import { ClockService } from './clock.service';
import { DepositService } from './deposit.service';
import { SchedulerService } from './scheduler.service';

/**
 * Disputa de avaria com contraditório (RF04, §4.4):
 * ABERTA → AGUARDANDO_CONTESTACAO → (CONTESTADA | NAO_CONTESTADA_NO_PRAZO)
 *        → EM_ANALISE → DECIDIDA.
 * A decisão (mediador/admin) é o único caminho para capturar a caução.
 */
@Injectable({ providedIn: 'root' })
export class DisputeService {
  private booking = inject(BookingService);
  private deposit = inject(DepositService);
  private config = inject(AppConfigService);
  private clock = inject(ClockService);
  private bus = inject(EventBusService);
  private audit = inject(AuditService);
  private seq = 0;

  private readonly _disputas = signal<Dispute[]>([]);
  readonly disputas = this._disputas.asReadonly();
  readonly abertas = computed(() => this._disputas().filter((d) => d.status !== 'DECIDIDA'));

  constructor() {
    inject(SchedulerService).registrar('disputas-prazo', () => this.encerrarPrazosDeContestacao());
  }

  daReserva(reservaId: string): Dispute | undefined {
    return this._disputas().find((d) => d.reservaId === reservaId);
  }

  /** Proprietário informa a avaria (DamageReport): exige fotos e descrição; retém a caução, não captura. */
  informarAvaria(reservaId: string, dados: { descricao: string; qtdFotos: number; valorEstimado: number }): Dispute {
    const r = this.booking.porId(reservaId);
    if (r?.status !== 'em_disputa') throw new Error('Avaria só pode ser informada em reserva em disputa (check-out com avaria).');
    if (!dados.descricao.trim() || dados.qtdFotos < 1) throw new Error('Informe descrição e ao menos uma foto da avaria.');
    if (this.daReserva(reservaId)) throw new Error('Já existe disputa para esta reserva.');

    const agora = this.clock.iso();
    const disputa: Dispute = {
      id: 'D-' + ++this.seq,
      reservaId,
      status: 'ABERTA',
      avaria: { descricao: dados.descricao.trim(), qtdFotos: dados.qtdFotos, informadaEm: agora, valorEstimado: dados.valorEstimado },
      contestacao: null,
      contestarAte: this.clock.maisHoras(this.config.get('PRAZO_CONTESTACAO_HORAS')),
      decisao: null,
    };
    this._disputas.update((l) => [...l, disputa]);
    this.audit.registrar({ entidade: 'disputa', entidadeId: disputa.id, de: null, para: 'ABERTA', ator: 'proprietario' });
    this.deposit.reter(reservaId); // retida, NÃO capturada
    this.mudar(disputa.id, 'AGUARDANDO_CONTESTACAO', 'sistema');
    this.bus.emitir('avaria_informada', { reservation_id: reservaId, dispute_id: disputa.id });
    // O locatário é sempre notificado (transacional) e pode contestar.
    this.bus.emitir('notificacao_enviada', { user_id: r.locatarioId, canal: 'push', tipo: 'avaria_informada', motivo_dados: { dispute_id: disputa.id } });
    return this.obrigatoria(disputa.id);
  }

  contestar(disputaId: string, dados: { texto: string; qtdEvidencias: number }): void {
    const d = this.obrigatoria(disputaId);
    if (d.status !== 'AGUARDANDO_CONTESTACAO') throw new Error('A disputa não está aberta para contestação.');
    if (this.clock.passou(d.contestarAte)) throw new Error('O prazo de contestação terminou.');
    if (!dados.texto.trim()) throw new Error('Descreva sua contestação.');
    this._disputas.update((l) =>
      l.map((x) => (x.id === disputaId ? { ...x, contestacao: { texto: dados.texto.trim(), qtdEvidencias: dados.qtdEvidencias, enviadaEm: this.clock.iso() } } : x)),
    );
    this.mudar(disputaId, 'CONTESTADA', 'locatario');
    this.bus.emitir('avaria_contestada', { reservation_id: d.reservaId, dispute_id: disputaId });
  }

  /** Mediador assume a análise (somente após contestação ou fim do prazo). */
  assumirAnalise(disputaId: string, mediador: string): void {
    const d = this.obrigatoria(disputaId);
    if (d.status !== 'CONTESTADA' && d.status !== 'NAO_CONTESTADA_NO_PRAZO') throw new Error('Aguarde a contestação ou o fim do prazo.');
    this.mudar(disputaId, 'EM_ANALISE', mediador);
  }

  /** Registra a decisão, aplica na caução e conclui a reserva. */
  async decidir(disputaId: string, entrada: { tipo: TipoDecisao; valor: number; justificativa: string }, mediador: string): Promise<void> {
    const d = this.obrigatoria(disputaId);
    if (d.status !== 'EM_ANALISE') throw new Error('A disputa precisa estar em análise para ser decidida.');
    const caucao = this.deposit.porReserva(d.reservaId);
    if (!caucao) throw new Error('Caução não encontrada.');
    const valor = entrada.tipo === 'captura_total' ? caucao.valor : entrada.tipo === 'liberacao' ? 0 : entrada.valor;
    const decisao: DecisaoDisputa = { tipo: entrada.tipo, valor, justificativa: entrada.justificativa, decididaPor: mediador, decididaEm: this.clock.iso() };

    await this.deposit.aplicarDecisao(d.reservaId, decisao); // valida e falha se a decisão for inválida
    this._disputas.update((l) => l.map((x) => (x.id === disputaId ? { ...x, decisao } : x)));
    this.mudar(disputaId, 'DECIDIDA', mediador, entrada.justificativa);
    this.bus.emitir('disputa_decidida', { reservation_id: d.reservaId, dispute_id: disputaId, decisao: decisao.tipo });
    this.booking.concluirAposDisputa(d.reservaId, mediador);
  }

  /** Job: sem contestação no prazo → NAO_CONTESTADA_NO_PRAZO (segue para análise do mediador). */
  encerrarPrazosDeContestacao(): void {
    for (const d of this._disputas()) {
      if (d.status === 'AGUARDANDO_CONTESTACAO' && this.clock.passou(d.contestarAte)) {
        this.mudar(d.id, 'NAO_CONTESTADA_NO_PRAZO', 'sistema');
      }
    }
  }

  private mudar(id: string, para: Dispute['status'], ator: string, motivo?: string): void {
    const d = this.obrigatoria(id);
    this.audit.registrar({ entidade: 'disputa', entidadeId: id, de: d.status, para, ator, motivo });
    this._disputas.update((l) => l.map((x) => (x.id === id ? { ...x, status: para } : x)));
  }

  private obrigatoria(id: string): Dispute {
    const d = this._disputas().find((x) => x.id === id);
    if (!d) throw new Error('Disputa não encontrada: ' + id);
    return d;
  }
}
