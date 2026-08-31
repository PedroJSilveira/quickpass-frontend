import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';

@Component({
  selector: 'qp-confirmado',
  standalone: true,
  imports: [CommonModule, RouterLink, BlueprintFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-page">
      <div class="qp-page-inner qp-stack" style="text-align: center; align-items: center;">
        <qp-blueprint>
          <div style="width: 56px; height: 56px; display: grid; place-items: center; font-size: 28px; color: var(--color-accent);">✓</div>
        </qp-blueprint>

        @if (reserva(); as r) {
          @if (veiculo(); as v) {
            <h4>Solicitação enviada ao proprietário</h4>
            <p class="text-muted">
              {{ v.titulo }} · {{ pricing.formatarPeriodo(r.inicio, r.fim) }}. O proprietário tem até 12h para
              aceitar. O valor não foi capturado ainda.
            </p>
          }

          <div class="card" style="width: 100%; max-width: 360px;">
            <div class="qp-row-between"><span class="text-muted">Código da locação</span><span>{{ r.id }}</span></div>
            <div class="qp-row-between"><span class="text-muted">Total</span><span>{{ pricing.money(r.valores.total) }}</span></div>
          </div>

          <div class="qp-row" style="gap: var(--space-2);">
            <a class="btn btn-secondary" routerLink="/locacoes">Ver minhas locações</a>
            <a class="btn btn-ghost" routerLink="/proprietario/solicitacoes">Ver o outro lado</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .qp-page { min-height: 100vh; display: grid; place-items: center; padding: var(--space-6); }
      .qp-page-inner { width: min(420px, 100%); }
    `,
  ],
})
export class ConfirmadoComponent {
  private route = inject(ActivatedRoute);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  veiculo = computed(() => {
    const r = this.reserva();
    return r ? this.catalog.porId(r.veiculoId) : undefined;
  });

  constructor(private booking: BookingService, private catalog: CatalogService, public pricing: PricingService) {}
}
