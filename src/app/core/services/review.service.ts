import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapAvaliacao } from '../api/mappers';
import { Avaliacao } from '../models/domain.models';
import { BookingService } from './booking.service';

/** Avaliação bilateral (RF06): publicação por par/prazo é regra do servidor. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private api = inject(ApiService);
  private booking = inject(BookingService);

  async enviar(reservaId: string, d: { nota: number; texto: string; selos: string[] }): Promise<void> {
    await this.api.post(`/reservas/${reservaId}/avaliacoes`, d);
    await this.booking.carregar();
  }

  async doVeiculo(veiculoId: string): Promise<{ media: number | null; total: number; avaliacoes: Avaliacao[] }> {
    const r = await this.api.get<any>(`/veiculos/${veiculoId}/avaliacoes`);
    return { media: r.reputacao.media, total: r.reputacao.total, avaliacoes: (r.avaliacoes as any[]).map(mapAvaliacao) };
  }
}
