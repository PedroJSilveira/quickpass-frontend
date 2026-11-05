import { Injectable, computed, signal } from '@angular/core';
import { Repasse } from '../models/domain.models';
import { PricingService } from './pricing.service';

/**
 * Repasses ao proprietário. Regra: aparece como "Previsto" quando a reserva
 * entra em `em_andamento` e só é pago após `concluida` + caução resolvida
 * (a orquestração real ficaria num job assíncrono do backend).
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

  /** Repasse existente (Previsto ou Pago) para a reserva? */
  daReserva(reservaId: string): Repasse | undefined {
    return this._repasses().find((r) => r.reservaId === reservaId);
  }

  /**
   * Efetiva o repasse. Só deve ser chamado pelo BookingService quando a reserva
   * está CONCLUIDA e a caução resolvida (RF12).
   */
  pagar(reservaId: string, pagoEm: string): Repasse | undefined {
    const atual = this.daReserva(reservaId);
    if (!atual || atual.status === 'Pago') return atual;
    const pago: Repasse = { ...atual, status: 'Pago', pagoEm };
    this._repasses.update((l) => l.map((r) => (r.reservaId === reservaId ? pago : r)));
    return pago;
  }

  registrarPrevisto(params: { reservaId: string; veiculoId: string; veiculoTitulo: string; periodo: string; bruto: number; desconto?: number }): void {
    if (this.daReserva(params.reservaId)) return;
    // Desconto do experimento RF09 isenta (parte da) taxa de intermediação.
    const taxa = Math.max(0, params.bruto * (this.pricing.taxaPct / 100) - (params.desconto ?? 0));
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
