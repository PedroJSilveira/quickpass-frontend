import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Papel } from '../../core/models/domain.models';
import { SegControlComponent, SegOption } from '../components/seg-control.component';

/**
 * Casca comum das telas autenticadas: topbar (marca, seletor de papel, conta,
 * "Ver site") + barra lateral de 214px com os itens agrupados por papel
 * ativo. Ver README, seção "Telas" ("Padrão comum na web").
 */
@Component({
  selector: 'qp-app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, SegControlComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-shell">
      <aside class="qp-sidenav">
        <div class="nav-brand">QuickPass</div>

        @if (auth.papelAtivo() === 'locatario') {
          <nav class="qp-nav-group">
            <h6>Locatário</h6>
            <a class="qp-nav-link" routerLink="/buscar" routerLinkActive="active">Buscar carros</a>
            <a class="qp-nav-link" routerLink="/locacoes" routerLinkActive="active">Minhas locações</a>
            <a class="qp-nav-link" routerLink="/perfil" routerLinkActive="active">Perfil</a>
          </nav>
        } @else {
          <nav class="qp-nav-group">
            <h6>Proprietário</h6>
            <a class="qp-nav-link" routerLink="/proprietario" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Painel</a>
            <a class="qp-nav-link" routerLink="/proprietario/veiculos" routerLinkActive="active">Meus veículos</a>
            <a class="qp-nav-link" routerLink="/proprietario/solicitacoes" routerLinkActive="active">Solicitações</a>
            <a class="qp-nav-link" routerLink="/proprietario/ganhos" routerLinkActive="active">Ganhos</a>
            <a class="qp-nav-link" routerLink="/perfil" routerLinkActive="active">Perfil</a>
          </nav>
        }
      </aside>

      <div class="qp-content">
        <header class="qp-topbar">
          <qp-seg-control
            [options]="papelOptions"
            [value]="auth.papelAtivo()"
            (valueChange)="trocarPapel($event)"
          />
          <div class="qp-row" style="margin-left: auto; gap: var(--space-3);">
            <span style="font-size: 13px;">
              {{ auth.conta().nome }} ·
              <span [style.color]="auth.contaVerificada() ? 'var(--color-accent-700)' : 'var(--color-neutral-600)'">
                {{ auth.contaVerificada() ? 'Verificado' : 'Verificação pendente' }}
              </span>
            </span>
            <a class="btn btn-secondary" routerLink="/">Ver site</a>
          </div>
        </header>

        <main class="qp-main">
          <div class="qp-container">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
  `,
})
export class AppShellComponent {
  papelOptions: SegOption<Papel>[] = [
    { label: 'Locatário', value: 'locatario' },
    { label: 'Proprietário', value: 'proprietario' },
  ];

  constructor(public auth: AuthService, private router: Router) {}

  trocarPapel(papel: Papel): void {
    this.auth.alternarPapel(papel);
    this.router.navigate([papel === 'locatario' ? '/buscar' : '/proprietario']);
  }
}
