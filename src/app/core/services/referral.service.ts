import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';

export interface Referral {
  referrerId: string;
  inviteeId: string;
  codigo: string;
  status: 'cadastrada' | 'qualificada';
  qualificadaEm: string | null;
  bonus: number;
}

/**
 * Indicação (RF10): o link e as regras (autoindicação, qualificação na 1ª locação paga, teto de
 * bônus) vivem no backend. Aqui só o identificador estável do dispositivo (anti-autoindicação)
 * e as chamadas.
 */
@Injectable({ providedIn: 'root' })
export class ReferralService {
  private api = inject(ApiService);

  dispositivoAtual(): string {
    try {
      let id = globalThis.localStorage?.getItem('qp.device');
      if (!id) {
        id = 'd-' + Math.random().toString(36).slice(2, 12);
        globalThis.localStorage?.setItem('qp.device', id);
      }
      return id;
    } catch {
      return 'd-sem-storage';
    }
  }

  async gerarLink(): Promise<{ codigo: string; url: string }> {
    const r = await this.api.get<{ codigo: string; url?: string }>('/indicacoes/link', { dispositivo: this.dispositivoAtual() });
    const origem = globalThis.location?.origin ?? '';
    return { codigo: r.codigo, url: `${origem}/cadastro?ref=${r.codigo}` };
  }

  async minhas(): Promise<Referral[]> {
    const l = await this.api.get<any[]>('/indicacoes');
    return l.map((i) => ({ ...i, status: String(i.status).toLowerCase() }));
  }
}
