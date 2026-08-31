import { Injectable, computed, signal } from '@angular/core';
import { Conta, Kyc, Papel } from '../models/domain.models';

/**
 * Conta e sessão do usuário: cadastro, papel ativo (locatário/proprietário)
 * e progresso de verificação (KYC). Em produção isto conversa com um
 * serviço de identidade/JWT — aqui mantemos o estado em memória via signals,
 * já modelado para ser plugado num HttpClient depois.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _conta = signal<Conta>({
    id: 'u1',
    nome: 'Mariana Souza',
    email: 'mariana.souza@example.com',
    cpf: '',
    papel: 'locatario',
    kyc: { doc: false, cnh: false, selfie: false, banco: false, aprovado: false },
    nota: 4.8,
    cnhAnos: 6,
    membroDesde: '2025-03-01',
  });

  readonly conta = this._conta.asReadonly();

  readonly papelAtivo = computed(() => this._conta().papel);

  readonly itensKycConcluidos = computed(() => {
    const { doc, cnh, selfie, banco } = this._conta().kyc;
    return [doc, cnh, selfie, banco].filter(Boolean).length;
  });

  readonly contaVerificada = computed(() => this.itensKycConcluidos() === 4);

  cadastrar(dados: { nome: string; email: string; cpf: string; papel: Papel }): void {
    this._conta.update((c) => ({ ...c, ...dados }));
  }

  alternarPapel(papel: Papel): void {
    this._conta.update((c) => ({ ...c, papel }));
  }

  enviarItemKyc(item: keyof Kyc): void {
    this._conta.update((c) => {
      const kyc = { ...c.kyc, [item]: true };
      const aprovado = kyc.doc && kyc.cnh && kyc.selfie && kyc.banco;
      return { ...c, kyc: { ...kyc, aprovado } };
    });
  }
}
