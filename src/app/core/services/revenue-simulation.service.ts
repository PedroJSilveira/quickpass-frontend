import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';

export interface SimulacaoReceita {
  regiao: string;
  suficiente: boolean;
  premissas: { precoMedioDiaria: number; diasIndisponiveis: number; taxaOcupacao: number; amostra: number; janelaDias: number };
  /** Projeção (estimativa). `null` quando não há amostra regional suficiente. */
  projecao: number | null;
  solicitacoesRecebidas: number;
  locacoesConcluidas: number;
  valorRecebido: number;
}

/** Simulação de Receita Potencial (RF05): calculada no servidor, com premissas visíveis. */
@Injectable({ providedIn: 'root' })
export class RevenueSimulationService {
  private api = inject(ApiService);

  simular(veiculoId: string): Promise<SimulacaoReceita> {
    return this.api.get<SimulacaoReceita>(`/proprietario/veiculos/${veiculoId}/simulacao-receita`);
  }
}
