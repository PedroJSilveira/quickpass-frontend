import { Injectable } from '@angular/core';

/**
 * Relógio injetável. Todas as regras com prazo (hold de KYC, expiração de
 * reserva, liberação de caução…) usam este serviço, o que as torna testáveis
 * (`avancar`) sem esperar tempo real.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private offsetMs = 0;

  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  iso(): string {
    return this.now().toISOString();
  }

  /** Soma um intervalo ao "agora" atual e devolve ISO. */
  maisMinutos(min: number): string {
    return new Date(this.now().getTime() + min * 60_000).toISOString();
  }

  maisHoras(horas: number): string {
    return this.maisMinutos(horas * 60);
  }

  /** Avança o relógio (uso em testes / simulação de jobs). */
  avancar(ms: number): void {
    this.offsetMs += ms;
  }

  passou(isoLimite: string | null): boolean {
    return !!isoLimite && this.now().getTime() >= new Date(isoLimite).getTime();
  }
}
