import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';

@Component({
  selector: 'qp-busca',
  standalone: true,
  imports: [CommonModule, FormsModule, BlueprintFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Locatário</div>
    <h4 class="qp-screen-title">Buscar carros</h4>

    <qp-blueprint>
      <div class="qp-stack" style="padding: var(--space-3);">
        <div class="qp-grid-2">
          <div class="field">
            <label>Onde</label>
            <input class="input" [ngModel]="catalog.filtros().local" (ngModelChange)="catalog.atualizarFiltros({ local: $event })" />
          </div>
          <div></div>
          <div class="field">
            <label>Retirada</label>
            <input class="input" type="date" [ngModel]="catalog.filtros().inicio" (ngModelChange)="catalog.atualizarFiltros({ inicio: $event })" />
          </div>
          <div class="field">
            <label>Devolução</label>
            <input class="input" type="date" [ngModel]="catalog.filtros().fim" (ngModelChange)="catalog.atualizarFiltros({ fim: $event })" />
          </div>
        </div>

        <div class="field">
          <label>Até {{ pricing.moneyRounded(catalog.filtros().precoMax) }}/dia</label>
          <input
            type="range" min="60" max="320" step="5"
            [ngModel]="catalog.filtros().precoMax"
            (ngModelChange)="catalog.atualizarFiltros({ precoMax: $event })"
          />
        </div>
      </div>
    </qp-blueprint>

    <div class="qp-row" style="margin: var(--space-4) 0; flex-wrap: wrap;">
      @for (cat of catalog.categorias; track cat) {
        <button
          class="btn btn-secondary"
          [class.qp-chip-ativo]="catalog.filtros().categoria === cat"
          (click)="catalog.atualizarFiltros({ categoria: cat })"
        >
          {{ cat }}
        </button>
      }
    </div>

    <p class="text-muted" style="font-size: 13px;">
      {{ catalog.resultados().length }} carros disponíveis · {{ pricing.formatarPeriodo(catalog.filtros().inicio, catalog.filtros().fim) }}
    </p>

    @if (catalog.resultados().length === 0) {
      <div class="qp-empty">Nenhum carro encontrado para esses filtros. Tente aumentar o preço máximo ou trocar a categoria.</div>
    } @else {
      <div class="qp-grid-2">
        @for (v of catalog.resultados(); track v.id) {
          <div class="card" style="cursor: pointer; padding: 0; border: 1px solid var(--color-divider); background: transparent;" (click)="abrir(v.id)">
            <div class="qp-photo" [style.background-image]="'url(' + v.foto + ')'"></div>
            <div class="qp-stack" style="padding: var(--space-3); gap: 4px;">
              <div class="qp-row-between">
                <span class="card-title">{{ v.titulo }}</span>
                <span style="font-weight: 600;">{{ pricing.moneyRounded(v.diaria) }}/dia</span>
              </div>
              <div class="card-meta">{{ v.cambio }} · {{ v.combustivel }} · {{ v.lugares }} lugares</div>
              <div class="card-meta">★ {{ v.nota }} · {{ v.locacoes }} viagens · {{ v.local }} · {{ v.distanciaKm }} km</div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .qp-chip-ativo { border-color: var(--color-accent); background: var(--color-accent-100); color: var(--color-accent-800); }
    `,
  ],
})
export class BuscaComponent {
  constructor(public catalog: CatalogService, public pricing: PricingService, private router: Router) {}

  abrir(id: string): void {
    this.router.navigate(['/carros', id]);
  }
}
