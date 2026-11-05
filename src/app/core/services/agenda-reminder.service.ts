import { Injectable, inject, signal } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';
import { CatalogService } from './catalog.service';
import { DemandService } from './demand.service';
import { NotificationService } from './notification.service';
import { SchedulerService } from './scheduler.service';
import { SupplyHealthService } from './supply-health.service';
import { ClockService } from './clock.service';

interface EstadoRegua {
  enviados: number;
  ultimoEm: string | null;
}

/**
 * Régua de lembrete de revisão de agenda / anti-churn (RF07). Só para
 * veículo ativo realmente sem oferta há DIAS_SEM_OFERTA dias consecutivos nos
 * próximos HORIZONTE dias — "não editou a agenda" NÃO é critério. Exige
 * consentimento, respeita cadência semanal/total e encerra ao liberar datas.
 */
@Injectable({ providedIn: 'root' })
export class AgendaReminderService {
  private config = inject(AppConfigService);
  private catalog = inject(CatalogService);
  private demand = inject(DemandService);
  private notifications = inject(NotificationService);
  private supply = inject(SupplyHealthService);
  private clock = inject(ClockService);

  private readonly _reguas = signal<Record<string, EstadoRegua>>({});
  private readonly recusaram = new Set<string>();
  readonly reguas = this._reguas.asReadonly();

  constructor() {
    inject(SchedulerService).registrar('lembrete-agenda', () => this.executar());
  }

  /** O proprietário recusou/descadastrou: a régua dele encerra de vez. */
  recusar(ownerId: string): void {
    this.recusaram.add(ownerId);
  }

  /** Rotina de auditoria de oferta (BDD 9.2). Retorna quantos lembretes enviou. */
  executar(): number {
    this.supply.varrer();
    let enviados = 0;
    for (const v of this.catalog.veiculos().filter((x) => x.status === 'Aprovado')) {
      // Régua encerrada ao liberar datas: com oferta aberta, o estado é descartado.
      if (this.supply.temOferta(v.id)) {
        this.limpar(v.id);
        continue;
      }
      if (!this.supply.desengajado(v.id) || this.recusaram.has(v.proprietarioId)) continue;

      const estado = this._reguas()[v.id] ?? { enviados: 0, ultimoEm: null };
      if (estado.enviados >= this.config.get('MAX_AVISOS_TOTAL')) continue;
      if (this.notifications.enviadasNaSemana(v.proprietarioId, 'revisao_agenda') >= this.config.get('MAX_AVISOS_SEMANA')) continue;

      const d = this.demand.demanda(v.local);
      const dias = this.supply.diasSemOferta(v.id);
      // Estimativa de demanda só com amostra suficiente; sempre como dado/projeção, nunca como perda.
      const texto = d.suficiente
        ? `Seu ${v.titulo} está sem datas disponíveis há ${dias} dias. Houve ${d.buscas} buscas compatíveis em ${v.local} nos últimos ${this.config.get('JANELA_DEMANDA_DIAS')} dias — projeção, não garantia de locação. Que tal revisar sua agenda?`
        : `Seu ${v.titulo} está sem datas disponíveis há ${dias} dias. Que tal revisar sua agenda?`;
      const n = this.notifications.enviar({
        userId: v.proprietarioId,
        tipo: 'revisao_agenda',
        titulo: 'Revise sua agenda',
        texto,
        link: `/proprietario/veiculos/${v.id}/disponibilidade?origem=notificacao`,
        motivoDados: { vehicle_id: v.id, dias_sem_oferta: dias, horizonte_dias: this.config.get('HORIZONTE_DISPONIBILIDADE_DIAS'), demanda: d.suficiente ? { buscas: d.buscas } : 'dados insuficientes' },
      });
      if (n) {
        this._reguas.update((m) => ({ ...m, [v.id]: { enviados: estado.enviados + 1, ultimoEm: this.clock.iso() } }));
        enviados++;
      }
    }
    return enviados;
  }

  private limpar(veiculoId: string): void {
    if (!(veiculoId in this._reguas())) return;
    this._reguas.update((m) => {
      const { [veiculoId]: _, ...resto } = m;
      return resto;
    });
  }
}
