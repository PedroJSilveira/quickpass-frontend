import { Injectable, Injector, inject, signal } from '@angular/core';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { CatalogService } from './catalog.service';
import { ClockService } from './clock.service';
import { MetricsService } from './metrics.service';

export type GrupoExperimento = 'tratamento' | 'controle';
export type MotivoEncerramento = 'prazo' | 'orcamento' | 'guardrail';

export interface EstadoExperimento {
  id: 'RF09';
  hipotese: string;
  inicio: string;
  fim: string;
  orcamento: number;
  gasto: number;
  encerradoPor: MotivoEncerramento | null;
}

const KEY = 'qp.exp.rf09';

/**
 * RF09 — isenção da taxa de intermediação na PRIMEIRA locação de novos
 * proprietários, tratada como experimento: grupos aleatórios e imutáveis,
 * intervalo, orçamento máximo, indicador de sucesso (ativação) e critérios de
 * parada (prazo, orçamento ou guardrail de disputas violado).
 */
@Injectable({ providedIn: 'root' })
export class ExperimentService {
  private bus = inject(EventBusService);
  private config = inject(AppConfigService);
  private clock = inject(ClockService);
  private auth = inject(AuthService);
  private injector = inject(Injector);

  /** Fonte de aleatoriedade (substituível em testes). */
  sorteio: () => number = Math.random;

  private readonly grupos = new Map<string, { grupo: GrupoExperimento; em: string }>();
  private readonly comDesconto = new Set<string>();
  private readonly _estado = signal<EstadoExperimento>(this.carregar());
  readonly estado = this._estado.asReadonly();

  private carregar(): EstadoExperimento {
    try {
      const salvo = globalThis.localStorage?.getItem(KEY);
      if (salvo) return JSON.parse(salvo);
    } catch {
      /* segue com padrão */
    }
    const inicio = new Date();
    const fim = new Date(inicio.getTime() + this.config.get('EXP_RF09_DURACAO_DIAS') * 86400000);
    return {
      id: 'RF09',
      hipotese: 'A isenção da taxa na 1ª locação aumenta a ativação de novos proprietários (1ª locação concluída em até N dias do cadastro).',
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      orcamento: this.config.get('EXP_RF09_ORCAMENTO'),
      gasto: 0,
      encerradoPor: null,
    };
  }

  private salvar(patch: Partial<EstadoExperimento>): void {
    this._estado.update((e) => ({ ...e, ...patch }));
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(this._estado()));
    } catch {
      /* só em memória */
    }
  }

  /** Verifica os critérios de parada; uma vez encerrado, não reabre. */
  ativo(): boolean {
    const e = this._estado();
    if (e.encerradoPor) return false;
    if (this.clock.passou(e.fim)) return this.encerrar('prazo');
    if (e.gasto >= e.orcamento) return this.encerrar('orcamento');
    const g = this.injector.get(MetricsService).guardrailDisputa();
    if (g.violado) return this.encerrar('guardrail');
    return true;
  }

  private encerrar(motivo: MotivoEncerramento): false {
    this.salvar({ encerradoPor: motivo });
    return false;
  }

  /** Elegível: proprietário novo, KYC aprovado, sem locação concluída anterior. */
  elegivel(ownerId: string, temConcluidaAnterior: boolean): boolean {
    const kycOk = ownerId === this.auth.conta().id ? this.auth.contaVerificada() : true;
    return kycOk && !temConcluidaAnterior;
  }

  /** Sorteio persistido e imutável: o grupo nunca muda depois de atribuído. */
  atribuir(ownerId: string): GrupoExperimento {
    const existente = this.grupos.get(ownerId);
    if (existente) return existente.grupo;
    const grupo: GrupoExperimento = this.sorteio() * 100 < this.config.get('EXP_RF09_PCT_TRATAMENTO') ? 'tratamento' : 'controle';
    this.grupos.set(ownerId, { grupo, em: this.clock.iso() });
    this.bus.emitir('experimento_atribuido', { user_id: ownerId, experimento_id: 'RF09', grupo });
    return grupo;
  }

  grupoDe(ownerId: string): GrupoExperimento | null {
    return this.grupos.get(ownerId)?.grupo ?? null;
  }

  /**
   * Desconto de 100% da taxa na 1ª transação válida do grupo tratamento.
   * Retorna o valor isento (0 se não aplica). Respeita o orçamento máximo.
   */
  avaliarDesconto(ownerId: string, taxa: number, temConcluidaAnterior: boolean, reservaId: string): number {
    if (!this.ativo() || !this.elegivel(ownerId, temConcluidaAnterior)) return 0;
    const grupo = this.atribuir(ownerId);
    if (grupo !== 'tratamento' || this.comDesconto.has(ownerId)) return 0;
    const e = this._estado();
    if (e.gasto + taxa > e.orcamento) {
      this.encerrar('orcamento');
      return 0;
    }
    this.comDesconto.add(ownerId);
    this.salvar({ gasto: e.gasto + taxa });
    this.bus.emitir('desconto_aplicado', { user_id: ownerId, experimento_id: 'RF09', reservation_id: reservaId, valor: taxa });
    if (this._estado().gasto >= e.orcamento) this.encerrar('orcamento');
    return taxa;
  }

  /** Indicador de sucesso: taxa de ativação (1ª locação concluída em até N dias da atribuição) por grupo. */
  resultado() {
    const booking = this.injector.get(BookingService);
    const catalog = this.injector.get(CatalogService);
    const janela = this.config.get('EXP_RF09_ATIVACAO_DIAS') * 86400000;
    const linhas = (['tratamento', 'controle'] as GrupoExperimento[]).map((grupo) => {
      const donos = [...this.grupos.entries()].filter(([, g]) => g.grupo === grupo);
      const ativados = donos.filter(([id, g]) =>
        booking.reservas().some((r) => {
          if (r.status !== 'concluida' || catalog.porId(r.veiculoId)?.proprietarioId !== id) return false;
          const t = new Date(r.concluidaEm ?? r.criadaEm).getTime();
          return t >= new Date(g.em).getTime() && t - new Date(g.em).getTime() <= janela;
        }),
      ).length;
      return { grupo, atribuidos: donos.length, ativados, taxaAtivacao: donos.length ? (ativados / donos.length) * 100 : 0 };
    });
    const [t, c] = linhas;
    return { linhas, diferencaPontos: t.taxaAtivacao - c.taxaAtivacao };
  }
}
