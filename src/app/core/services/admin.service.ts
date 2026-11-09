import { Injectable, inject } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapVeiculo } from '../api/mappers';
import { Veiculo } from '../models/domain.models';

export interface Guardrail {
  numerador: number;
  denominador: number;
  pct: number;
  meta: number;
  violado: boolean;
}
export interface Metricas {
  northStar: { semana: string; locacoes: number; gmvLiquido: number }[];
  guardrailDisputa: Guardrail;
  guardrailChurnSilencioso: Guardrail;
  retornoEspontaneoLocatario: RetornoEspontaneo;
  retornoEspontaneoProprietario: RetornoEspontaneo;
}
export interface RetornoEspontaneo {
  sessoes: number;
  espontaneas: number;
  notificadas: number;
  pct: number;
}
export interface LinhaFunil {
  canal: string;
  aquisicao: number;
  ativacaoLocatario: number;
  ativacaoProprietario: number;
  marcoAgendaAberta: number;
  receita: number;
  recomendacao: number;
  taxaAtivacaoLocatario: number;
}
export interface Coorte {
  coorte: number;
  granularidade: string;
  tamanho: number;
  espontanea: number[];
  notificada: number[];
}
export interface Experimento {
  estado: { hipotese: string; gasto: number; orcamento: number; encerradoPor: string | null };
  ativo: boolean;
  resultado: { linhas: { grupo: string; atribuidos: number; ativados: number; taxaAtivacao: number }[]; diferencaPontos: number };
}

/** Operação da plataforma (somente admin): moderação de veículos e métricas. Disputas ficam no DisputeService. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = inject(ApiService);

  async veiculos(status: 'EM_ANALISE' | 'APROVADO' | 'RECUSADO'): Promise<Veiculo[]> {
    return (await this.api.get<any[]>('/admin/veiculos', { status })).map(mapVeiculo);
  }
  async aprovarVeiculo(id: string): Promise<void> {
    await this.api.post(`/admin/veiculos/${id}/aprovar`);
  }
  async recusarVeiculo(id: string, motivo: string): Promise<void> {
    await this.api.post(`/admin/veiculos/${id}/recusar`, { motivo });
  }

  metricas(): Promise<Metricas> {
    return this.api.get('/admin/metricas');
  }
  funil(): Promise<LinhaFunil[]> {
    return this.api.get('/admin/metricas/funil');
  }
  retencao(papel: 'LOCATARIO' | 'PROPRIETARIO'): Promise<Coorte[]> {
    return this.api.get('/admin/metricas/retencao', { papel });
  }
  experimento(): Promise<Experimento> {
    return this.api.get('/admin/experimento');
  }
}
