import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { effect } from '@angular/core';
import { LucideAngularModule, Bell, Bookmark, Car, Search, ClipboardList, User, LayoutDashboard, CarFront, Inbox, Wallet, ExternalLink, ShieldCheck, ClipboardCheck } from 'lucide-angular';
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
          @if (auth.logado() && !auth.admin() && papelOptions().length > 1) {
            <qp-seg-control
              [options]="papelOptions()"
              [value]="auth.papelAtivo()"
              (valueChange)="trocarPapel($event)"
            />
          }
          @if (auth.logado()) {
            <div class="qp-row" style="margin-left: auto; gap: var(--space-3);">
              <span class="qp-avatar" style="width: 32px; height: 32px; font-size: 12px;">{{ iniciais() }}</span>
              <span style="font-size: 13px;">
                {{ auth.conta().nome }}
                <br />
                <span
                  style="font-size: 11px;"
                  [style.color]="auth.admin() || auth.contaVerificada() ? 'var(--color-accent-700)' : 'var(--color-neutral-600)'"
                >
                  {{ auth.admin() ? 'Administrador' : auth.contaVerificada() ? 'Verificado' : 'Verificação pendente' }}
                </span>
              </span>
              <button class="btn btn-ghost" type="button" (click)="sair()">Sair</button>
            </div>
          } @else {
            <div class="qp-row" style="margin-left: auto; gap: var(--space-2);">
              <a class="btn btn-ghost" routerLink="/entrar">Entrar</a>
              <a class="btn btn-primary" routerLink="/cadastro">Criar conta</a>
            </div>
          }
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

  papelOptions = computed<SegOption<Papel>[]>(() =>
    (['locatario', 'proprietario'] as Papel[])
      .filter((p) => this.auth.temPapel(p))
      .map((p) => ({ label: p === 'locatario' ? 'Locatário' : 'Proprietário', value: p })),
  );

  private readonly navPublico: NavItem[] = [{ rota: '/buscar', label: 'Buscar carros', icon: Search }];

  private readonly navPrimarioLocatario: NavItem[] = [
    { rota: '/buscar', label: 'Buscar carros', icon: Search },
    { rota: '/locacoes', label: 'Minhas locações', icon: ClipboardList },
    { rota: '/buscas-salvas', label: 'Buscas salvas', icon: Bookmark },
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
    { rota: '/proprietario/reservas', label: 'Reservas', icon: ClipboardList },
    { rota: '/proprietario/ganhos', label: 'Ganhos', icon: Wallet },
  ];

  private readonly navAdmin: NavItem[] = [
    { rota: '/admin/veiculos', label: 'Moderação de veículos', icon: ClipboardCheck },
    { rota: '/admin/disputas', label: 'Mediação de disputas', icon: ShieldCheck },
    { rota: '/admin/metricas', label: 'Métricas', icon: LayoutDashboard },
  ];

  constructor(
    public auth: AuthService,
    private owner: OwnerService,
    private router: Router,
  ) {
    // Mantém o selo de solicitações pendentes do proprietário atualizado ao trocar de tela/papel.
    effect(() => {
      if (this.auth.logado() && !this.auth.admin() && this.auth.papelAtivo() === 'proprietario' && this.auth.temPapel('proprietario')) {
        void this.owner.carregarSolicitacoes().catch(() => undefined);
      }
    });
  }

  itensNavPrimario(): NavItem[] {
    if (!this.auth.logado()) return this.navPublico;
    if (this.auth.admin()) return this.navAdmin;
    return this.auth.papelAtivo() === 'locatario' ? this.navPrimarioLocatario : this.navPrimarioProprietario;
  }

  itensNavSecundario(): NavItem[] {
    if (!this.auth.logado()) return [{ rota: '/', label: 'Ver site', icon: ExternalLink, muted: true }];
    return [
      { rota: '/notificacoes', label: 'Notificações', icon: Bell },
      { rota: '/perfil', label: 'Perfil', icon: User },
      { rota: '/', label: 'Ver site', icon: ExternalLink, muted: true },
    ];
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

  async sair(): Promise<void> {
    await this.auth.sair();
    this.router.navigate(['/']);
  }
}
