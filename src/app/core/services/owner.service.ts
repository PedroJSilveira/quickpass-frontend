import { Injectable, signal } from '@angular/core';
import { Disponibilidade, Solicitacao } from '../models/domain.models';
import { BookingService } from './booking.service';

/**
 * Operações do lado do proprietário: disponibilidade por veículo e a fila
 * de solicitações de locação recebidas (aceitar/recusar).
 */
@Injectable({ providedIn: 'root' })
export class OwnerService {
  constructor(private booking: BookingService) {}

  private readonly _disponibilidades = signal<Record<string, Disponibilidade>>({});

  private readonly _solicitacoes = signal<Solicitacao[]>([
    {
      id: 'S-1',
      reservaId: 'QP-2291',
      veiculoId: '1',
      locatario: { nome: 'Rafael Teixeira', idade: 35, cnhAnos: 11, nota: 4.9, locacoes: 18 },
      inicio: '2026-09-12',
      fim: '2026-09-14',
      diaria: 180,
      finalidade: 'Viagem de trabalho',
      status: 'pendente',
      expiraEm: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    },
  ]);

  readonly solicitacoes = this._solicitacoes.asReadonly();

  disponibilidadeDoVeiculo(veiculoId: string): Disponibilidade {
    const existente = this._disponibilidades()[veiculoId];
    if (existente) return existente;

    // Gera um calendário-base de 28 dias (padrão: liberado de qui a dom).
    const dias: Record<string, boolean> = {};
    const base = new Date();
    for (let i = 0; i < 28; i++) {
      const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const iso = dt.toISOString().slice(0, 10);
      dias[iso] = dt.getDay() >= 4 || dt.getDay() === 0;
    }
    return { veiculoId, dias, aceiteAutomatico: false };
  }

  alternarDia(veiculoId: string, iso: string): void {
    this._disponibilidades.update((mapa) => {
      const atual = mapa[veiculoId] ?? this.disponibilidadeDoVeiculo(veiculoId);
      return {
        ...mapa,
        [veiculoId]: { ...atual, dias: { ...atual.dias, [iso]: !atual.dias[iso] } },
      };
    });
  }

  salvarDisponibilidade(disponibilidade: Disponibilidade): void {
    this._disponibilidades.update((mapa) => ({ ...mapa, [disponibilidade.veiculoId]: disponibilidade }));
  }

  aceitar(solicitacaoId: string): void {
    const solicitacao = this._solicitacoes().find((s) => s.id === solicitacaoId);
    this._solicitacoes.update((lista) =>
      lista.map((s) => (s.id === solicitacaoId ? { ...s, status: 'aceita' } : s)),
    );
    if (solicitacao) this.booking.transicionar(solicitacao.reservaId, 'confirmada');
  }

  recusar(solicitacaoId: string): void {
    const solicitacao = this._solicitacoes().find((s) => s.id === solicitacaoId);
    this._solicitacoes.update((lista) =>
      lista.map((s) => (s.id === solicitacaoId ? { ...s, status: 'recusada' } : s)),
    );
    if (solicitacao) this.booking.transicionar(solicitacao.reservaId, 'recusada');
  }
}
