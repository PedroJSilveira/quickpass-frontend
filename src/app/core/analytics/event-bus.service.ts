import { Injectable, inject, signal } from '@angular/core';
import { PapelEvento } from '../models/domain.models';
import { EventName } from './event-names';
import { ClockService } from '../services/clock.service';
import { sanitizarGeo } from './geo.util';

export interface EventoAnalitico {
  event_name: EventName;
  timestamp: string;
  user_id: string | null;
  papel: PapelEvento;
  session_id: string;
  props: Record<string, unknown>;
}

/**
 * Barramento de eventos analíticos (§7). Guarda em memória; em produção
 * encaminharia para o pipeline de analytics. O contexto (usuário, papel,
 * sessão) é registrado pelo SessionService para evitar dependência circular
 * com AuthService.
 */
@Injectable({ providedIn: 'root' })
export class EventBusService {
  private clock = inject(ClockService);
  private readonly _eventos = signal<EventoAnalitico[]>([]);
  readonly eventos = this._eventos.asReadonly();

  private contexto: { userId: string | null; papel: PapelEvento; sessionId: string } = {
    userId: null,
    papel: 'visitante',
    sessionId: 'sem-sessao',
  };

  definirContexto(ctx: { userId: string | null; papel: PapelEvento; sessionId: string }): void {
    this.contexto = ctx;
  }

  /** Atualiza parte do contexto (ex.: troca de papel) preservando a sessão. */
  atualizarContexto(parcial: Partial<{ userId: string | null; papel: PapelEvento }>): void {
    this.contexto = { ...this.contexto, ...parcial };
  }

  emitir(nome: EventName, props: Record<string, unknown> = {}): EventoAnalitico {
    const evento: EventoAnalitico = {
      event_name: nome,
      timestamp: this.clock.iso(),
      user_id: this.contexto.userId,
      papel: this.contexto.papel,
      session_id: this.contexto.sessionId,
      props: sanitizarGeo(props),
    };
    this._eventos.update((l) => [...l, evento]);
    return evento;
  }

  contar(nome: EventName): number {
    return this._eventos().filter((e) => e.event_name === nome).length;
  }
}
