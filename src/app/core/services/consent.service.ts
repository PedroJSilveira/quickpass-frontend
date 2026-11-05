import { Injectable, signal } from '@angular/core';
import { CanalNotificacao } from '../models/domain.models';
export type { CanalNotificacao };
export type FinalidadeConsentimento = 'marketing' | 'transacional';

type Mapa = Record<CanalNotificacao, Record<FinalidadeConsentimento, boolean>>;

/**
 * Consentimento por canal × finalidade (RNF02/RNF03). Notificações de
 * engajamento (marketing) só podem sair com consentimento explícito: o padrão
 * é NÃO consentido; transacionais ficam ativas por padrão.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly _consentimentos = signal<Mapa>({
    push: { marketing: false, transacional: true },
    email: { marketing: false, transacional: true },
    sms: { marketing: false, transacional: true },
  });
  readonly consentimentos = this._consentimentos.asReadonly();

  permite(canal: CanalNotificacao, finalidade: FinalidadeConsentimento): boolean {
    return this._consentimentos()[canal][finalidade];
  }

  definir(canal: CanalNotificacao, finalidade: FinalidadeConsentimento, valor: boolean): void {
    this._consentimentos.update((m) => ({ ...m, [canal]: { ...m[canal], [finalidade]: valor } }));
  }
}
