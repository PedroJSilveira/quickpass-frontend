import { Injectable } from '@angular/core';

export interface ResultadoGateway {
  ok: boolean;
  motivo?: string;
}

/**
 * Adapter do gateway de pagamento com pré-autorização (ponto em aberto §14.3).
 * O mock permite forçar falhas para testar RF12/RF04.
 */
export abstract class PaymentGateway {
  abstract cobrar(reservaId: string, valor: number): Promise<ResultadoGateway>;
  abstract preAutorizar(reservaId: string, valor: number, validaAte: string): Promise<ResultadoGateway>;
  abstract capturar(reservaId: string, valor: number): Promise<ResultadoGateway>;
  abstract liberar(reservaId: string): Promise<ResultadoGateway>;
  abstract estornar(reservaId: string, valor: number): Promise<ResultadoGateway>;
}

@Injectable()
export class MockPaymentGateway extends PaymentGateway {
  /** Mude para `true` (ou use o cartão 0000 na UI) para simular recusa. */
  falharCobranca = false;
  falharPreAutorizacao = false;

  async cobrar(_id: string, _valor: number): Promise<ResultadoGateway> {
    return this.falharCobranca ? { ok: false, motivo: 'Pagamento recusado' } : { ok: true };
  }
  async preAutorizar(_id: string, _valor: number, _validaAte: string): Promise<ResultadoGateway> {
    return this.falharPreAutorizacao ? { ok: false, motivo: 'Limite insuficiente para a caução' } : { ok: true };
  }
  async capturar(): Promise<ResultadoGateway> {
    return { ok: true };
  }
  async liberar(): Promise<ResultadoGateway> {
    return { ok: true };
  }
  async estornar(): Promise<ResultadoGateway> {
    return { ok: true };
  }
}
