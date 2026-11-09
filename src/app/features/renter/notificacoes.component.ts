import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Notificacao } from '../../core/models/domain.models';
import { NotificationService } from '../../core/services/notification.service';

/** Caixa de notificações. Abrir uma notificação registra `notificacao_aberta` (base da atribuição de retorno — RF15). */
@Component({
  selector: 'qp-notificacoes',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Conta</div>
    <h4 class="qp-screen-title">Notificações</h4>
    @if (notifications.notificacoes().length === 0) {
      <div class="qp-empty">
        Nenhuma notificação. Só enviamos avisos de engajamento se você autorizar o canal e houver um dado real que os justifique.
      </div>
    }
    <div class="qp-stack">
      @for (n of notifications.notificacoes(); track n.id) {
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
export class NotificacoesComponent implements OnInit {
  notifications = inject(NotificationService);
  private router = inject(Router);

  ngOnInit(): void {
    void this.notifications.carregar();
  }

  async abrir(n: Notificacao): Promise<void> {
    try {
      await this.notifications.abrir(n);
    } catch {
      /* ainda navega para o destino */
    }
    if (n.link) this.router.navigateByUrl(n.link);
  }
}
