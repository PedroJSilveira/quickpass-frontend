import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule, Car, Search, ClipboardList, User, LayoutDashboard, CarFront, Inbox, Wallet, ExternalLink } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { Papel } from '../../core/models/domain.models';
import { SegControlComponent, SegOption } from '../components/seg-control.component';

interface NavItem {
  rota: string;
  label: string;
  icon: typeof Car;
  exact?: boolean;
}

/**
 * Casca comum das telas autenticadas: barra lateral flutuante (marca +
 * navegação por ícone, agrupada por papel ativo) + topbar (seletor de papel,
 * conta, "Ver site"). Redesenhada no padrão de sidebar do Dealsign — painel
 * arredondado com sombra e item ativo em "pill" — adaptado à paleta/tokens
 * do design system Industry deste projeto. Ver README, seção "Telas".
 */
@Component({
  selector: 'qp-app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    SegControlComponent,
    LucideAngularModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-shell">
      <aside class="qp-sidenav">
        <div class="qp-sidenav-brand">
          <span class="qp-sidenav-brand-mark"><lucide-icon [img]="CarIcon" [size]="18" /></span>
          <span class="qp-sidenav-brand-name">QuickPass</span>
        </div>

        <nav class="qp-nav-group">
          <h6>{{ auth.papelAtivo() === 'locatario' ? 'Locatário' : 'Proprietário' }}</h6>
          @for (item of itensNav(); track item.rota) {
            <a
              class="qp-nav-link"
              [routerLink]="item.rota"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
            >
              <lucide-icon [img]="item.icon" [size]="18" />
              {{ item.label }}
            </a>
          }
        </nav>

        <a class="qp-nav-link qp-nav-link-muted" routerLink="/" style="margin-top: auto;">
          <lucide-icon [img]="ExternalLinkIcon" [size]="18" />
          Ver site
        </a>
      </aside>

      <div class="qp-content">
        <header class="qp-topbar">
          <qp-seg-control
            [options]="papelOptions"
            [value]="auth.papelAtivo()"
            (valueChange)="trocarPapel($event)"
          />
          <div class="qp-row" style="margin-left: auto; gap: var(--space-3);">
            <span class="qp-avatar" style="width: 32px; height: 32px; font-size: 12px;">{{ iniciais() }}</span>
            <span style="font-size: 13px;">
              {{ auth.conta().nome }}
              <br />
              <span
                style="font-size: 11px;"
                [style.color]="auth.contaVerificada() ? 'var(--color-accent-700)' : 'var(--color-neutral-600)'"
              >
                {{ auth.contaVerificada() ? 'Verificado' : 'Verificação pendente' }}
              </span>
            </span>
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
  readonly CarIcon = Car;
  readonly ExternalLinkIcon = ExternalLink;

  papelOptions: SegOption<Papel>[] = [
    { label: 'Locatário', value: 'locatario' },
    { label: 'Proprietário', value: 'proprietario' },
  ];

  private readonly navLocatario: NavItem[] = [
    { rota: '/buscar', label: 'Buscar carros', icon: Search },
    { rota: '/locacoes', label: 'Minhas locações', icon: ClipboardList },
    { rota: '/perfil', label: 'Perfil', icon: User },
  ];

  private readonly navProprietario: NavItem[] = [
    { rota: '/proprietario', label: 'Painel', icon: LayoutDashboard, exact: true },
    { rota: '/proprietario/veiculos', label: 'Meus veículos', icon: CarFront },
    { rota: '/proprietario/solicitacoes', label: 'Solicitações', icon: Inbox },
    { rota: '/proprietario/ganhos', label: 'Ganhos', icon: Wallet },
    { rota: '/perfil', label: 'Perfil', icon: User },
  ];

  constructor(public auth: AuthService, private router: Router) {}

  itensNav(): NavItem[] {
    return this.auth.papelAtivo() === 'locatario' ? this.navLocatario : this.navProprietario;
  }

  iniciais(): string {
    return this.auth
      .conta()
      .nome.split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  trocarPapel(papel: Papel): void {
    this.auth.alternarPapel(papel);
    this.router.navigate([papel === 'locatario' ? '/buscar' : '/proprietario']);
  }
}
