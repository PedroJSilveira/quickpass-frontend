import { Injectable, computed, signal } from '@angular/core';
import { Repasse } from '../models/domain.models';
import { PricingService } from './pricing.service';

/**
 * Repasses ao proprietário. Regra: repasse é liberado (visível como
 * "Previsto") quando a reserva entra em `em_andamento`, e pago em D+2 após
 * o `concluida` (aqui simplificado — a orquestração real ficaria num job
 * assíncrono disparado por evento de outbox).
 */
@Injectable({ providedIn: 'root' })
export class PayoutService {
  constructor(private pricing: PricingService) {}

  private readonly _repasses = signal<Repasse[]>([
    { reservaId: 'QP-2200', veiculoId: '1', veiculoTitulo: 'Honda Civic 2021', periodo: '14 – 17 ago', bruto: 540, taxa: 81, liquido: 459, status: 'Pago', pagoEm: '2026-08-19' },
    { reservaId: 'QP-2188', veiculoId: '1', veiculoTitulo: 'Honda Civic 2021', periodo: '02 – 04 ago', bruto: 360, taxa: 54, liquido: 306, status: 'Pago', pagoEm: '2026-08-06' },
    { reservaId: 'QP-2151', veiculoId: '1', veiculoTitulo: 'Honda Civic 2021', periodo: '26 – 27 jul', bruto: 180, taxa: 27, liquido: 153, status: 'Pago', pagoEm: '2026-07-29' },
    { reservaId: 'QP-2130', veiculoId: '2', veiculoTitulo: 'Fiat Mobi 2019', periodo: '18 – 21 jul', bruto: 210, taxa: 31.5, liquido: 178.5, status: 'Pago', pagoEm: '2026-07-23' },
  ]);

  readonly repasses = this._repasses.asReadonly();

  readonly liquidoMesAtual = computed(() =>
    this._repasses()
      .filter((r) => r.status === 'Pago')
      .slice(0, 3)
      .reduce((total, r) => total + r.liquido, 0),
  );

  readonly saldoPrevisto = computed(() =>
    this._repasses()
      .filter((r) => r.status === 'Previsto')
      .reduce((total, r) => total + r.liquido, 0),
  );

  registrarPrevisto(params: { reservaId: string; veiculoId: string; veiculoTitulo: string; periodo: string; bruto: number }): void {
    const taxa = params.bruto * (this.pricing.taxaPct / 100);
    const repasse: Repasse = {
      reservaId: params.reservaId,
      veiculoId: params.veiculoId,
      veiculoTitulo: params.veiculoTitulo,
      periodo: params.periodo,
      bruto: params.bruto,
      taxa,
      liquido: params.bruto - taxa,
      status: 'Previsto',
      pagoEm: null,
    };
    this._repasses.update((lista) => [repasse, ...lista]);
  }
}
