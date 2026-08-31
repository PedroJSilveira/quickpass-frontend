import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { Protecao } from '../../core/models/domain.models';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';

@Component({
  selector: 'qp-reserva',
  standalone: true,
  imports: [CommonModule, FormsModule, BlueprintFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      <div class="qp-screen-kicker">Reserva</div>
      <h4 class="qp-screen-title">Período e proteção</h4>

      <div class="qp-grid-2" style="margin-bottom: var(--space-4);">
        <div class="field">
          <label>Retirada</label>
          <input class="input" type="date" [ngModel]="inicio()" (ngModelChange)="inicio.set($event)" name="inicio" />
        </div>
        <div class="field">
          <label>Devolução</label>
          <input class="input" type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event)" name="fim" />
        </div>
      </div>

      <div class="qp-stack" style="margin-bottom: var(--space-4);">
        <label class="qp-radio-card" [class.qp-radio-sel]="protecao() === 'basica'" (click)="protecao.set('basica')">
          <div class="qp-row-between">
            <strong>Proteção básica</strong>
            <span>{{ pricing.money(pricing.precoProtecaoBasica) }}/dia</span>
          </div>
          <span class="text-muted" style="font-size: 13px;">Franquia de {{ pricing.money(pricing.franquiaBasica) }} em caso de sinistro.</span>
        </label>
        <label class="qp-radio-card" [class.qp-radio-sel]="protecao() === 'completa'" (click)="protecao.set('completa')">
          <div class="qp-row-between">
            <strong>Proteção completa</strong>
            <span>{{ pricing.money(pricing.precoProtecaoCompleta) }}/dia</span>
          </div>
          <span class="text-muted" style="font-size: 13px;">Franquia reduzida de {{ pricing.money(pricing.franquiaCompleta) }}.</span>
        </label>
      </div>

      <qp-blueprint>
        <div class="qp-stack" style="padding: var(--space-3);">
          <div class="qp-row-between"><span>{{ pricing.money(valores().diaria) }} × {{ valores().dias }} dias</span><span>{{ pricing.money(valores().subtotal) }}</span></div>
          <div class="qp-row-between"><span>Proteção</span><span>{{ pricing.money(valores().protecao) }}</span></div>
          <div class="qp-row-between text-muted" style="font-size: 12px;"><span>Taxa da plataforma (já incluída)</span><span>{{ pricing.money(valores().taxa) }}</span></div>
          <div class="qp-row-between text-muted" style="font-size: 12px;"><span>Caução (pré-autorizada, devolvida)</span><span>{{ pricing.money(valores().caucao) }}</span></div>
          <div class="hr"></div>
          <div class="qp-row-between" style="font-size: 22px; font-family: var(--font-heading); font-weight: 600;">
            <span>Total</span><span>{{ pricing.money(valores().total) }}</span>
          </div>
          <p class="text-muted" style="font-size: 11px; margin: 0;">
            A caução não entra no total nem é receita da plataforma — é liberada no check-out.
          </p>
        </div>
      </qp-blueprint>

      <button class="btn btn-primary btn-block" (click)="irParaPagamento(v.id)">Ir para pagamento</button>
    }
  `,
  styles: [
    `
      .qp-radio-card { display: block; padding: var(--space-3); border: 1px solid var(--color-divider); cursor: pointer; }
      .qp-radio-sel { border-color: var(--color-accent); background: var(--color-accent-100); }
    `,
  ],
})
export class ReservaComponent {
  private catalog = inject(CatalogService);
  public pricing = inject(PricingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private id = toSignal(this.route.paramMap, { requireSync: true });

  veiculo = computed(() => this.catalog.porId(this.id().get('id') ?? ''));

  inicio = signal(this.catalog.filtros().inicio);
  fim = signal(this.catalog.filtros().fim);
  protecao = signal<Protecao>('completa');

  valores = computed(() => {
    const v = this.veiculo();
    if (!v) return this.pricing.calcular(0, 'completa', this.inicio(), this.fim());
    return this.pricing.calcular(v.diaria, this.protecao(), this.inicio(), this.fim());
  });

  irParaPagamento(veiculoId: string): void {
    this.router.navigate(['/carros', veiculoId, 'pagamento'], {
      queryParams: { inicio: this.inicio(), fim: this.fim(), protecao: this.protecao() },
    });
  }
}
