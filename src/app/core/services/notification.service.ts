import { Injectable, inject, signal } from '@angular/core';
import { CanalNotificacao, Notificacao, TipoNotificacao } from '../models/domain.models';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { ClockService } from './clock.service';
import { ConsentService } from './consent.service';

const CANAIS: CanalNotificacao[] = ['push', 'email', 'sms'];
const SEMANA_MS = 7 * 24 * 3600_000;

/**
 * Envio responsável de notificações de engajamento (RNF03): exige
 * consentimento de marketing em algum canal, respeita o limite global por
 * semana e SEMPRE registra o dado que justificou o envio.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private bus = inject(EventBusService);
  private config = inject(AppConfigService);
  private clock = inject(ClockService);
  private consent = inject(ConsentService);
  private seq = 0;

  private readonly _notificacoes = signal<Notificacao[]>([]);
  readonly notificacoes = this._notificacoes.asReadonly();

  /** Primeiro canal com consentimento de marketing, ou null. */
  canalPermitido(): CanalNotificacao | null {
    return CANAIS.find((c) => this.consent.permite(c, 'marketing')) ?? null;
  }

  /** Quantas notificações de engajamento o usuário recebeu na última semana. */
  enviadasNaSemana(userId: string, tipo?: TipoNotificacao): number {
    const limite = this.clock.now().getTime() - SEMANA_MS;
    return this._notificacoes().filter((n) => n.userId === userId && (!tipo || n.tipo === tipo) && new Date(n.enviadaEm).getTime() >= limite).length;
  }

  /**
   * Tenta enviar. Retorna a notificação ou null (sem consentimento, limite
   * global atingido, ou sem dado que a justifique).
   */
  enviar(params: { userId: string; tipo: TipoNotificacao; titulo: string; texto: string; link?: string; motivoDados: Record<string, unknown> }): Notificacao | null {
    if (!params.motivoDados || Object.keys(params.motivoDados).length === 0) return null; // sem dado real, sem notificação
    const canal = this.canalPermitido();
    if (!canal) return null;
    if (this.enviadasNaSemana(params.userId) >= this.config.get('LIMITE_NOTIFICACOES_GLOBAL_SEMANA')) return null;

    const n: Notificacao = {
      id: 'N-' + ++this.seq,
      userId: params.userId,
      canal,
      tipo: params.tipo,
      titulo: params.titulo,
      texto: params.texto,
      link: params.link ?? null,
      motivoDados: params.motivoDados,
      enviadaEm: this.clock.iso(),
      abertaEm: null,
    };
    this._notificacoes.update((l) => [...l, n]);
    this.bus.emitir('notificacao_enviada', { notificacao_id: n.id, user_id: n.userId, canal, tipo: n.tipo, motivo_dados: n.motivoDados });
    return n;
  }

  abrir(id: string): Notificacao | undefined {
    const n = this._notificacoes().find((x) => x.id === id);
    if (!n) return undefined;
    if (!n.abertaEm) {
      const aberta = { ...n, abertaEm: this.clock.iso() };
      this._notificacoes.update((l) => l.map((x) => (x.id === id ? aberta : x)));
      this.bus.emitir('notificacao_aberta', { notificacao_id: id, user_id: n.userId, canal: n.canal, tipo: n.tipo });
      return aberta;
    }
    return n;
  }

  daConta(userId: string): Notificacao[] {
    return this._notificacoes().filter((n) => n.userId === userId);
  }

  /** Última abertura de notificação (base da regra de atribuição de retorno espontâneo — RF15). */
  ultimaInteracao(userId: string): string | null {
    const abertas = this._notificacoes().filter((n) => n.userId === userId && n.abertaEm).map((n) => n.abertaEm!);
    return abertas.sort().at(-1) ?? null;
  }
}
