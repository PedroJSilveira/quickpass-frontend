import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Notificacao } from '../../core/models/domain.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SavedSearchService } from '../../core/services/saved-search.service';

/** Caixa de notificações. Abrir uma notificação registra `notificacao_aberta` (base da atribuição de retorno — RF15). */
@Component({
  selector: 'qp-notificacoes',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Conta</div>
    <h4 class="qp-screen-title">Notificações</h4>
    @if (minhas().length === 0) {
      <div class="qp-empty">
        Nenhuma notificação. Só enviamos avisos de engajamento se você autorizar o canal e houver um dado real que os justifique.
      </div>
    }
    <div class="qp-stack">
      @for (n of minhas(); track n.id) {
        <div class="card" style="cursor: pointer;" (click)="abrir(n)">
          <div class="qp-row-between">
            <span class="card-title">{{ n.titulo }}</span>
            <span class="card-meta">{{ n.abertaEm ? 'lida' : 'nova' }} · {{ n.canal }}</span>
          </div>
          <p class="card-body" style="margin: 0;">{{ n.texto }}</p>
        </div>
      }
    </div>
  `,
})
export class NotificacoesComponent {
  private notifications = inject(NotificationService);
  private saved = inject(SavedSearchService);
  private auth = inject(AuthService);
  private router = inject(Router);

  minhas = computed(() => this.notifications.notificacoes().filter((n) => n.userId === this.auth.conta().id).reverse());

  abrir(n: Notificacao): void {
    if (n.tipo === 'radar') {
      this.saved.registrarAbertura(n.id, String(n.motivoDados['saved_search_id']), String(n.motivoDados['vehicle_id']));
    } else {
      this.notifications.abrir(n.id);
    }
    if (n.link) this.router.navigateByUrl(n.link);
  }
}
