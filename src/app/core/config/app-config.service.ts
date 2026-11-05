import { Injectable, computed, signal } from '@angular/core';
import { CONFIG_DEFAULTS, ConfigKey, PROVISORIOS } from './config.defaults';

const STORAGE_KEY = 'qp.config';

/**
 * Acesso central aos parâmetros da seção 11. Os valores podem ser alterados
 * em runtime (sem deploy) e persistem em localStorage; em produção viriam de
 * um endpoint de configuração.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly _overrides = signal<Partial<Record<ConfigKey, number>>>(this.carregar());

  /** Todos os valores efetivos (padrão + sobrescritas). */
  readonly valores = computed(() => ({ ...CONFIG_DEFAULTS, ...this._overrides() }) as Record<ConfigKey, number>);

  get(chave: ConfigKey): number {
    return this.valores()[chave];
  }

  definir(chave: ConfigKey, valor: number): void {
    this._overrides.update((o) => ({ ...o, [chave]: valor }));
    this.persistir();
  }

  restaurarPadroes(): void {
    this._overrides.set({});
    this.persistir();
  }

  /** Indica que o valor ainda é provisório (a definir pela equipe). */
  ehProvisorio(chave: ConfigKey): boolean {
    return PROVISORIOS.includes(chave) && !(chave in this._overrides());
  }

  private carregar(): Partial<Record<ConfigKey, number>> {
    try {
      return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  private persistir(): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this._overrides()));
    } catch {
      /* armazenamento indisponível: mantém só em memória */
    }
  }
}
