import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapSolicitacao } from '../api/mappers';
import { AvailabilityTemplate, Disponibilidade, PreferenciasAnuncio, Solicitacao } from '../models/domain.models';
import { BookingService } from './booking.service';

export interface Previa {
  dias: string[];
  motivos: string[];
}
export interface ResultadoUmToque {
  dias: string[];
  adicionados: string[];
  recompensa: { solicitacoesRecebidas: number; buscasCompativeis: number | null };
}
export interface PainelProprietario {
  veiculosAtivos: number;
  veiculosEmAnalise: number;
  solicitacoesPendentes: number;
  reservasEmAndamento: number;
  ganhosMes: number;
  saldoPrevisto: number;
  reputacao: { media: number | null; total: number };
  healthScore: number;
}

const tplParaApi = (t: AvailabilityTemplate) => ({ tipo: t.tipo.toUpperCase(), semanas: t.semanas });

/** Lado do proprietário: fila de solicitações, agenda, "liberar com um toque" e preferências do anúncio. */
@Injectable({ providedIn: 'root' })
export class OwnerService {
  private api = inject(ApiService);
  private booking = inject(BookingService);

  private readonly _solicitacoes = signal<Solicitacao[]>([]);
  private readonly _template = signal<AvailabilityTemplate | null>(null);
  readonly painel = signal<PainelProprietario | null>(null);

  readonly solicitacoes = this._solicitacoes.asReadonly();
  readonly solicitacoesPendentes = computed(() => this._solicitacoes().filter((s) => s.status === 'pendente'));
  readonly template = this._template.asReadonly();

  async carregarSolicitacoes(): Promise<void> {
    this._solicitacoes.set((await this.api.get<any[]>('/proprietario/solicitacoes')).map(mapSolicitacao));
  }

  async carregarPainel(): Promise<void> {
    this.painel.set(await this.api.get('/proprietario/painel'));
  }

  async aceitar(reservaId: string): Promise<void> {
    await this.booking.aprovar(reservaId);
    await this.carregarSolicitacoes();
  }

  async recusar(reservaId: string): Promise<void> {
    await this.booking.rejeitar(reservaId);
    await this.carregarSolicitacoes();
  }

  // ───────────── agenda ─────────────

  async disponibilidade(veiculoId: string): Promise<Disponibilidade> {
    const d = await this.api.get<{ dias: Record<string, boolean>; aceiteAutomatico: boolean }>(`/proprietario/veiculos/${veiculoId}/disponibilidade`);
    return { veiculoId, dias: d.dias, aceiteAutomatico: d.aceiteAutomatico };
  }

  /** Publicar agenda exige KYC aprovado: o servidor responde 403 se não estiver. */
  async salvarDisponibilidade(d: Disponibilidade, origem: 'calendario' | 'notificacao' = 'calendario'): Promise<Disponibilidade> {
    const r = await this.api.put<{ dias: Record<string, boolean>; aceiteAutomatico: boolean }>(
      `/proprietario/veiculos/${d.veiculoId}/disponibilidade`,
      { dias: d.dias, aceiteAutomatico: d.aceiteAutomatico },
      { origem },
    );
    return { veiculoId: d.veiculoId, dias: r.dias, aceiteAutomatico: r.aceiteAutomatico };
  }

  // ───────────── RF11 — liberar agenda com um toque ─────────────

  async carregarTemplate(): Promise<void> {
    const t = await this.api.get<{ tipo: string; semanas: number } | null>('/proprietario/template-disponibilidade');
    this._template.set(t ? { tipo: t.tipo.toLowerCase() as AvailabilityTemplate['tipo'], semanas: t.semanas } : null);
  }

  async salvarTemplate(t: AvailabilityTemplate): Promise<void> {
    await this.api.put('/proprietario/template-disponibilidade', tplParaApi(t));
    this._template.set(t);
  }

  previaUmToque(veiculoId: string): Promise<Previa> {
    return this.api.get<Previa>(`/proprietario/veiculos/${veiculoId}/um-toque/previa`);
  }

  liberarComUmToque(veiculoId: string, origem: 'um_toque' | 'notificacao' = 'um_toque'): Promise<ResultadoUmToque> {
    return this.api.post<ResultadoUmToque>(`/proprietario/veiculos/${veiculoId}/um-toque`, null, { origem });
  }

  async desfazer(veiculoId: string): Promise<void> {
    await this.api.post(`/proprietario/veiculos/${veiculoId}/um-toque/desfazer`);
  }

  // ───────────── RF17 — preferências ─────────────

  preferencias(veiculoId: string): Promise<PreferenciasAnuncio> {
    return this.api.get<PreferenciasAnuncio>(`/proprietario/veiculos/${veiculoId}/preferencias`);
  }

  async salvarPreferencias(veiculoId: string, p: PreferenciasAnuncio): Promise<void> {
    await this.api.put(`/proprietario/veiculos/${veiculoId}/preferencias`, p);
  }

  sugerirDatas(veiculoId: string, quantidade = 4): Promise<string[]> {
    return this.api.get<string[]>(`/proprietario/veiculos/${veiculoId}/sugestoes-datas`, { quantidade });
  }
}
