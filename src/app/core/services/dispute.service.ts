import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapDisputa } from '../api/mappers';
import { Dispute, TipoDecisao } from '../models/domain.models';
import { BookingService } from './booking.service';

/**
 * Disputa de avaria com contraditório (RF04): o proprietário informa (com fotos), o locatário
 * contesta (com evidências) e o admin decide — a caução só é capturada por decisão registrada.
 */
@Injectable({ providedIn: 'root' })
export class DisputeService {
  private api = inject(ApiService);
  private booking = inject(BookingService);

  /** Proprietário informa a avaria (≥ 1 foto, enviada como multipart). */
  async informarAvaria(reservaId: string, d: { descricao: string; valorEstimado: number }, fotos: File[]): Promise<Dispute> {
    const r = mapDisputa(await this.api.upload(`/reservas/${reservaId}/avaria`, { dados: d, arquivos: { fotos } }))!;
    await this.booking.carregar();
    return r;
  }

  async contestar(disputaId: string, texto: string, evidencias: File[]): Promise<Dispute> {
    const r = mapDisputa(await this.api.upload(`/disputas/${disputaId}/contestacao`, { dados: { texto }, arquivos: { evidencias } }))!;
    await this.booking.carregar();
    return r;
  }

  // ───────────── admin ─────────────

  async todas(): Promise<Dispute[]> {
    return (await this.api.get<any[]>('/admin/disputas')).map((d) => mapDisputa(d)!);
  }

  async assumirAnalise(id: string): Promise<void> {
    await this.api.post(`/admin/disputas/${id}/analise`);
  }

  async decidir(id: string, e: { tipo: TipoDecisao; valor: number; justificativa: string }): Promise<void> {
    await this.api.post(`/admin/disputas/${id}/decisao`, { tipo: e.tipo.toUpperCase(), valor: e.valor, justificativa: e.justificativa });
  }
}
