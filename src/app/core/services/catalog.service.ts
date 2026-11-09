import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapVeiculo } from '../api/mappers';
import { Protecao, Valores, Veiculo } from '../models/domain.models';

/** Veículo como exposto na busca/público: sem endereço exato nem placa (RNF02). */
export type VeiculoPublico = Veiculo;

export interface FiltrosBusca {
  local: string;
  inicio: string;
  fim: string;
  categoria: string; // 'Todos' | CategoriaVeiculo
  precoMax: number;
}

export interface DadosVeiculo {
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  categoria: string;
  diaria: number;
  local: string;
  enderecoExato: string;
  cambio: string;
  combustivel: string;
  lugares: number;
  km: number;
  consumo?: string;
}

/** Catálogo: busca pública, detalhe e anúncios do proprietário, tudo vindo da API. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private api = inject(ApiService);
  /** Origem da solicitação em andamento (ex.: 'radar' quando veio de um alerta). */
  readonly origemSolicitacao = signal<string>('busca');

  readonly categorias = ['Todos', 'Hatch', 'Sedã', 'SUV', 'Híbrido', 'Elétrico'];

  private readonly _cache = signal<Record<string, Veiculo>>({});
  private readonly _meus = signal<Veiculo[]>([]);
  private readonly _resultados = signal<Veiculo[]>([]);
  readonly buscando = signal(false);
  readonly erroBusca = signal('');
  readonly resultados = this._resultados.asReadonly();
  readonly meusVeiculos = this._meus.asReadonly();
  readonly veiculos = computed(() => Object.values(this._cache()));

  readonly filtros = signal<FiltrosBusca>({
    local: 'São Paulo, SP',
    inicio: this.hoje(7),
    fim: this.hoje(10),
    categoria: 'Todos',
    precoMax: 320,
  });

  private timer: ReturnType<typeof setTimeout> | null = null;

  private hoje(offsetDias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDias);
    return d.toISOString().slice(0, 10);
  }

  private guardar(v: Veiculo): Veiculo {
    this._cache.update((c) => ({ ...c, [v.id]: { ...c[v.id], ...v } }));
    return v;
  }

  /** Atualiza os filtros e refaz a busca (sem contar como busca de demanda) após uma pausa na digitação. */
  atualizarFiltros(patch: Partial<FiltrosBusca>): void {
    this.filtros.update((f) => ({ ...f, ...patch }));
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.pesquisar(false), 300);
  }

  /** Submissão explícita da busca: registra `busca_realizada` e a demanda regional no servidor. */
  async buscar(patch: Partial<FiltrosBusca> = {}): Promise<void> {
    this.filtros.update((f) => ({ ...f, ...patch }));
    await this.pesquisar(true);
  }

  async pesquisar(registrar: boolean): Promise<void> {
    const f = this.filtros();
    this.buscando.set(true);
    this.erroBusca.set('');
    try {
      const l = await this.api.get<any[]>('/veiculos', { local: f.local, inicio: f.inicio, fim: f.fim, categoria: f.categoria, precoMax: f.precoMax, registrar });
      const vs = l.map(mapVeiculo);
      vs.forEach((v) => this.guardar(v));
      this._resultados.set(vs);
    } catch (e) {
      this._resultados.set([]);
      this.erroBusca.set((e as any)?.error?.mensagem ?? 'Não foi possível buscar agora.');
    } finally {
      this.buscando.set(false);
    }
  }

  porId(id: string): Veiculo | undefined {
    return this._cache()[id];
  }

  publicoPorId(id: string): Veiculo | undefined {
    return this.porId(id);
  }

  /** Carrega um veículo do servidor (visão pública; 404 se ainda não aprovado e não for seu). */
  async carregar(id: string): Promise<Veiculo | undefined> {
    try {
      return this.guardar(mapVeiculo(await this.api.get(`/veiculos/${id}`)));
    } catch {
      return undefined;
    }
  }

  async cotar(id: string, inicio: string, fim: string, protecao: Protecao): Promise<Valores> {
    return this.api.get<Valores>(`/veiculos/${id}/cotacao`, { inicio, fim, protecao: protecao.toUpperCase() });
  }

  // ───────────── proprietário ─────────────

  async carregarMeus(): Promise<void> {
    const l = (await this.api.get<any[]>('/proprietario/veiculos')).map(mapVeiculo);
    l.forEach((v) => this.guardar(v));
    this._meus.set(l);
  }

  doProprietario(id: string): Veiculo[] {
    return this._meus().filter((v) => v.proprietarioId === id);
  }

  async cadastrar(dados: DadosVeiculo, fotos: File[], documentos: File[]): Promise<Veiculo> {
    const v = mapVeiculo(await this.api.upload('/proprietario/veiculos', { dados, arquivos: { fotos, documentos } }));
    this.guardar(v);
    this._meus.update((l) => [...l, v]);
    return v;
  }

  async atualizar(id: string, patch: { diaria?: number; enderecoExato?: string; km?: number }): Promise<void> {
    const v = mapVeiculo(await this.api.put(`/proprietario/veiculos/${id}`, patch));
    this.guardar(v);
    this._meus.update((l) => l.map((x) => (x.id === id ? { ...x, ...v } : x)));
  }

  async adicionarFotos(id: string, fotos: File[]): Promise<void> {
    const v = mapVeiculo(await this.api.upload(`/proprietario/veiculos/${id}/fotos`, { arquivos: { fotos } }));
    this.guardar(v);
    this._meus.update((l) => l.map((x) => (x.id === id ? { ...x, ...v } : x)));
  }
}
