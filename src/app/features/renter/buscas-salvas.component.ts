import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PricingService } from '../../core/services/pricing.service';
import { SavedSearchService } from '../../core/services/saved-search.service';
import { TagComponent } from '../../shared/components/tag.component';

/** Radar de Disponibilidade (RF14): gerenciar buscas salvas — aplicar, pausar e excluir. */
@Component({
  selector: 'qp-buscas-salvas',
  standalone: true,
  imports: [CommonModule, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Locatário</div>
    <h4 class="qp-screen-title">Buscas salvas</h4>

    @if (minhas().length === 0) {
      <div class="qp-empty">Nenhuma busca salva. Salve uma busca para ser avisado quando surgir um carro realmente disponível.</div>
    }
    <div class="qp-stack">
      @for (b of minhas(); track b.id) {
        <div class="card">
          <div class="qp-row-between">
            <span class="card-title">{{ b.regiao }} · {{ b.categoria }}</span>
            <qp-tag [variant]="b.pausada ? 'outline' : b.alertasAtivos ? 'accent' : 'neutral'">
              {{ b.pausada ? 'Pausada' : b.alertasAtivos ? 'Alertas ativos' : 'Sem alertas' }}
            </qp-tag>
          </div>
          <div class="card-meta">
            {{ pricing.formatarPeriodo(b.inicio, b.fim) }} · raio {{ b.raioKm }} km
            @if (b.precoMax) { · até {{ pricing.moneyRounded(b.precoMax) }}/dia }
          </div>
          <div class="card-meta">{{ saved.correspondencias(b).length }} carro(s) disponível(is) agora</div>
          <div class="qp-row" style="margin-top: var(--space-2);">
            <button class="btn btn-secondary" (click)="usar(b.id)">Buscar com estes filtros</button>
            <button class="btn btn-ghost" (click)="saved.pausar(b.id, !b.pausada)">{{ b.pausada ? 'Retomar' : 'Pausar' }}</button>
            <button class="btn btn-ghost" (click)="saved.excluir(b.id)">Excluir</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class BuscasSalvasComponent {
  saved = inject(SavedSearchService);
  pricing = inject(PricingService);
  private auth = inject(AuthService);
  private router = inject(Router);

  minhas = computed(() => this.saved.buscas().filter((b) => b.renterId === this.auth.conta().id));

  usar(id: string): void {
    this.saved.aplicar(id);
    this.router.navigate(['/buscar']);
  }
}
