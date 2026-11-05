import { Injectable, inject, signal } from '@angular/core';
import { Avaliacao } from '../models/domain.models';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { BookingService } from './booking.service';
import { CatalogService } from './catalog.service';
import { ClockService } from './clock.service';
import { SchedulerService } from './scheduler.service';

/**
 * Avaliação bilateral (RF06). Opcional; ocultas até as duas partes enviarem
 * OU expirar PRAZO_AVALIACAO_HORAS após a conclusão. Quem não avalia não é
 * penalizado: sem avaliação, nada é publicado.
 */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private bus = inject(EventBusService);
  private config = inject(AppConfigService);
  private clock = inject(ClockService);
  private booking = inject(BookingService);
  private catalog = inject(CatalogService);

  private readonly _avaliacoes = signal<Avaliacao[]>([]);

  constructor() {
    inject(SchedulerService).registrar('avaliacoes-publicacao', () => this.publicarVencidas());
  }

  /** Todas as avaliações (inclui ocultas — uso interno). */
  readonly todas = this._avaliacoes.asReadonly();

  /** Só o que já foi publicado (único conteúdo que a UI pública deve mostrar). */
  publicadas(): Avaliacao[] {
    return this._avaliacoes().filter((a) => a.publicadaEm !== null);
  }

  daReserva(reservaId: string): Avaliacao[] {
    return this._avaliacoes().filter((a) => a.reservaId === reservaId);
  }

  enviar(a: Omit<Avaliacao, 'enviadaEm' | 'publicadaEm'>): void {
    const r = this.booking.porId(a.reservaId);
    if (r?.status !== 'concluida') throw new Error('Só é possível avaliar uma locação concluída.');
    if (this.daReserva(a.reservaId).some((x) => x.autorPapel === a.autorPapel)) throw new Error('Esta parte já avaliou a locação.');
    const nova: Avaliacao = { ...a, enviadaEm: this.clock.iso(), publicadaEm: null };
    this._avaliacoes.update((l) => [...l, nova]);
    if (a.autorPapel === 'locatario') this.booking.marcarAvaliada(a.reservaId);
    this.bus.emitir('avaliacao_enviada', { reservation_id: a.reservaId, autor_papel: a.autorPapel, nota: a.nota });
    this.publicarSePar(a.reservaId);
  }

  /** Publica quando as duas partes já avaliaram. */
  private publicarSePar(reservaId: string): void {
    const doPar = this.daReserva(reservaId);
    if (doPar.length >= 2) this.publicar(reservaId);
  }

  private publicar(reservaId: string): void {
    const agora = this.clock.iso();
    let mudou = false;
    this._avaliacoes.update((l) =>
      l.map((a) => {
        if (a.reservaId === reservaId && !a.publicadaEm) {
          mudou = true;
          return { ...a, publicadaEm: agora };
        }
        return a;
      }),
    );
    if (mudou) this.bus.emitir('avaliacoes_publicadas', { reservation_id: reservaId });
  }

  /** Job: prazo vencido → publica só o que existir (nada se ninguém avaliou). */
  publicarVencidas(): void {
    const prazoMs = this.config.get('PRAZO_AVALIACAO_HORAS') * 3600_000;
    const pendentes = new Set(this._avaliacoes().filter((a) => !a.publicadaEm).map((a) => a.reservaId));
    for (const id of pendentes) {
      const r = this.booking.porId(id);
      const base = r?.concluidaEm ?? r?.criadaEm;
      if (base && this.clock.now().getTime() - new Date(base).getTime() >= prazoMs) this.publicar(id);
    }
  }

  // ───────────── reputação (alimenta ranking, aprovação automática e Health Score) ─────────────

  /** Média e quantidade de avaliações PUBLICADAS recebidas por um veículo (feitas por locatários). */
  reputacaoDoVeiculo(veiculoId: string): { media: number | null; total: number } {
    const notas = this.publicadas()
      .filter((a) => a.autorPapel === 'locatario' && this.booking.porId(a.reservaId)?.veiculoId === veiculoId)
      .map((a) => a.nota);
    return { media: notas.length ? notas.reduce((x, y) => x + y, 0) / notas.length : null, total: notas.length };
  }

  /** Média das avaliações publicadas recebidas por um locatário (feitas por proprietários). */
  reputacaoDoLocatario(locatarioId: string): { media: number | null; total: number } {
    const notas = this.publicadas()
      .filter((a) => a.autorPapel === 'proprietario' && a.alvoId === locatarioId)
      .map((a) => a.nota);
    return { media: notas.length ? notas.reduce((x, y) => x + y, 0) / notas.length : null, total: notas.length };
  }

  /** Nota usada no ranking: avaliações publicadas se houver, senão a nota cadastrada do veículo. */
  notaParaRanking(veiculoId: string): number {
    return this.reputacaoDoVeiculo(veiculoId).media ?? this.catalog.porId(veiculoId)?.nota ?? 0;
  }
}
