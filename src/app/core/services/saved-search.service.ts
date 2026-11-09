import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapBusca, mapVeiculo } from '../api/mappers';
import { SavedSearch, Veiculo } from '../models/domain.models';
import { CatalogService } from './catalog.service';

/** Buscas salvas e Radar de Disponibilidade (RF14): o servidor faz o casamento e envia os alertas. */
@Injectable({ providedIn: 'root' })
export class SavedSearchService {
  private api = inject(ApiService);
  private catalog = inject(CatalogService);
  private readonly _buscas = signal<SavedSearch[]>([]);
  private readonly _matches = signal<Record<string, Veiculo[]>>({});
  readonly buscas = this._buscas.asReadonly();

  async carregar(): Promise<void> {
    const l = (await this.api.get<any[]>('/buscas-salvas')).map(mapBusca);
    this._buscas.set(l);
    const pares = await Promise.all(l.map(async (b) => [b.id, (await this.api.get<any[]>(`/buscas-salvas/${b.id}/correspondencias`)).map(mapVeiculo)] as const));
    this._matches.set(Object.fromEntries(pares));
  }

  correspondencias(b: SavedSearch): Veiculo[] {
    return this._matches()[b.id] ?? [];
  }

  /** Salva região aproximada, período, categoria e preço (nunca coordenadas). Alertas = consentimento de push. */
  async salvar(p: { regiao: string; raioKm: number; inicio: string; fim: string; categoria: string; precoMax: number | null; alertasAtivos: boolean; canalConsentido: boolean }): Promise<SavedSearch> {
    const b = mapBusca(await this.api.post('/buscas-salvas', p));
    this._buscas.update((l) => [...l, b]);
    return b;
  }

  async pausar(id: string, pausada = true): Promise<void> {
    const b = mapBusca(await this.api.patch(`/buscas-salvas/${id}/pausa`, null, { pausada }));
    this._buscas.update((l) => l.map((x) => (x.id === id ? b : x)));
  }

  async excluir(id: string): Promise<void> {
    await this.api.delete(`/buscas-salvas/${id}`);
    this._buscas.update((l) => l.filter((x) => x.id !== id));
  }

  /** Pré-preenche a próxima busca com os filtros salvos. */
  aplicar(id: string): void {
    const b = this._buscas().find((x) => x.id === id);
    if (!b) return;
    this.catalog.atualizarFiltros({ local: b.regiao, inicio: b.inicio, fim: b.fim, categoria: b.categoria, ...(b.precoMax ? { precoMax: b.precoMax } : {}) });
  }
}
