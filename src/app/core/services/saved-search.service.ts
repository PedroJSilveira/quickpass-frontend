import { Injectable, inject, signal } from '@angular/core';
import { SavedSearch } from '../models/domain.models';
import { EventBusService } from '../analytics/event-bus.service';
import { AuthService } from './auth.service';
import { CatalogService } from './catalog.service';
import { ClockService } from './clock.service';
import { ConsentService } from './consent.service';
import { NotificationService } from './notification.service';
import { SchedulerService } from './scheduler.service';

/**
 * Busca salva e Radar de Disponibilidade (RF14): ciclo de hábito do
 * locatário. Alerta SOMENTE com correspondência real (veículo ativo e agenda
 * livre no período), com consentimento, sem repetir o mesmo veículo.
 */
@Injectable({ providedIn: 'root' })
export class SavedSearchService {
  private bus = inject(EventBusService);
  private auth = inject(AuthService);
  private catalog = inject(CatalogService);
  private clock = inject(ClockService);
  private notifications = inject(NotificationService);
  private consent = inject(ConsentService);
  private seq = 0;

  private readonly _buscas = signal<SavedSearch[]>([]);
  readonly buscas = this._buscas.asReadonly();
  /** Pares busca:veículo já alertados (deduplicação). */
  private readonly alertados = new Set<string>();

  constructor() {
    inject(SchedulerService).registrar('radar', () => this.verificarMatches());
  }

  salvar(params: { regiao: string; raioKm: number; inicio: string; fim: string; categoria: string; precoMax: number | null; alertasAtivos: boolean; canalConsentido?: boolean }): SavedSearch {
    const b: SavedSearch = {
      id: 'SS-' + ++this.seq,
      renterId: this.auth.conta().id,
      regiao: params.regiao,
      raioKm: params.raioKm,
      inicio: params.inicio,
      fim: params.fim,
      categoria: params.categoria,
      precoMax: params.precoMax,
      alertasAtivos: params.alertasAtivos,
      pausada: false,
      criadaEm: this.clock.iso(),
    };
    // Ativar alertas = consentimento explícito de push (marketing), dado pelo usuário no formulário.
    if (params.alertasAtivos && params.canalConsentido) this.consent.definir('push', 'marketing', true);
    this._buscas.update((l) => [...l, b]);
    this.bus.emitir('busca_salva', { saved_search_id: b.id, user_id: b.renterId, categoria: b.categoria, regiao_aproximada: b.regiao });
    return b;
  }

  pausar(id: string, pausada = true): void {
    this._buscas.update((l) => l.map((b) => (b.id === id ? { ...b, pausada } : b)));
  }

  excluir(id: string): void {
    this._buscas.update((l) => l.filter((b) => b.id !== id));
  }

  /** Pré-preenche a próxima busca com os filtros salvos (investimento do locatário). */
  aplicar(id: string): void {
    const b = this._buscas().find((x) => x.id === id);
    if (!b) return;
    this.catalog.atualizarFiltros({ local: b.regiao, inicio: b.inicio, fim: b.fim, categoria: b.categoria, ...(b.precoMax ? { precoMax: b.precoMax } : {}) });
  }

  /** Veículos que atendem à busca agora: ativos, na região/categoria/preço e com agenda livre no período. */
  correspondencias(b: SavedSearch) {
    return this.catalog
      .veiculos()
      .filter((v) => v.status === 'Aprovado' && v.proprietarioId !== b.renterId)
      .filter((v) => v.local === b.regiao || !b.regiao)
      .filter((v) => b.categoria === 'Todos' || v.categoria === b.categoria)
      .filter((v) => b.precoMax === null || v.diaria <= b.precoMax)
      .filter((v) => v.distanciaKm <= b.raioKm)
      .filter((v) => this.catalog.estaLivre(v.id, b.inicio, b.fim));
  }

  /** Job do Radar: envia no máximo um alerta por (busca, veículo). Sem match, nada. */
  verificarMatches(): void {
    for (const b of this._buscas()) {
      if (!b.alertasAtivos || b.pausada) continue;
      for (const v of this.correspondencias(b)) {
        const chave = `${b.id}:${v.id}`;
        if (this.alertados.has(chave)) continue;
        const n = this.notifications.enviar({
          userId: b.renterId,
          tipo: 'radar',
          titulo: 'Carro disponível para sua busca',
          texto: `${v.titulo} em ${v.local} está livre de ${b.inicio} a ${b.fim}.`,
          link: `/carros/${v.id}?origem=radar&busca=${b.id}`,
          motivoDados: { saved_search_id: b.id, vehicle_id: v.id, periodo: [b.inicio, b.fim] },
        });
        if (n) {
          this.alertados.add(chave);
          this.bus.emitir('radar_alerta_enviado', { saved_search_id: b.id, vehicle_id: v.id, notificacao_id: n.id });
        }
      }
    }
  }

  registrarAbertura(notificacaoId: string, buscaId: string, veiculoId: string): void {
    this.notifications.abrir(notificacaoId);
    this.bus.emitir('radar_alerta_aberto', { saved_search_id: buscaId, vehicle_id: veiculoId });
  }
}
