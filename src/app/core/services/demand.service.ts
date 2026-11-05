import { Injectable, inject, signal } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';
import { BookingService } from './booking.service';
import { ClockService } from './clock.service';
import { CatalogService } from './catalog.service';

export interface BuscaRegistrada {
  regiao: string;
  categoria: string;
  inicio: string;
  fim: string;
  em: string;
}

export interface DemandaRegional {
  regiao: string;
  buscas: number;
  solicitacoes: number;
  amostra: number;
  suficiente: boolean;
}

/**
 * Sinais de demanda regionais (RF05/RF11/RF16) a partir de buscas reais e
 * solicitações recebidas. Região = bairro (localização aproximada, RNF02).
 */
@Injectable({ providedIn: 'root' })
export class DemandService {
  private config = inject(AppConfigService);
  private clock = inject(ClockService);
  private booking = inject(BookingService);
  // CatalogService registra buscas aqui; resolvido sob demanda para evitar ciclo.
  private catalog = inject(CatalogService);

  private readonly _buscas = signal<BuscaRegistrada[]>(this.semente());
  readonly buscas = this._buscas.asReadonly();

  registrarBusca(b: Omit<BuscaRegistrada, 'em'>): void {
    this._buscas.update((l) => [...l, { ...b, em: this.clock.iso() }]);
  }

  private janelaInicio(): number {
    return this.clock.now().getTime() - this.config.get('JANELA_DEMANDA_DIAS') * 24 * 3600_000;
  }

  /** Buscas compatíveis (região/categoria) na janela de demanda. */
  buscasCompativeis(regiao: string, categoria?: string): number {
    const ini = this.janelaInicio();
    return this._buscas().filter((b) => b.regiao === regiao && (!categoria || b.categoria === 'Todos' || b.categoria === categoria) && new Date(b.em).getTime() >= ini).length;
  }

  solicitacoesNaRegiao(regiao: string): number {
    const ini = this.janelaInicio();
    return this.booking.reservas().filter((r) => this.catalog.porId(r.veiculoId)?.local === regiao && new Date(r.criadaEm).getTime() >= ini).length;
  }

  demanda(regiao: string): DemandaRegional {
    const buscas = this.buscasCompativeis(regiao);
    const solicitacoes = this.solicitacoesNaRegiao(regiao);
    const amostra = buscas + solicitacoes;
    return { regiao, buscas, solicitacoes, amostra, suficiente: amostra >= this.config.get('AMOSTRA_MINIMA_REGIAO') };
  }

  /** Dados de demonstração: histórico de buscas por região na última semana. */
  private semente(): BuscaRegistrada[] {
    const out: BuscaRegistrada[] = [];
    const volumes: Record<string, number> = { Centro: 24, 'Zona Sul': 12, Aeroporto: 3 };
    const hoje = Date.now();
    for (const [regiao, n] of Object.entries(volumes)) {
      for (let i = 0; i < n; i++) {
        out.push({ regiao, categoria: 'Todos', inicio: '', fim: '', em: new Date(hoje - (i % 6) * 24 * 3600_000 - 3600_000).toISOString() });
      }
    }
    return out;
  }
}
