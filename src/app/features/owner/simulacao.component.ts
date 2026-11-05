import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { RevenueSimulationService } from '../../core/services/revenue-simulation.service';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';

/** Simulação de Receita Potencial (RF05): projeção com premissas visíveis, separada de solicitações, locações e valor recebido. */
@Component({
  selector: 'qp-simulacao',
  standalone: true,
  imports: [CommonModule, BackButtonComponent, BlueprintFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sim(); as s) {
      <qp-back-button />
      <div class="qp-screen-kicker">Simulação</div>
      <h4 class="qp-screen-title">Receita potencial — {{ veiculo()?.titulo }}</h4>

      <qp-blueprint>
        <div class="qp-stack" style="padding: var(--space-3);">
          <div class="card-title">Projeção (estimativa)</div>
          @if (s.projecao !== null) {
            <div style="font-size: 24px; font-family: var(--font-heading); font-weight: 600;">{{ pricing.moneyRounded(s.projecao) }}</div>
            <p class="text-muted" style="font-size: 12px; margin: 0;">Estimativa baseada nas premissas abaixo; o resultado real pode variar.</p>
          } @else {
            <div style="font-size: 20px;">Dados insuficientes</div>
            <p class="text-muted" style="font-size: 12px; margin: 0;">
              A região {{ s.regiao }} ainda não tem amostra mínima ({{ s.premissas.amostra }} registros) para estimar.
            </p>
          }
          <div class="hr"></div>
          <div class="card-title">Premissas</div>
          <div class="text-muted" style="font-size: 13px;">
            receita potencial = preço médio da diária na região × dias indisponíveis × taxa de ocupação observada na região
          </div>
          <div class="qp-row-between"><span>Preço médio da diária ({{ s.regiao }})</span><span>{{ pricing.money(s.premissas.precoMedioDiaria) }}</span></div>
          <div class="qp-row-between"><span>Dias indisponíveis (próximos {{ s.premissas.janelaDias }} dias)</span><span>{{ s.premissas.diasIndisponiveis }}</span></div>
          <div class="qp-row-between"><span>Taxa de ocupação observada</span><span>{{ s.premissas.taxaOcupacao * 100 | number: '1.0-1' }}%</span></div>
          <div class="qp-row-between"><span>Amostra regional (buscas + solicitações)</span><span>{{ s.premissas.amostra }}</span></div>
        </div>
      </qp-blueprint>

      <div class="qp-grid-2x2" style="margin-top: var(--space-4);">
        <div class="card"><span class="card-kicker">Solicitações recebidas</span><span class="card-title">{{ s.solicitacoesRecebidas }}</span></div>
        <div class="card"><span class="card-kicker">Locações concluídas</span><span class="card-title">{{ s.locacoesConcluidas }}</span></div>
        <div class="card"><span class="card-kicker">Valor efetivamente recebido</span><span class="card-title">{{ pricing.money(s.valorRecebido) }}</span></div>
      </div>
    } @else {
      <p>Veículo não encontrado.</p>
    }
  `,
})
export class SimulacaoComponent {
  private route = inject(ActivatedRoute);
  private catalog = inject(CatalogService);
  private service = inject(RevenueSimulationService);
  pricing = inject(PricingService);
  private id = toSignal(this.route.paramMap, { requireSync: true });

  veiculo = computed(() => this.catalog.porId(this.id().get('id') ?? ''));
  sim = computed(() => this.service.simular(this.id().get('id') ?? ''));
}
