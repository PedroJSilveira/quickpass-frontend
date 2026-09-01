import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule, Car, Search, ClipboardList, User, LayoutDashboard, CarFront, Inbox, Wallet, ExternalLink } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { OwnerService } from '../../core/services/owner.service';
import { Papel } from '../../core/models/domain.models';
import { SegControlComponent, SegOption } from '../components/seg-control.component';

interface NavItem {
  rota: string;
  label: string;
  icon: typeof Car;
  exact?: boolean;
  badge?: () => number;
  muted?: boolean;
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
          @for (item of itensNavPrimario(); track item.rota) {
            <a
              class="qp-nav-link"
              [routerLink]="item.rota"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
            >
              <lucide-icon [img]="item.icon" [size]="18" />
              {{ item.label }}
              @if (item.badge && item.badge() > 0) {
                <span class="qp-nav-badge">{{ item.badge() }}</span>
              }
            </a>
          }
        </nav>

        <nav class="qp-nav-group qp-nav-group-secondary">
          <h6>Conta</h6>
          @for (item of itensNavSecundario(); track item.rota) {
            <a
              class="qp-nav-link"
              [class.qp-nav-link-muted]="item.muted"
              [routerLink]="item.rota"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
            >
              <lucide-icon [img]="item.icon" [size]="18" />
              {{ item.label }}
            </a>
          }
        </nav>
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

  papelOptions: SegOption<Papel>[] = [
    { label: 'Locatário', value: 'locatario' },
    { label: 'Proprietário', value: 'proprietario' },
  ];

  private readonly navPrimarioLocatario: NavItem[] = [
    { rota: '/buscar', label: 'Buscar carros', icon: Search },
    { rota: '/locacoes', label: 'Minhas locações', icon: ClipboardList },
  ];

  private readonly navPrimarioProprietario: NavItem[] = [
    { rota: '/proprietario', label: 'Painel', icon: LayoutDashboard, exact: true },
    { rota: '/proprietario/veiculos', label: 'Meus veículos', icon: CarFront },
    {
      rota: '/proprietario/solicitacoes',
      label: 'Solicitações',
      icon: Inbox,
      badge: () => this.owner.solicitacoesPendentes().length,
    },
    { rota: '/proprietario/ganhos', label: 'Ganhos', icon: Wallet },
  ];

  private readonly navSecundario: NavItem[] = [
    { rota: '/perfil', label: 'Perfil', icon: User },
    { rota: '/', label: 'Ver site', icon: ExternalLink, muted: true },
  ];

  constructor(
    public auth: AuthService,
    private owner: OwnerService,
    private router: Router,
  ) {}

  itensNavPrimario(): NavItem[] {
    return this.auth.papelAtivo() === 'locatario' ? this.navPrimarioLocatario : this.navPrimarioProprietario;
  }

  itensNavSecundario(): NavItem[] {
    return this.navSecundario;
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
