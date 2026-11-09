import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapNotificacao } from '../api/mappers';
import { Notificacao } from '../models/domain.models';

/** Caixa de notificações (RNF03). Abrir uma notificação registra `notificacao_aberta` no servidor (RF15). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);
  private readonly _notificacoes = signal<Notificacao[]>([]);
  readonly notificacoes = this._notificacoes.asReadonly();
  readonly naoLidas = computed(() => this._notificacoes().filter((n) => !n.abertaEm).length);

  async carregar(): Promise<void> {
    this._notificacoes.set((await this.api.get<any[]>('/notificacoes')).map(mapNotificacao).reverse());
  }

  /** Marca como aberta; alertas do Radar também registram `radar_alerta_aberto` (busca + veículo). */
  async abrir(n: Notificacao): Promise<void> {
    const radar = n.tipo === 'radar' ? { busca: String(n.motivoDados['saved_search_id']), veiculo: String(n.motivoDados['vehicle_id']) } : undefined;
    const aberta = mapNotificacao(await this.api.post(`/notificacoes/${n.id}/abrir`, null, radar));
    this._notificacoes.update((l) => l.map((x) => (x.id === n.id ? aberta : x)));
  }
}
