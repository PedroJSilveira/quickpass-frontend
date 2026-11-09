import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Papel } from '../models/domain.models';

/** Exige sessão iniciada; senão leva ao login e volta para a tela pedida depois de entrar. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.logado()) return true;
  return inject(Router).createUrlTree(['/entrar'], { queryParams: { next: state.url } });
};

/** Somente contas admin (criadas direto no banco). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.admin()) return true;
  return inject(Router).createUrlTree([auth.logado() ? auth.rotaInicial() : '/entrar']);
};

/** Exige que a conta tenha o papel (locatário/proprietário); senão vai ao perfil para ativá-lo. */
export const papelGuard =
  (papel: Papel): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    if (auth.temPapel(papel)) return true;
    return inject(Router).createUrlTree([auth.admin() ? '/admin/veiculos' : '/perfil'], { queryParams: { ativar: papel } });
  };

/**
 * Bloqueia rotas que exigem KYC `APROVADO` e não expirado (ex.: pagamento). Consulta o servidor.
 * Reservar sem KYC NÃO passa por aqui: a reserva nasce em `aguardando_kyc` com hold de agenda.
 */
export const kycGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  if (await auth.verificarExpiracao()) return true;
  return inject(Router).createUrlTree(['/verificacao']);
};
