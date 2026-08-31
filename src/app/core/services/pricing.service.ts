import { Injectable } from '@angular/core';
import { Protecao, Valores } from '../models/domain.models';

/**
 * PricingService é a fonte única da verdade para todos os cálculos
 * financeiros da plataforma (ver README, seção "Regras de negócio").
 *
 * Parâmetros hoje fixos como constantes; em produção devem vir de uma
 * configuração por whitelabel/tenant (mesmo espírito do parâmetro `props`
 * do protótipo original).
 */
@Injectable({ providedIn: 'root' })
export class PricingService {
  /** Percentual retido pela plataforma sobre o subtotal da locação. */
  readonly taxaPct = 15;

  /** Caução pré-autorizada no cartão (não é receita, liberada no check-out). */
  readonly caucao = 500;

  /** Preço da proteção básica, por dia. */
  readonly precoProtecaoBasica = 25;

  /** Preço da proteção completa, por dia. */
  readonly precoProtecaoCompleta = 45;

  /** Franquia da proteção básica, informativo para a UI. */
  readonly franquiaBasica = 3000;

  /** Franquia da proteção completa, informativo para a UI. */
  readonly franquiaCompleta = 800;

  precoProtecao(protecao: Protecao): number {
    return protecao === 'basica' ? this.precoProtecaoBasica : this.precoProtecaoCompleta;
  }

  /** Número de diárias entre duas datas ISO, sempre >= 1. */
  dias(inicio: string, fim: string): number {
    const d = Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000);
    return d > 0 ? d : 1;
  }

  /**
   * Calcula o detalhamento de valores de uma locação.
   *
   * - A taxa incide somente sobre o subtotal da locação (não sobre a proteção).
   * - A proteção é receita da plataforma (cobre a apólice contratada).
   * - A caução é pré-autorização no cartão: não entra no total nem em receita.
   */
  calcular(diaria: number, protecao: Protecao, inicio: string, fim: string): Valores {
    const dias = this.dias(inicio, fim);
    const subtotal = diaria * dias;
    const protecaoValor = this.precoProtecao(protecao) * dias;
    const taxa = subtotal * (this.taxaPct / 100);
    const total = subtotal + protecaoValor; // cobrado do locatário
    const repasse = subtotal - taxa; // pago ao proprietário

    return {
      diaria,
      dias,
      subtotal,
      protecao: protecaoValor,
      taxa,
      total,
      repasse,
      caucao: this.caucao,
    };
  }

  /** Formata em BRL com 2 casas decimais (pt-BR). */
  money(valor: number): string {
    return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
