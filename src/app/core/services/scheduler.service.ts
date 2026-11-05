import { Injectable } from '@angular/core';

type Job = () => void;

/**
 * Agendador de jobs simulado (expiração de reservas, liberação de caução…).
 * Cada service registra seu job; `tick()` roda todos. Em produção seriam
 * rotinas no backend; aqui um intervalo chama `tick()` (ver app.config).
 */
@Injectable({ providedIn: 'root' })
export class SchedulerService {
  private readonly jobs = new Map<string, Job>();
  private timer: ReturnType<typeof setInterval> | null = null;

  registrar(nome: string, job: Job): void {
    this.jobs.set(nome, job);
  }

  tick(): void {
    this.jobs.forEach((job) => job());
  }

  iniciar(intervaloMs = 15_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), intervaloMs);
  }

  parar(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
