import { Injectable, inject, signal } from '@angular/core';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { ClockService } from './clock.service';

export interface Identidade {
  cpf?: string;
  dispositivo?: string;
  cartao?: string;
}

export interface Referral {
  referrerId: string;
  inviteeId: string;
  codigo: string;
  status: 'cadastrada' | 'qualificada';
  qualificadaEm: string | null;
  bonus: number;
}

/**
 * Sistema de indicação (RF10): link individual por usuário; indicação só é
 * QUALIFICADA quando o convidado conclui e paga a primeira locação. Bloqueia
 * autoindicação (usuário/dispositivo/documento/cartão) e crédito duplicado;
 * bônus com teto por período. NÃO altera o Health Score.
 */
@Injectable({ providedIn: 'root' })
export class ReferralService {
  private bus = inject(EventBusService);
  private config = inject(AppConfigService);
  private clock = inject(ClockService);

  private codigos = new Map<string, string>(); // userId → código
  private identidades = new Map<string, Identidade>(); // userId → identidade
  private readonly _indicacoes = signal<Referral[]>([]);
  readonly indicacoes = this._indicacoes.asReadonly();

  /** Identificador estável do dispositivo (anti-autoindicação). */
  dispositivoAtual(): string {
    try {
      let id = globalThis.localStorage?.getItem('qp.device');
      if (!id) {
        id = 'd-' + Math.random().toString(36).slice(2, 12);
        globalThis.localStorage?.setItem('qp.device', id);
      }
      return id;
    } catch {
      return 'd-sem-storage';
    }
  }

  gerarLink(userId: string, identidade: Identidade = {}): { codigo: string; url: string } {
    let codigo = this.codigos.get(userId);
    if (!codigo) {
      codigo = 'QP' + Math.random().toString(36).slice(2, 8).toUpperCase();
      this.codigos.set(userId, codigo);
      this.bus.emitir('referral_link_gerado', { referrer_id: userId, codigo });
    }
    this.identidades.set(userId, { dispositivo: this.dispositivoAtual(), ...this.identidades.get(userId), ...identidade });
    const origem = globalThis.location?.origin ?? '';
    return { codigo, url: `${origem}/cadastro?ref=${codigo}` };
  }

  registrarCartao(userId: string, cartao: string): void {
    this.identidades.set(userId, { ...this.identidades.get(userId), cartao });
  }

  private donoDoCodigo(codigo: string): string | null {
    for (const [uid, c] of this.codigos) if (c === codigo) return uid;
    return null;
  }

  /** Registra o cadastro do convidado. Retorna false (e nada é registrado) se for autoindicação ou duplicado. */
  registrarCadastro(codigo: string, invitee: { id: string } & Identidade): boolean {
    const referrerId = this.donoDoCodigo(codigo);
    if (!referrerId) return false;
    const dono = this.identidades.get(referrerId) ?? {};
    const autoindicacao =
      referrerId === invitee.id ||
      (!!invitee.cpf && invitee.cpf === dono.cpf) ||
      (!!invitee.dispositivo && invitee.dispositivo === dono.dispositivo) ||
      (!!invitee.cartao && invitee.cartao === dono.cartao);
    if (autoindicacao) return false;
    if (this._indicacoes().some((i) => i.inviteeId === invitee.id)) return false; // um convidado = uma indicação
    this.identidades.set(invitee.id, { cpf: invitee.cpf, dispositivo: invitee.dispositivo, cartao: invitee.cartao });
    this._indicacoes.update((l) => [...l, { referrerId, inviteeId: invitee.id, codigo, status: 'cadastrada', qualificadaEm: null, bonus: 0 }]);
    this.bus.emitir('referral_cadastro', { referrer_id: referrerId, invitee_id: invitee.id, codigo });
    return true;
  }

  /**
   * Chamado quando o convidado conclui E paga a primeira locação. Cada convidado
   * gera no máximo um crédito; o teto por período limita o bônus (a indicação
   * continua qualificada mesmo sem bônus).
   */
  qualificar(inviteeId: string): Referral | null {
    const ind = this._indicacoes().find((i) => i.inviteeId === inviteeId);
    if (!ind || ind.status === 'qualificada') return null;
    // Cartão em comum com o indicador invalida a indicação (autoindicação disfarçada).
    const cInvitee = this.identidades.get(inviteeId)?.cartao;
    if (cInvitee && cInvitee === this.identidades.get(ind.referrerId)?.cartao) return null;

    const valor = this.config.get('REFERRAL_BONUS_VALOR');
    const teto = this.config.get('REFERRAL_TETO_PERIODO');
    const periodo = this.clock.iso().slice(0, 7);
    const creditadoNoPeriodo = this._indicacoes()
      .filter((i) => i.referrerId === ind.referrerId && i.qualificadaEm?.slice(0, 7) === periodo)
      .reduce((t, i) => t + i.bonus, 0);
    const bonus = valor > 0 && creditadoNoPeriodo + valor <= teto ? valor : 0;

    const qualificada: Referral = { ...ind, status: 'qualificada', qualificadaEm: this.clock.iso(), bonus };
    this._indicacoes.update((l) => l.map((i) => (i.inviteeId === inviteeId ? qualificada : i)));
    this.bus.emitir('referral_qualificada', { referrer_id: ind.referrerId, invitee_id: inviteeId, codigo: ind.codigo });
    if (bonus > 0) this.bus.emitir('referral_bonus_creditado', { referrer_id: ind.referrerId, invitee_id: inviteeId, codigo: ind.codigo, valor: bonus });
    return qualificada;
  }
}
