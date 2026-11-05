import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Bloqueia rotas que exigem KYC `APROVADO` e não expirado (ex.: pagamento).
 * Reservar sem KYC NÃO passa por este guard: a reserva é criada em
 * `aguardando_kyc` com hold de agenda e o usuário vai ao KYC (BDD 9.1).
 * Publicar veículo/agenda também exige KYC aprovado (checado no OwnerService).
 */
export const kycGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.verificarExpiracao()) return true;

  router.navigate(['/verificacao']);
  return false;
};
