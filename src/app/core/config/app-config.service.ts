import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { CONFIG_DEFAULTS, ConfigKey } from './config.defaults';

export interface Precos {
  taxaPct: number;
  caucao: number;
  protecaoBasicaDia: number;
  protecaoCompletaDia: number;
  franquiaBasica: number;
  franquiaCompleta: number;
}

const PRECOS_PADRAO: Precos = { taxaPct: 15, caucao: 500, protecaoBasicaDia: 25, protecaoCompletaDia: 45, franquiaBasica: 3000, franquiaCompleta: 800 };

/**
 * Parâmetros de negócio (seção 11) e preços, lidos do backend (`GET /api/config/publica`).
 * Se a API estiver fora do ar no início, vale o padrão local até a próxima carga.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private api = inject(ApiService);
  private readonly _valores = signal<Partial<Record<ConfigKey, number>>>({});
  private readonly _precos = signal<Precos>(PRECOS_PADRAO);

  readonly valores = computed(() => ({ ...CONFIG_DEFAULTS, ...this._valores() }) as Record<ConfigKey, number>);
  readonly precos = this._precos.asReadonly();

  get(chave: ConfigKey): number {
    return this.valores()[chave];
  }

  async carregar(): Promise<void> {
    try {
      const r = await this.api.get<{ parametros: Record<string, { valor: number }>; precos: Precos }>('/config/publica');
      const v: Partial<Record<ConfigKey, number>> = {};
      for (const [k, p] of Object.entries(r.parametros)) v[k as ConfigKey] = p.valor;
      this._valores.set(v);
      this._precos.set(r.precos);
    } catch {
      /* mantém os padrões */
    }
  }
}
