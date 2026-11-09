import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PayoutService } from '../../core/services/payout.service';
import { PricingService } from '../../core/services/pricing.service';
import { TagComponent } from '../../shared/components/tag.component';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';

@Component({
  selector: 'qp-ganhos',
  standalone: true,
  imports: [CommonModule, TagComponent, BlueprintFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Proprietário</div>
    <h4 class="qp-screen-title">Ganhos e repasses</h4>

    <qp-blueprint>
      <div class="qp-stack" style="padding: var(--space-3);">
        <span class="card-kicker">Saldo a receber</span>
        <span style="font-size: 36px; font-family: var(--font-heading); font-weight: 600;">
          {{ pricing.moneyRounded(payout.saldoPrevisto()) }}
        </span>
        <span class="text-muted" style="font-size: 12px;">Repasse em D+2 após a devolução, na conta bancária cadastrada.</span>
      </div>
    </qp-blueprint>

    <div class="qp-stack" style="margin: var(--space-4) 0;">
      <h5>Como a locação se divide</h5>
      <div class="qp-row" style="height: 28px;">
        <div [style.width.%]="100 - pricing.taxaPct" style="background: var(--color-accent); color: var(--color-bg); display: flex; align-items: center; padding-left: 8px; font-size: 12px;">
          {{ 100 - pricing.taxaPct }}% proprietário
        </div>
        <div [style.width.%]="pricing.taxaPct" style="background: var(--color-bg); border: 1px solid var(--color-divider); display: flex; align-items: center; justify-content: center; font-size: 12px;">
          {{ pricing.taxaPct }}% taxa
        </div>
      </div>
      <p class="text-muted" style="font-size: 12px;">
        A taxa cobre processamento de pagamento, suporte, seguro da plataforma e verificação de locatários.
      </p>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Locação</th>
          <th>Bruto</th>
          <th>Líquido</th>
        </tr>
      </thead>
      <tbody>
        @for (r of payout.repasses(); track r.reservaId) {
          <tr>
            <td>{{ r.veiculoTitulo }}<br /><span class="text-muted" style="font-size: 12px;">{{ r.periodo }}</span></td>
            <td>{{ pricing.moneyRounded(r.bruto) }}</td>
            <td>
              {{ pricing.moneyRounded(r.liquido) }}
              <qp-tag [variant]="r.status === 'Pago' ? 'neutral' : 'accent'" style="margin-left: 6px;">{{ r.status }}</qp-tag>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class GanhosComponent implements OnInit {
  constructor(public payout: PayoutService, public pricing: PricingService) {}

  ngOnInit(): void {
    void this.payout.carregar();
  }
}
