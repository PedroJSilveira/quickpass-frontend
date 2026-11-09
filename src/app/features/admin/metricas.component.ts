import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { mensagemErro } from '../../core/api/api.service';
import { AdminService, Coorte, Experimento, LinhaFunil, Metricas } from '../../core/services/admin.service';
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
    @if (erro()) { <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p> }

    @if (m(); as met) {
      <h6>North Star — locações concluídas por semana</h6>
      @if (met.northStar.length === 0) { <div class="qp-empty">Sem locações concluídas elegíveis ainda.</div> }
      <div class="qp-stack">
        @for (l of met.northStar; track l.semana) {
          <div class="card qp-row-between"><span>{{ l.semana }}</span><span>{{ l.locacoes }} locação(ões) · GMV líquido {{ pricing.money(l.gmvLiquido) }} (secundário)</span></div>
        }
      </div>

      <h6 style="margin-top: var(--space-4);">Guardrails</h6>
      <div class="qp-stack">
        @for (g of guardrails(met); track g.nome) {
          <div class="card qp-row-between">
            <span>{{ g.nome }}</span>
            <span>{{ g.v.numerador }}/{{ g.v.denominador }} = {{ g.v.pct | number: '1.0-1' }}% (meta &lt; {{ g.v.meta }}%) · {{ g.v.violado ? 'VIOLADO' : 'ok' }}</span>
          </div>
        }
      </div>

      <h6 style="margin-top: var(--space-4);">Retorno espontâneo vs. notificado</h6>
      <div class="qp-stack">
        @for (p of retornos(met); track p.nome) {
          <div class="card qp-row-between">
            <span>{{ p.nome }}</span>
            <span>{{ p.r.espontaneas }} espontâneas · {{ p.r.notificadas }} notificadas ({{ p.r.pct | number: '1.0-0' }}% espontâneo)</span>
          </div>
        }
      </div>
    }

    <h6 style="margin-top: var(--space-4);">Funil por canal de origem</h6>
    @if (funil().length === 0) { <div class="qp-empty">Sem cadastros registrados.</div> }
    @for (f of funil(); track f.canal) {
      <div class="card">
        <strong>{{ f.canal }}</strong>
        <div class="card-meta">
          Aquisição {{ f.aquisicao }} · Ativação locatário {{ f.ativacaoLocatario }} · Ativação proprietário {{ f.ativacaoProprietario }}
          (agenda aberta: {{ f.marcoAgendaAberta }}) · Receita {{ pricing.money(f.receita) }} · Recomendações qualificadas {{ f.recomendacao }}
        </div>
      </div>
    }

    <h6 style="margin-top: var(--space-4);">Retenção por coorte</h6>
    @for (c of coortes(); track c.papel + c.item.coorte) {
      <div class="card">
        <strong>{{ c.papel }} — coorte {{ c.item.coorte }} ({{ c.item.tamanho }} usuário(s), {{ c.item.granularidade }})</strong>
        <div class="card-meta">Espontânea: {{ c.item.espontanea.join('% · ') }}% · Notificada: {{ c.item.notificada.join('% · ') }}%</div>
      </div>
    }

    @if (exp(); as e) {
      <h6 style="margin-top: var(--space-4);">Experimento RF09 — isenção da taxa na 1ª locação</h6>
      <div class="card">
        <p class="card-body" style="margin: 0;">{{ e.estado.hipotese }}</p>
        <div class="card-meta">
          {{ e.estado.encerradoPor ? 'Encerrado por ' + e.estado.encerradoPor : 'Em andamento' }} ·
          gasto {{ pricing.money(e.estado.gasto) }} de {{ pricing.money(e.estado.orcamento) }}
        </div>
        @for (l of e.resultado.linhas; track l.grupo) {
          <div class="card-meta">{{ l.grupo }}: {{ l.ativados }}/{{ l.atribuidos }} ativados ({{ l.taxaAtivacao | number: '1.0-0' }}%)</div>
        }
        <div class="card-meta">Diferença de ativação: {{ e.resultado.diferencaPontos | number: '1.0-1' }} p.p.</div>
      </div>
    }
  `,
})
export class MetricasComponent implements OnInit {
  private admin = inject(AdminService);
  pricing = inject(PricingService);
  m = signal<Metricas | null>(null);
  funil = signal<LinhaFunil[]>([]);
  coortes = signal<{ papel: string; item: Coorte }[]>([]);
  exp = signal<Experimento | null>(null);
  erro = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const [m, funil, prop, loc, exp] = await Promise.all([
        this.admin.metricas(),
        this.admin.funil(),
        this.admin.retencao('PROPRIETARIO'),
        this.admin.retencao('LOCATARIO'),
        this.admin.experimento(),
      ]);
      this.m.set(m);
      this.funil.set(funil);
      this.coortes.set([...prop.map((item) => ({ papel: 'proprietario', item })), ...loc.map((item) => ({ papel: 'locatario', item }))]);
      this.exp.set(exp);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }

  guardrails = (m: Metricas) => [
    { nome: 'Risco e qualidade (disputas)', v: m.guardrailDisputa },
    { nome: 'Saúde da oferta (churn silencioso)', v: m.guardrailChurnSilencioso },
  ];
  retornos = (m: Metricas) => [
    { nome: 'proprietario', r: m.retornoEspontaneoProprietario },
    { nome: 'locatario', r: m.retornoEspontaneoLocatario },
  ];
}
