import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Avaliacao,
  FotosVistoria,
  Protecao,
  Reserva,
  StatusReserva,
  Vistoria,
} from '../models/domain.models';
import { PricingService } from './pricing.service';

/**
 * Reservas e sua máquina de estados (ver README):
 *
 *   pagamento confirmado ──▶ aguardando
 *   aguardando ──(proprietário aceita)──▶ confirmada
 *   aguardando ──(recusa / 12h sem resposta)──▶ recusada
 *   confirmada ──(check-in)──▶ em_andamento
 *   em_andamento ──(check-out)──▶ concluida ──▶ abre avaliação
 *
 * Efeitos financeiros de cada transição são apenas comentados aqui — a
 * captura/liberação real de pagamento fica a cargo de um serviço de
 * pagamentos (fora do escopo deste protótipo).
 */
@Injectable({ providedIn: 'root' })
export class BookingService {
  private pricing = inject(PricingService);
  private seq = 2300;

  private readonly _reservas = signal<Reserva[]>([
    {
      id: 'QP-2291',
      veiculoId: '3',
      locatarioId: 'u1',
      inicio: '2026-08-21',
      fim: '2026-08-24',
      protecao: 'completa',
      status: 'em_andamento',
      valores: this.pricing.calcular(240, 'completa', '2026-08-21', '2026-08-24'),
      avaliada: false,
    },
    {
      id: 'QP-2107',
      veiculoId: '2',
      locatarioId: 'u1',
      inicio: '2026-07-10',
      fim: '2026-07-12',
      protecao: 'basica',
      status: 'concluida',
      valores: this.pricing.calcular(95, 'basica', '2026-07-10', '2026-07-12'),
      avaliada: false,
    },
  ]);

  private readonly _vistorias = signal<Vistoria[]>([]);
  private readonly _avaliacoes = signal<Avaliacao[]>([]);

  readonly reservas = this._reservas.asReadonly();
  readonly avaliacoes = this._avaliacoes.asReadonly();

  reservasDoLocatario(locatarioId: string) {
    return computed(() => this._reservas().filter((r) => r.locatarioId === locatarioId));
  }

  porId(id: string): Reserva | undefined {
    return this._reservas().find((r) => r.id === id);
  }

  /** Cria uma reserva no estado "aguardando" — chamada após o pagamento (valor autorizado, não capturado). */
  criar(params: {
    veiculoId: string;
    locatarioId: string;
    inicio: string;
    fim: string;
    protecao: Protecao;
    diaria: number;
  }): Reserva {
    const valores = this.pricing.calcular(params.diaria, params.protecao, params.inicio, params.fim);
    const reserva: Reserva = {
      id: 'QP-' + ++this.seq,
      veiculoId: params.veiculoId,
      locatarioId: params.locatarioId,
      inicio: params.inicio,
      fim: params.fim,
      protecao: params.protecao,
      status: 'aguardando',
      valores,
      avaliada: false,
    };
    this._reservas.update((lista) => [reserva, ...lista]);
    return reserva;
  }

  transicionar(id: string, status: StatusReserva): void {
    this._reservas.update((lista) => lista.map((r) => (r.id === id ? { ...r, ...{ status } } : r)));
  }

  registrarVistoria(vistoria: Vistoria): void {
    this._vistorias.update((lista) => [...lista, vistoria]);
    if (vistoria.tipo === 'checkin') {
      this.transicionar(vistoria.reservaId, 'em_andamento');
    } else {
      this.transicionar(vistoria.reservaId, 'concluida');
    }
  }

  vistoriaVazia(reservaId: string, tipo: 'checkin' | 'checkout'): Vistoria {
    return {
      reservaId,
      tipo,
      fotos: { frente: false, traseira: false, laterais: false, painel: false },
      km: null,
      combustivel: '3/4',
      observacoes: '',
      criadaEm: new Date().toISOString(),
    };
  }

  contarFotos(fotos: FotosVistoria): number {
    return Object.values(fotos).filter(Boolean).length;
  }

  avaliar(avaliacao: Avaliacao): void {
    this._avaliacoes.update((lista) => [...lista, avaliacao]);
    this._reservas.update((lista) =>
      lista.map((r) => (r.id === avaliacao.reservaId ? { ...r, avaliada: true } : r)),
    );
  }
}
