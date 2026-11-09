import { Routes } from '@angular/router';
import { AppShellComponent } from './shared/layout/app-shell.component';
import { adminGuard, authGuard, kycGuard, papelGuard } from './core/guards/kyc.guard';

const loc = [authGuard, papelGuard('locatario')];
const prop = [authGuard, papelGuard('proprietario')];
const adm = [authGuard, adminGuard];

export const routes: Routes = [
  // — público, sem shell —
  { path: '', loadComponent: () => import('./features/site/site.component').then((m) => m.SiteComponent) },
  { path: 'entrar', loadComponent: () => import('./features/auth/welcome.component').then((m) => m.WelcomeComponent) },
  { path: 'cadastro', loadComponent: () => import('./features/auth/cadastro.component').then((m) => m.CadastroComponent) },
  { path: 'verificacao', canActivate: [authGuard], loadComponent: () => import('./features/auth/kyc.component').then((m) => m.KycComponent) },
  {
    path: 'reserva/:id/confirmado',
    canActivate: loc,
    loadComponent: () => import('./features/renter/confirmado.component').then((m) => m.ConfirmadoComponent),
  },

  // — com topbar + sidenav (busca e detalhe do carro são públicos; o resto exige sessão) —
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: 'buscar', loadComponent: () => import('./features/renter/busca.component').then((m) => m.BuscaComponent) },
      { path: 'carros/:id', loadComponent: () => import('./features/renter/detalhe.component').then((m) => m.DetalheComponent) },
      { path: 'carros/:id/reservar', canActivate: loc, loadComponent: () => import('./features/renter/reserva.component').then((m) => m.ReservaComponent) },

      // locatário
      { path: 'locacoes/:id/pagamento', canActivate: [...loc, kycGuard], loadComponent: () => import('./features/renter/pagamento.component').then((m) => m.PagamentoComponent) },
      { path: 'locacoes', canActivate: loc, loadComponent: () => import('./features/renter/locacoes.component').then((m) => m.LocacoesComponent) },
      { path: 'locacoes/:id/avaliar', canActivate: [authGuard], loadComponent: () => import('./features/renter/avaliacao.component').then((m) => m.AvaliacaoComponent) },
      { path: 'locacoes/:id/contestar', canActivate: loc, loadComponent: () => import('./features/renter/contestacao.component').then((m) => m.ContestacaoComponent) },
      { path: 'buscas-salvas', canActivate: loc, loadComponent: () => import('./features/renter/buscas-salvas.component').then((m) => m.BuscasSalvasComponent) },

      // as duas partes fazem a vistoria
      { path: 'locacoes/:id/check-in', canActivate: [authGuard], loadComponent: () => import('./features/renter/checkin.component').then((m) => m.CheckinComponent) },
      { path: 'locacoes/:id/check-out', canActivate: [authGuard], loadComponent: () => import('./features/renter/checkout.component').then((m) => m.CheckoutComponent) },

      // conta
      { path: 'perfil', canActivate: [authGuard], loadComponent: () => import('./features/renter/perfil.component').then((m) => m.PerfilComponent) },
      { path: 'notificacoes', canActivate: [authGuard], loadComponent: () => import('./features/renter/notificacoes.component').then((m) => m.NotificacoesComponent) },

      // proprietário
      { path: 'proprietario', pathMatch: 'full', canActivate: prop, loadComponent: () => import('./features/owner/painel.component').then((m) => m.PainelComponent) },
      { path: 'proprietario/veiculos', pathMatch: 'full', canActivate: prop, loadComponent: () => import('./features/owner/veiculos.component').then((m) => m.VeiculosComponent) },
      { path: 'proprietario/veiculos/novo', canActivate: prop, loadComponent: () => import('./features/owner/veiculo-novo.component').then((m) => m.VeiculoNovoComponent) },
      { path: 'proprietario/veiculos/:id/disponibilidade', canActivate: prop, loadComponent: () => import('./features/owner/disponibilidade.component').then((m) => m.DisponibilidadeComponent) },
      { path: 'proprietario/veiculos/:id/simulacao', canActivate: prop, loadComponent: () => import('./features/owner/simulacao.component').then((m) => m.SimulacaoComponent) },
      { path: 'proprietario/solicitacoes', canActivate: prop, loadComponent: () => import('./features/owner/solicitacoes.component').then((m) => m.SolicitacoesComponent) },
      { path: 'proprietario/reservas', canActivate: prop, loadComponent: () => import('./features/owner/reservas.component').then((m) => m.ReservasProprietarioComponent) },
      { path: 'proprietario/ganhos', canActivate: prop, loadComponent: () => import('./features/owner/ganhos.component').then((m) => m.GanhosComponent) },

      // admin (contas criadas direto no banco)
      { path: 'admin/veiculos', canActivate: adm, loadComponent: () => import('./features/admin/veiculos.component').then((m) => m.VeiculosModeracaoComponent) },
      { path: 'admin/disputas', canActivate: adm, loadComponent: () => import('./features/admin/disputas.component').then((m) => m.DisputasComponent) },
      { path: 'admin/metricas', canActivate: adm, loadComponent: () => import('./features/admin/metricas.component').then((m) => m.MetricasComponent) },
    ],
  },

  { path: '**', redirectTo: '' },
];
