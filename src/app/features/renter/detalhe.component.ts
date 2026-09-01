import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { TagComponent } from '../../shared/components/tag.component';
import { BackButtonComponent } from '../../shared/components/back-button.component';

@Component({
  selector: 'qp-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, TagComponent, BackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      <qp-back-button />
      <div class="qp-photo" style="height: 340px; margin-bottom: var(--space-4);" [style.background-image]="'url(' + v.foto + ')'"></div>

      <h3 style="margin-bottom: 4px;">{{ v.titulo }}</h3>
      <p class="card-meta" style="margin-bottom: var(--space-4);">★ {{ v.nota }} · {{ v.locacoes }} viagens · {{ v.local }}</p>

      <div class="qp-hairline-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: var(--space-4);">
        <div><strong>Câmbio</strong><br />{{ v.cambio }}</div>
        <div><strong>Combustível</strong><br />{{ v.combustivel }}</div>
        <div><strong>Lugares</strong><br />{{ v.lugares }}</div>
        <div><strong>Consumo</strong><br />{{ v.consumo }}</div>
        <div><strong>Quilometragem</strong><br />{{ v.km | number }} km</div>
        <div><strong>Categoria</strong><br />{{ v.categoria }}</div>
      </div>

      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="qp-row">
          <span class="qp-avatar" style="width: 40px; height: 40px;">{{ v.proprietarioIniciais }}</span>
          <div class="qp-stack" style="gap: 2px;">
            <strong>{{ v.proprietarioNome }}</strong>
            <span class="card-meta">★ {{ v.proprietarioNota }} · responde em até 1h</span>
          </div>
          <qp-tag variant="accent" style="margin-left: auto;">Verificado</qp-tag>
        </div>
      </div>

      <div class="qp-stack" style="margin-bottom: var(--space-6);">
        <h5>Manutenção declarada</h5>
        @for (m of v.manutencao; track m.chave) {
          <div class="qp-row-between" style="font-size: 13px; border-bottom: 1px solid var(--color-divider); padding-bottom: 6px;">
            <span class="text-muted">{{ m.chave }}</span>
            <span>{{ m.valor }}</span>
          </div>
        }
      </div>

      <div class="qp-row-between" style="position: sticky; bottom: 0; background: var(--color-bg); padding: var(--space-3) 0; border-top: 1px solid var(--color-divider);">
        <span style="font-size: 24px; font-family: var(--font-heading); font-weight: 600;">
          {{ pricing.moneyRounded(v.diaria) }}<span style="font-size: 14px; font-weight: 400;">/dia</span>
        </span>
        <a class="btn btn-primary" [routerLink]="['/carros', v.id, 'reservar']">Reservar</a>
      </div>
    } @else {
      <p>Veículo não encontrado.</p>
    }
  `,
})
export class DetalheComponent {
  private route = inject(ActivatedRoute);
  private id = toSignal(this.route.paramMap, { requireSync: true });

  veiculo = computed(() => this.catalog.porId(this.id().get('id') ?? ''));

  constructor(public catalog: CatalogService, public pricing: PricingService) {}
}
