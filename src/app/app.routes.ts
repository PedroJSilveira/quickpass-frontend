import { Routes } from '@angular/router';
import { AppShellComponent } from './shared/layout/app-shell.component';
import { kycGuard } from './core/guards/kyc.guard';

export const routes: Routes = [
  // — público, sem shell —
  {
    path: '',
    loadComponent: () => import('./features/site/site.component').then((m) => m.SiteComponent),
  },
  {
    path: 'entrar',
    loadComponent: () => import('./features/auth/welcome.component').then((m) => m.WelcomeComponent),
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./features/auth/cadastro.component').then((m) => m.CadastroComponent),
  },
  {
    path: 'verificacao',
    loadComponent: () => import('./features/auth/kyc.component').then((m) => m.KycComponent),
  },
  {
    path: 'reserva/:id/confirmado',
    loadComponent: () =>
      import('./features/renter/confirmado.component').then((m) => m.ConfirmadoComponent),
  },

  // — autenticado, com topbar + sidenav —
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: 'buscar',
        loadComponent: () => import('./features/renter/busca.component').then((m) => m.BuscaComponent),
      },
      {
        path: 'carros/:id',
        loadComponent: () => import('./features/renter/detalhe.component').then((m) => m.DetalheComponent),
      },
      {
        path: 'carros/:id/reservar',
        loadComponent: () => import('./features/renter/reserva.component').then((m) => m.ReservaComponent),
      },
      {
        path: 'locacoes/:id/pagamento',
        canActivate: [kycGuard],
        loadComponent: () => import('./features/renter/pagamento.component').then((m) => m.PagamentoComponent),
      },
      {
        path: 'locacoes',
        loadComponent: () => import('./features/renter/locacoes.component').then((m) => m.LocacoesComponent),
      },
      {
        path: 'locacoes/:id/check-in',
        loadComponent: () => import('./features/renter/checkin.component').then((m) => m.CheckinComponent),
      },
      {
        path: 'locacoes/:id/check-out',
        loadComponent: () => import('./features/renter/checkout.component').then((m) => m.CheckoutComponent),
      },
      {
        path: 'locacoes/:id/avaliar',
        loadComponent: () => import('./features/renter/avaliacao.component').then((m) => m.AvaliacaoComponent),
      },
      {
        path: 'locacoes/:id/contestar',
        loadComponent: () => import('./features/renter/contestacao.component').then((m) => m.ContestacaoComponent),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/renter/perfil.component').then((m) => m.PerfilComponent),
      },
      {
        path: 'proprietario',
        pathMatch: 'full',
        loadComponent: () => import('./features/owner/painel.component').then((m) => m.PainelComponent),
      },
      {
        path: 'proprietario/veiculos',
        pathMatch: 'full',
        loadComponent: () => import('./features/owner/veiculos.component').then((m) => m.VeiculosComponent),
      },
      {
        path: 'proprietario/veiculos/novo',
        loadComponent: () => import('./features/owner/veiculo-novo.component').then((m) => m.VeiculoNovoComponent),
      },
      {
        path: 'proprietario/veiculos/:id/disponibilidade',
        loadComponent: () =>
          import('./features/owner/disponibilidade.component').then((m) => m.DisponibilidadeComponent),
      },
      {
        path: 'proprietario/solicitacoes',
        loadComponent: () =>
          import('./features/owner/solicitacoes.component').then((m) => m.SolicitacoesComponent),
      },
      {
        path: 'buscas-salvas',
        loadComponent: () => import('./features/renter/buscas-salvas.component').then((m) => m.BuscasSalvasComponent),
      },
      {
        path: 'notificacoes',
        loadComponent: () => import('./features/renter/notificacoes.component').then((m) => m.NotificacoesComponent),
      },
      {
        path: 'proprietario/veiculos/:id/simulacao',
        loadComponent: () => import('./features/owner/simulacao.component').then((m) => m.SimulacaoComponent),
      },
      {
        path: 'admin/metricas',
        loadComponent: () => import('./features/admin/metricas.component').then((m) => m.MetricasComponent),
      },
      {
        path: 'admin/disputas',
        loadComponent: () => import('./features/admin/disputas.component').then((m) => m.DisputasComponent),
      },
      {
        path: 'proprietario/ganhos',
        loadComponent: () => import('./features/owner/ganhos.component').then((m) => m.GanhosComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
