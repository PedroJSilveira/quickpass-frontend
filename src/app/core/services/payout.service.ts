import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapRepasse } from '../api/mappers';
import { Repasse } from '../models/domain.models';

/** Repasses ao proprietário (Previsto → Pago após conclusão + caução resolvida — regra do servidor). */
@Injectable({ providedIn: 'root' })
export class PayoutService {
  private api = inject(ApiService);
  private readonly _repasses = signal<Repasse[]>([]);
  private readonly _liquidoMes = signal(0);
  private readonly _saldo = signal(0);

  readonly repasses = this._repasses.asReadonly();
  readonly liquidoMesAtual = this._liquidoMes.asReadonly();
  readonly saldoPrevisto = this._saldo.asReadonly();
  readonly pagos = computed(() => this._repasses().filter((r) => r.status === 'Pago'));

  async carregar(): Promise<void> {
    const g = await this.api.get<{ liquidoMesAtual: number; saldoPrevisto: number; repasses: any[] }>('/proprietario/ganhos');
    this._repasses.set(g.repasses.map(mapRepasse));
    this._liquidoMes.set(g.liquidoMesAtual);
    this._saldo.set(g.saldoPrevisto);
  }
}
