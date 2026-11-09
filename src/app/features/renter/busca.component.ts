import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SavedSearchService } from '../../core/services/saved-search.service';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SliderModule } from 'primeng/slider';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { AuthService } from '../../core/services/auth.service';
import { mensagemErro } from '../../core/api/api.service';
import { urlImagem } from '../../core/api/api.config';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { formatIsoDate, parseIsoDate } from '../../shared/utils/date.util';

@Component({
  selector: 'qp-busca',
  standalone: true,
  imports: [CommonModule, FormsModule, BlueprintFrameComponent, InputTextModule, DatePickerModule, SliderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Locatário</div>
    <h4 class="qp-screen-title">Buscar carros</h4>

    <qp-blueprint>
      <div class="qp-stack" style="padding: var(--space-3);">
        <div class="qp-grid-2">
          <div class="field">
            <label>Onde</label>
            <input pInputText [ngModel]="catalog.filtros().local" (ngModelChange)="catalog.atualizarFiltros({ local: $event })" />
          </div>
          <div></div>
          <div class="field">
            <label>Retirada</label>
            <p-datepicker
              [ngModel]="inicioDate()"
              (ngModelChange)="catalog.atualizarFiltros({ inicio: formatIsoDate($event) })"
              dateFormat="dd/mm/yy"
            />
          </div>
          <div class="field">
            <label>Devolução</label>
            <p-datepicker
              [ngModel]="fimDate()"
              (ngModelChange)="catalog.atualizarFiltros({ fim: formatIsoDate($event) })"
              dateFormat="dd/mm/yy"
            />
          </div>
        </div>

        <div class="field">
          <label>Até {{ pricing.moneyRounded(catalog.filtros().precoMax) }}/dia</label>
          <p-slider
            [ngModel]="catalog.filtros().precoMax"
            (ngModelChange)="catalog.atualizarFiltros({ precoMax: $event })"
            [min]="60" [max]="320" [step]="5"
          />
        </div>
      </div>
    </qp-blueprint>

    <div class="qp-row" style="gap: var(--space-2); flex-wrap: wrap; align-items: center;">
      <label class="qp-row" style="gap: var(--space-2); font-size: 13px;">
        <input type="checkbox" [checked]="alertas()" (change)="alertas.set($any($event.target).checked)" />
        Avisar por push quando surgir carro disponível (opcional)
      </label>
      <button class="btn btn-secondary" (click)="salvarBusca()" [disabled]="!auth.temPapel('locatario')">{{ salva() ? 'Busca salva ✓' : 'Salvar esta busca' }}</button>
      <button class="btn btn-primary" (click)="catalog.buscar()">Buscar</button>
    </div>
    @if (erro()) {
      <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
    }

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

    @if (catalog.buscando()) {
      <div class="qp-empty">Buscando…</div>
    } @else if (catalog.erroBusca()) {
      <div class="qp-empty">{{ catalog.erroBusca() }}</div>
    } @else if (catalog.resultados().length === 0) {
      <div class="qp-empty">Nenhum carro encontrado para esses filtros. Tente aumentar o preço máximo ou trocar a categoria.</div>
    } @else {
      <div class="qp-grid-2">
        @for (v of catalog.resultados(); track v.id) {
          <article class="card qp-car-card" (click)="abrir(v.id)">
            <div class="qp-car-card-photo-wrap">
              <div class="qp-photo qp-car-card-photo" [style.background-image]="'url(' + img(v.foto) + ')'"></div>
            </div>
            <div class="qp-stack qp-car-card-body">
              <div class="qp-row-between">
                <span class="card-title">{{ v.titulo }}</span>
                <span class="qp-car-card-price">{{ pricing.moneyRounded(v.diaria) }}<small>/dia</small></span>
              </div>
              <div class="card-meta">{{ v.cambio }} · {{ v.combustivel }} · {{ v.lugares }} lugares</div>
              <div class="card-meta">★ {{ v.nota }} · {{ v.locacoes }} viagens · {{ v.local }} · {{ v.distanciaKm }} km</div>
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: [
    `
      .qp-chip-ativo { border-color: var(--color-accent); background: var(--color-accent-100); color: var(--color-accent-800); }

      .qp-car-card {
        padding: 0;
        cursor: pointer;
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
      }
      .qp-car-card:hover {
        transform: translateY(-4px);
        border-color: var(--color-accent);
        box-shadow: var(--shadow-md);
      }
      .qp-car-card-photo-wrap { overflow: hidden; }
      .qp-car-card-photo { transition: transform .35s ease; }
      .qp-car-card:hover .qp-car-card-photo { transform: scale(1.06); }
      .qp-car-card-body { padding: var(--space-3); gap: 4px; }
      .qp-car-card-price { font-family: var(--font-heading); font-weight: 600; color: var(--color-accent-700); }
      .qp-car-card-price small { font-weight: 400; color: var(--color-neutral-600); font-size: 11px; }
    `,
  ],
})
export class BuscaComponent implements OnInit {
  private saved = inject(SavedSearchService);
  alertas = signal(false);
  salva = signal(false);
  erro = signal('');
  img = urlImagem;

  constructor(public catalog: CatalogService, public pricing: PricingService, public auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    void this.catalog.pesquisar(false);
  }

  /** Salva localização aproximada (bairro/região), período, categoria e preço — nunca coordenadas exatas. */
  async salvarBusca(): Promise<void> {
    if (!this.auth.logado()) {
      this.router.navigate(['/entrar'], { queryParams: { next: '/buscar' } });
      return;
    }
    const f = this.catalog.filtros();
    this.erro.set('');
    try {
      await this.saved.salvar({
        regiao: f.local,
        raioKm: 10,
        inicio: f.inicio,
        fim: f.fim,
        categoria: f.categoria,
        precoMax: f.precoMax,
        alertasAtivos: this.alertas(),
        canalConsentido: this.alertas(),
      });
      this.salva.set(true);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }

  abrir(id: string): void {
    this.router.navigate(['/carros', id]);
  }

  inicioDate = computed(() => parseIsoDate(this.catalog.filtros().inicio));
  fimDate = computed(() => parseIsoDate(this.catalog.filtros().fim));
  formatIsoDate = formatIsoDate;
}
