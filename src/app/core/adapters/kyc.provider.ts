import { Injectable } from '@angular/core';
import { Kyc } from '../models/domain.models';

export interface ResultadoKyc {
  status: 'APROVADO' | 'REPROVADO';
  /** Validade do documento (CNH) — o KYC expira junto (RF02). */
  validadeCnh: string;
}

/**
 * Adapter do provedor externo de KYC/biometria (ponto em aberto §14.3).
 * Troque o `useClass` em app.config quando o provedor real for definido.
 */
export abstract class KycProvider {
  abstract analisar(userId: string, itens: Kyc): Promise<ResultadoKyc>;
}

@Injectable()
export class MockKycProvider extends KycProvider {
  async analisar(_userId: string, _itens: Kyc): Promise<ResultadoKyc> {
    const validade = new Date();
    validade.setFullYear(validade.getFullYear() + 3);
    return { status: 'APROVADO', validadeCnh: validade.toISOString().slice(0, 10) };
  }
}
