import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';

/**
 * Apresentação de valores e preços tabelados. O CÁLCULO da locação (diárias, proteção, taxa,
 * total, caução) é do backend (`GET /api/veiculos/{id}/cotacao`); aqui só formatação e os preços
 * que a interface exibe, vindos de `AppConfigService`.
 */
@Injectable({ providedIn: 'root' })
export class PricingService {
  private config = inject(AppConfigService);

  get taxaPct(): number { return this.config.precos().taxaPct; }
  get caucao(): number { return this.config.precos().caucao; }
  get precoProtecaoBasica(): number { return this.config.precos().protecaoBasicaDia; }
  get precoProtecaoCompleta(): number { return this.config.precos().protecaoCompletaDia; }
  get franquiaBasica(): number { return this.config.precos().franquiaBasica; }
  get franquiaCompleta(): number { return this.config.precos().franquiaCompleta; }

  /** Número de diárias entre duas datas ISO, sempre >= 1. */
  dias(inicio: string, fim: string): number {
    const d = Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000);
    return d > 0 ? d : 1;
  }

  /** Formata em BRL com 2 casas decimais (pt-BR). */
  money(valor: number): string {
    return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Formata valores agregados (ganhos, projeções) arredondados, sem centavos. */
  moneyRounded(valor: number): string {
    return 'R$ ' + Math.round(Number(valor || 0)).toLocaleString('pt-BR');
  }

  /** Formata uma data ISO como "DD mmm" (ex.: "04 set"). */
  formatarData(iso: string): string {
    if (!iso) return '';
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const [, mes, dia] = iso.split('-');
    return `${dia} ${meses[Number(mes) - 1]}`;
  }

  formatarPeriodo(inicio: string, fim: string): string {
    const d = this.dias(inicio, fim);
    return `${this.formatarData(inicio)} – ${this.formatarData(fim)} · ${d} ${d > 1 ? 'dias' : 'dia'}`;
  }
}
