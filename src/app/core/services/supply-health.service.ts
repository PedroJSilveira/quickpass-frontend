import { Injectable, inject, signal } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';
import { diasEntre } from '../../shared/utils/date.util';
import { CatalogService } from './catalog.service';
import { ClockService } from './clock.service';
import { OwnerService } from './owner.service';
import { SchedulerService } from './scheduler.service';

/**
 * Saúde da oferta: acompanha há quantos dias cada veículo ativo está SEM
 * nenhuma data disponível nos próximos HORIZONTE_DISPONIBILIDADE_DIAS (RF07
 * e guardrail 2). Não usa "última edição da agenda" — agenda já aberta nunca
 * conta como desengajada (correção 12).
 */
@Injectable({ providedIn: 'root' })
export class SupplyHealthService {
  private config = inject(AppConfigService);
  private clock = inject(ClockService);
  private catalog = inject(CatalogService);
  private owner = inject(OwnerService);

  /** vehicleId → ISO de quando passou a ficar sem oferta (ou ausente se tem oferta). */
  private readonly _semOfertaDesde = signal<Record<string, string>>({});
  readonly semOfertaDesde = this._semOfertaDesde.asReadonly();

  constructor() {
    inject(SchedulerService).registrar('oferta-varredura', () => this.varrer());
  }

  /** Há alguma data disponível nos próximos N dias? Agenda nunca configurada conta como aberta. */
  temOferta(veiculoId: string): boolean {
    const hoje = this.clock.iso().slice(0, 10);
    const horizonte = this.config.get('HORIZONTE_DISPONIBILIDADE_DIAS');
    const fim = new Date(this.clock.now().getTime() + (horizonte + 1) * 24 * 3600_000).toISOString().slice(0, 10);
    const dias = diasEntre(hoje, fim);
    const d = this.owner.agendaConfigurada(veiculoId);
    if (!d) return true;
    return dias.some((iso) => d.dias[iso] === true) && this.owner.algumDiaLivreDeReserva(veiculoId, dias);
  }

  /** Atualiza o relógio de "sem oferta" de cada veículo ativo. */
  varrer(): void {
    const agora = this.clock.iso();
    this._semOfertaDesde.update((atual) => {
      const novo = { ...atual };
      for (const v of this.catalog.veiculos().filter((x) => x.status === 'Aprovado')) {
        if (this.temOferta(v.id)) delete novo[v.id];
        else novo[v.id] ??= agora;
      }
      return novo;
    });
  }

  /** Dias consecutivos sem oferta (0 se tem oferta). */
  diasSemOferta(veiculoId: string): number {
    const desde = this._semOfertaDesde()[veiculoId];
    if (!desde) return 0;
    return Math.floor((this.clock.now().getTime() - new Date(desde).getTime()) / (24 * 3600_000));
  }

  /** Veículo desengajado: ativo e há ≥ DIAS_SEM_OFERTA dias sem data disponível. */
  desengajado(veiculoId: string): boolean {
    return !this.temOferta(veiculoId) && this.diasSemOferta(veiculoId) >= this.config.get('DIAS_SEM_OFERTA');
  }

  /** Guardrail 2: proprietários com veículo ativo em churn silencioso / proprietários com veículo ativo. */
  guardrailChurn(): { numerador: number; denominador: number; pct: number } {
    const porOwner = new Map<string, boolean>();
    for (const v of this.catalog.veiculos().filter((x) => x.status === 'Aprovado')) {
      const churn = this.desengajado(v.id);
      porOwner.set(v.proprietarioId, (porOwner.get(v.proprietarioId) ?? false) || churn);
    }
    const denominador = porOwner.size;
    const numerador = [...porOwner.values()].filter(Boolean).length;
    return { numerador, denominador, pct: denominador ? (numerador / denominador) * 100 : 0 };
  }
}
