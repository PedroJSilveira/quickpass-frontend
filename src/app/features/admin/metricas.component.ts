import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperimentService } from '../../core/services/experiment.service';
import { MetricsService } from '../../core/services/metrics.service';
import { PricingService } from '../../core/services/pricing.service';

/** Dashboards mínimos (§8.3): North Star, guardrails, funil por canal, retenção por coorte, retorno espontâneo e experimento RF09. */
@Component({
  selector: 'qp-metricas',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Growth</div>
    <h4 class="qp-screen-title">Métricas</h4>

    <h6>North Star — locações concluídas por semana</h6>
    @if (m.northStar().length === 0) { <div class="qp-empty">Sem locações concluídas elegíveis ainda.</div> }
    <div class="qp-stack">
      @for (l of m.northStar(); track l.semana) {
        <div class="card qp-row-between"><span>{{ l.semana }}</span><span>{{ l.locacoes }} locação(ões) · GMV líquido {{ pricing.money(l.gmvLiquido) }} (secundário)</span></div>
      }
    </div>

    <h6 style="margin-top: var(--space-4);">Guardrails</h6>
    <div class="qp-stack">
      @for (g of guardrails(); track g.nome) {
        <div class="card qp-row-between">
          <span>{{ g.nome }}</span>
          <span>{{ g.v.numerador }}/{{ g.v.denominador }} = {{ g.v.pct | number: '1.0-1' }}% (meta &lt; {{ g.v.meta }}%) · {{ g.v.violado ? 'VIOLADO' : 'ok' }}</span>
        </div>
      }
    </div>

    <h6 style="margin-top: var(--space-4);">Funil por canal de origem</h6>
    @if (m.funilPorCanal().length === 0) { <div class="qp-empty">Sem cadastros registrados nesta sessão.</div> }
    @for (f of m.funilPorCanal(); track f.canal) {
      <div class="card">
        <strong>{{ f.canal }}</strong>
        <div class="card-meta">
          Aquisição {{ f.aquisicao }} · Ativação locatário {{ f.ativacaoLocatario }} · Ativação proprietário {{ f.ativacaoProprietario }}
          (agenda aberta: {{ f.marcoAgendaAberta }}) · Receita {{ pricing.money(f.receita) }} · Recomendações qualificadas {{ f.recomendacao }}
        </div>
      </div>
    }

    <h6 style="margin-top: var(--space-4);">Retorno espontâneo vs. notificado</h6>
    <div class="qp-stack">
      @for (p of papeis; track p) {
        <div class="card qp-row-between">
          <span>{{ p }}</span>
          <span>{{ r(p).espontaneas }} espontâneas · {{ r(p).notificadas }} notificadas ({{ r(p).pct | number: '1.0-0' }}% espontâneo)</span>
        </div>
      }
    </div>

    <h6 style="margin-top: var(--space-4);">Retenção por coorte</h6>
    @for (p of papeis; track p) {
      @for (c of m.retencaoPorCoorte(p); track c.coorte) {
        <div class="card">
          <strong>{{ p }} — coorte {{ c.coorte }} ({{ c.tamanho }} usuário(s), {{ c.granularidade }})</strong>
          <div class="card-meta">Espontânea: {{ c.espontanea.join('% · ') }}% · Notificada: {{ c.notificada.join('% · ') }}%</div>
        </div>
      }
    }

    <h6 style="margin-top: var(--space-4);">Experimento RF09 — isenção da taxa na 1ª locação</h6>
    <div class="card">
      <p class="card-body" style="margin: 0;">{{ exp.estado().hipotese }}</p>
      <div class="card-meta">
        {{ exp.estado().encerradoPor ? 'Encerrado por ' + exp.estado().encerradoPor : 'Em andamento' }} ·
        gasto {{ pricing.money(exp.estado().gasto) }} de {{ pricing.money(exp.estado().orcamento) }}
      </div>
      @for (l of exp.resultado().linhas; track l.grupo) {
        <div class="card-meta">{{ l.grupo }}: {{ l.ativados }}/{{ l.atribuidos }} ativados ({{ l.taxaAtivacao | number: '1.0-0' }}%)</div>
      }
      <div class="card-meta">Diferença de ativação: {{ exp.resultado().diferencaPontos | number: '1.0-1' }} p.p.</div>
    </div>
  `,
})
export class MetricasComponent {
  m = inject(MetricsService);
  exp = inject(ExperimentService);
  pricing = inject(PricingService);
  papeis = ['proprietario', 'locatario'] as const;

  guardrails = () => [
    { nome: 'Risco e qualidade (disputas)', v: this.m.guardrailDisputa() },
    { nome: 'Saúde da oferta (churn silencioso)', v: this.m.guardrailChurnSilencioso() },
  ];
  r = (p: 'proprietario' | 'locatario') => this.m.retornoEspontaneo(p);
}
