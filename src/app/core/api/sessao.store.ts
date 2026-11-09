import { Injectable, signal } from '@angular/core';
import { Papel } from '../models/domain.models';

const K_TOKEN = 'qp.token';
const K_PAPEL = 'qp.papel';

function ler(k: string): string | null {
  try {
    return globalThis.localStorage?.getItem(k) ?? null;
  } catch {
    return null;
  }
}
function gravar(k: string, v: string | null): void {
  try {
    if (v === null) globalThis.localStorage?.removeItem(k);
    else globalThis.localStorage?.setItem(k, v);
  } catch {
    /* sem storage: vale só nesta aba */
  }
}

/**
 * Token da sessão e papel ativo. Fica separado do AuthService para o interceptor HTTP
 * poder ler sem depender de HttpClient (evita ciclo de injeção).
 */
@Injectable({ providedIn: 'root' })
export class SessaoStore {
  readonly sessionId = 's-' + Math.random().toString(36).slice(2, 10);
  private _token = ler(K_TOKEN);
  readonly papelAtivo = signal<Papel | null>((ler(K_PAPEL) as Papel | null) ?? null);

  get token(): string | null {
    return this._token;
  }

  definirToken(t: string | null): void {
    this._token = t;
    gravar(K_TOKEN, t);
  }

  definirPapel(p: Papel | null): void {
    this.papelAtivo.set(p);
    gravar(K_PAPEL, p);
  }
}
