import { Injectable, signal } from '@angular/core';
import { AuditEntry } from '../models/domain.models';

/** Trilha de auditoria de transições de reserva, caução, disputa e pagamento (RNF02). */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly _trilha = signal<AuditEntry[]>([]);
  readonly trilha = this._trilha.asReadonly();

  registrar(entry: Omit<AuditEntry, 'em'>): void {
    this._trilha.update((l) => [...l, { ...entry, em: new Date().toISOString() }]);
  }

  daEntidade(entidade: AuditEntry['entidade'], id: string): AuditEntry[] {
    return this._trilha().filter((e) => e.entidade === entidade && e.entidadeId === id);
  }
}
