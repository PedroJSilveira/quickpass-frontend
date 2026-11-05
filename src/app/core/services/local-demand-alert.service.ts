import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';
import { CatalogService } from './catalog.service';
import { DemandService } from './demand.service';
import { NotificationService } from './notification.service';
import { SchedulerService } from './scheduler.service';

/**
 * Notificação de demanda local (RF16): "há procura na sua região" somente com
 * evidência — volume mínimo de buscas compatíveis + solicitações na janela.
 * Abaixo do mínimo não envia nada; sem urgência artificial; registra o dado.
 */
@Injectable({ providedIn: 'root' })
export class LocalDemandAlertService {
  private config = inject(AppConfigService);
  private catalog = inject(CatalogService);
  private demand = inject(DemandService);
  private notifications = inject(NotificationService);

  constructor() {
    inject(SchedulerService).registrar('demanda-local', () => this.executar());
  }

  /** Rotina de demanda local (BDD 9.5). Retorna quantos alertas enviou. */
  executar(): number {
    const janela = this.config.get('JANELA_DEMANDA_DIAS');
    const minimo = this.config.get('MIN_BUSCAS_DEMANDA');
    const jaAvisados = new Set<string>();
    let enviados = 0;
    for (const v of this.catalog.veiculos().filter((x) => x.status === 'Aprovado')) {
      if (jaAvisados.has(v.proprietarioId)) continue;
      const d = this.demand.demanda(v.local);
      const volume = d.buscas + d.solicitacoes;
      if (volume < minimo) continue; // sem evidência suficiente, nenhuma notificação
      if (this.notifications.enviadasNaSemana(v.proprietarioId, 'demanda_local') >= this.config.get('MAX_AVISOS_SEMANA')) continue;
      const n = this.notifications.enviar({
        userId: v.proprietarioId,
        tipo: 'demanda_local',
        titulo: 'Procura na sua região',
        texto: `${d.buscas} buscas e ${d.solicitacoes} solicitações em ${v.local} nos últimos ${janela} dias.`,
        link: `/proprietario/veiculos/${v.id}/disponibilidade?origem=notificacao`,
        motivoDados: { regiao: v.local, buscas: d.buscas, solicitacoes: d.solicitacoes, janela_dias: janela, minimo },
      });
      if (n) {
        jaAvisados.add(v.proprietarioId);
        enviados++;
      }
    }
    return enviados;
  }
}
