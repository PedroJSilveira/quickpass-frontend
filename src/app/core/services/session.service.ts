import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { ClockService } from './clock.service';
import { NotificationService } from './notification.service';

export type OrigemSessao = 'direta' | 'push' | 'email' | 'link';

/**
 * Registra `sessao_iniciada` com origem classificada (RF15). Retorno
 * espontâneo = sessão sem abertura atribuída a notificação. A janela de
 * atribuição por tempo fica para a Fase 3; aqui, `push`/`email` (via
 * `?origem=` ou `notificacao_id`) contam como notificada.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private auth = inject(AuthService);
  private bus = inject(EventBusService);
  private config = inject(AppConfigService);
  private clock = inject(ClockService);
  private notifications = inject(NotificationService);
  readonly sessionId = 's-' + Math.random().toString(36).slice(2, 10);

  iniciar(search: string = globalThis.location?.search ?? ''): void {
    const q = new URLSearchParams(search);
    const origem = this.classificar(q.get('origem'), q.get('notificacao_id'));
    const conta = this.auth.conta();
    this.bus.definirContexto({ userId: conta.id, papel: conta.papel, sessionId: this.sessionId });
    // Espontâneo = sessão SEM abertura de notificação atribuída dentro da janela (RF15).
    const ultima = this.notifications.ultimaInteracao(conta.id);
    const janelaMs = this.config.get('JANELA_ATRIBUICAO_NOTIFICACAO_MIN') * 60_000;
    const atribuida = !!ultima && this.clock.now().getTime() - new Date(ultima).getTime() <= janelaMs;
    this.bus.emitir('sessao_iniciada', {
      origem,
      notificacao_id: q.get('notificacao_id'),
      ultima_interacao_notificacao: ultima,
      retorno_espontaneo: (origem === 'direta' || origem === 'link') && !atribuida,
    });
  }

  /** Mantém o contexto de eventos alinhado ao papel ativo. */
  sincronizarContexto(): void {
    const c = this.auth.conta();
    this.bus.definirContexto({ userId: c.id, papel: c.papel, sessionId: this.sessionId });
  }

  private classificar(origem: string | null, notificacaoId: string | null): OrigemSessao {
    if (origem === 'push' || origem === 'email') return origem;
    if (notificacaoId) return 'push';
    if (origem === 'link') return 'link';
    return 'direta';
  }
}
