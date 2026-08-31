import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { TagComponent } from '../../shared/components/tag.component';

@Component({
  selector: 'qp-veiculos',
  standalone: true,
  imports: [CommonModule, RouterLink, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Proprietário</div>
    <h4 class="qp-screen-title">Meus veículos</h4>

    <div class="qp-grid-2" style="margin-bottom: var(--space-4);">
      @for (v of meusVeiculos(); track v.id) {
        <div class="card" style="padding: 0; background: transparent;">
          <div class="qp-photo" [style.background-image]="'url(' + v.foto + ')'"></div>
          <div class="qp-stack" style="padding: var(--space-3);">
            <div class="qp-row-between">
              <span class="card-title">{{ v.titulo }}</span>
              <qp-tag [variant]="v.status === 'Aprovado' ? 'accent' : 'neutral'">{{ v.status }}</qp-tag>
            </div>
            <span class="card-meta">{{ pricing.moneyRounded(v.diaria) }}/dia · {{ v.placa }} · {{ v.locacoes }} locações</span>
            <div class="qp-row">
              <a class="btn btn-secondary" [routerLink]="['/proprietario/veiculos', v.id, 'disponibilidade']">Disponibilidade</a>
              <a class="btn btn-ghost" [routerLink]="['/proprietario/veiculos/novo']" [queryParams]="{ editar: v.id }">Editar anúncio</a>
            </div>
          </div>
        </div>
      }
    </div>

    <a class="btn btn-primary" routerLink="/proprietario/veiculos/novo">Cadastrar veículo</a>
  `,
})
export class VeiculosComponent {
  constructor(private auth: AuthService, private catalog: CatalogService, public pricing: PricingService) {}

  meusVeiculos = computed(() => this.catalog.doProprietario(this.auth.conta().id));
}
