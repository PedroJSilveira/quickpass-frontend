import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Bloqueia rotas que exigem conta verificada (ex.: finalizar uma reserva).
 * "Anunciar veículo" tem uma checagem própria (dados bancários) feita no
 * próprio componente `veiculo-novo`, pois a exigência é parcial (só o item
 * "banco" do KYC), não a verificação completa.
 */
export const kycGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.contaVerificada()) return true;

  router.navigate(['/verificacao']);
  return false;
};
