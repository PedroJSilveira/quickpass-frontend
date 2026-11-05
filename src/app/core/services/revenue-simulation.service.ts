import { Injectable, inject } from '@angular/core';
import { EventBusService } from '../analytics/event-bus.service';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { CatalogService } from './catalog.service';
import { ClockService } from './clock.service';
import { DemandService } from './demand.service';
import { OwnerService } from './owner.service';
import { PayoutService } from './payout.service';
import { diasEntre, formatIsoDate, parseIsoDate } from '../../shared/utils/date.util';

const JANELA_DIAS = 28;

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

/**
 * Simulação de Receita Potencial (RF05): projeção com premissas visíveis,
 * mostrada SEPARADAMENTE de solicitações, locações concluídas e valor
 * efetivamente recebido. Sem amostra mínima regional: "dados insuficientes".
 *   receita_potencial = preço_médio_diária_região × dias_indisponíveis × taxa_ocupação_observada_região
 */
@Injectable({ providedIn: 'root' })
export class RevenueSimulationService {
  private catalog = inject(CatalogService);
  private booking = inject(BookingService);
  private owner = inject(OwnerService);
  private demand = inject(DemandService);
  private payout = inject(PayoutService);
  private clock = inject(ClockService);
  private bus = inject(EventBusService);
  private auth = inject(AuthService);

  simular(veiculoId: string): SimulacaoReceita | null {
    const v = this.catalog.porId(veiculoId);
    if (!v) return null;
    const regiao = v.local;
    const daRegiao = this.catalog.veiculos().filter((x) => x.local === regiao && x.status === 'Aprovado');
    const precoMedioDiaria = daRegiao.reduce((t, x) => t + x.diaria, 0) / (daRegiao.length || 1);

    const hoje = this.clock.iso().slice(0, 10);
    const agenda = this.owner.agendaConfigurada(veiculoId);
    const dias = diasEntre(hoje, formatIsoDate(new Date(parseIsoDate(hoje).getTime() + JANELA_DIAS * 86400000)));
    const diasIndisponiveis = agenda ? dias.filter((d) => agenda.dias[d] === false || agenda.dias[d] === undefined).length : 0;

    // Taxa de ocupação observada: diárias efetivamente reservadas na região / (veículos × janela).
    const janelaIni = formatIsoDate(new Date(parseIsoDate(hoje).getTime() - (JANELA_DIAS / 2) * 86400000));
    const janelaFim = formatIsoDate(new Date(parseIsoDate(hoje).getTime() + (JANELA_DIAS / 2) * 86400000));
    const ids = new Set(daRegiao.map((x) => x.id));
    const diasReservados = this.booking
      .reservas()
      .filter((r) => ids.has(r.veiculoId) && ['confirmada', 'em_andamento', 'em_disputa', 'concluida'].includes(r.status))
      .reduce((t, r) => t + diasEntre(r.inicio < janelaIni ? janelaIni : r.inicio, r.fim > janelaFim ? janelaFim : r.fim).length, 0);
    const taxaOcupacao = Math.min(1, diasReservados / ((daRegiao.length || 1) * JANELA_DIAS));

    const d = this.demand.demanda(regiao);
    const reservasDoVeiculo = this.booking.reservas().filter((r) => r.veiculoId === veiculoId);
    const concluidas = reservasDoVeiculo.filter((r) => r.status === 'concluida');
    const valorRecebido = concluidas.reduce((t, r) => {
      const rep = this.payout.daReserva(r.id);
      return t + (rep?.status === 'Pago' ? rep.liquido : 0);
    }, 0);

    const resultado: SimulacaoReceita = {
      regiao,
      suficiente: d.suficiente,
      premissas: { precoMedioDiaria, diasIndisponiveis, taxaOcupacao, amostra: d.amostra, janelaDias: JANELA_DIAS },
      projecao: d.suficiente ? precoMedioDiaria * diasIndisponiveis * taxaOcupacao : null,
      solicitacoesRecebidas: reservasDoVeiculo.filter((r) => r.status !== 'aguardando_kyc').length,
      locacoesConcluidas: concluidas.length,
      valorRecebido,
    };
    this.bus.emitir('simulacao_receita_visualizada', { user_id: this.auth.conta().id, vehicle_id: veiculoId, dados_suficientes: resultado.suficiente });
    return resultado;
  }
}
