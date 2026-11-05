import { Injectable, inject } from '@angular/core';
import { PapelEvento } from '../models/domain.models';
import { EventBusService, EventoAnalitico } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { semanaIso } from '../../shared/utils/date.util';
import { BookingService } from './booking.service';
import { DepositService } from './deposit.service';
import { DisputeService } from './dispute.service';
import { SupplyHealthService } from './supply-health.service';

export interface LinhaNorthStar {
  semana: string;
  locacoes: number;
  gmvLiquido: number;
}

export interface Guardrail {
  numerador: number;
  denominador: number;
  pct: number;
  meta: number;
  violado: boolean;
}

const MS_SEMANA = 7 * 24 * 3600_000;
const EPOCH_SEG = Date.UTC(1970, 0, 5); // uma segunda-feira

/**
 * Métricas do documento (§8): North Star, guardrails e funil AARRR
 * computáveis a partir de reservas, pagamentos e eventos analíticos.
 */
@Injectable({ providedIn: 'root' })
export class MetricsService {
  private bus = inject(EventBusService);
  private config = inject(AppConfigService);
  private booking = inject(BookingService);
  private deposit = inject(DepositService);
  private dispute = inject(DisputeService);
  private supply = inject(SupplyHealthService);

  // ───────────── North Star (8.1) ─────────────

  /**
   * Transação elegível: CONCLUIDA, pagamento finalizado, sem estorno total,
   * caução resolvida. Período: semana ISO pela data de conclusão. Estorno
   * parcial conta; o GMV usa o valor líquido.
   */
  private elegiveis() {
    return this.booking.reservas().filter((r) => {
      if (r.status !== 'concluida' || !this.deposit.resolvida(r.id)) return false;
      const p = this.booking.pagamentoDaReserva(r.id);
      return !!p && (p.status === 'finalizado' || p.status === 'estornado_parcial');
    });
  }

  northStar(): LinhaNorthStar[] {
    const porSemana = new Map<string, LinhaNorthStar>();
    for (const r of this.elegiveis()) {
      const semana = semanaIso(r.concluidaEm ?? r.criadaEm);
      const p = this.booking.pagamentoDaReserva(r.id)!;
      const l = porSemana.get(semana) ?? { semana, locacoes: 0, gmvLiquido: 0 };
      l.locacoes += 1;
      l.gmvLiquido += p.total - p.estornado;
      porSemana.set(semana, l);
    }
    return [...porSemana.values()].sort((a, b) => a.semana.localeCompare(b.semana));
  }

  // ───────────── Guardrails (8.2) ─────────────

  /** Locações concluídas com disputa aberta ou sinistro / locações concluídas (na semana, ou no total). */
  guardrailDisputa(semana?: string): Guardrail {
    const concluidas = this.booking.reservas().filter((r) => r.status === 'concluida' && (!semana || semanaIso(r.concluidaEm ?? r.criadaEm) === semana));
    const comDisputa = concluidas.filter((r) => !!this.dispute.daReserva(r.id)).length;
    return this.guardrail(comDisputa, concluidas.length, this.config.get('META_GUARDRAIL_DISPUTA'));
  }

  guardrailChurnSilencioso(): Guardrail {
    const g = this.supply.guardrailChurn();
    return this.guardrail(g.numerador, g.denominador, this.config.get('META_GUARDRAIL_CHURN_SILENCIOSO'));
  }

  private guardrail(numerador: number, denominador: number, meta: number): Guardrail {
    const pct = denominador ? (numerador / denominador) * 100 : 0;
    return { numerador, denominador, pct, meta, violado: denominador > 0 && pct >= meta };
  }

  // ───────────── Funil AARRR (8.3) ─────────────

  private eventos(nome: string): EventoAnalitico[] {
    return this.bus.eventos().filter((e) => e.event_name === nome);
  }

  /** Funil por canal de origem (RF08/RF15). */
  funilPorCanal() {
    const cadastros = this.eventos('cadastro_concluido');
    const canalDe = new Map<string, string>();
    cadastros.forEach((e) => canalDe.set(String(e.props['user_id'] ?? e.user_id), String(e.props['canal_origem'] ?? 'desconhecido')));
    const transacoes = this.eventos('transacao_concluida');
    const listaram = new Set(this.eventos('veiculo_listado').map((e) => String(e.props['user_id'] ?? e.user_id)));
    const abriram = new Set(this.eventos('agenda_aberta').map((e) => e.user_id));
    const qualificadas = this.eventos('referral_qualificada');

    const canais = [...new Set(canalDe.values())];
    return canais.map((canal) => {
      const usuarios = [...canalDe.entries()].filter(([, c]) => c === canal).map(([u]) => u);
      const doCanal = (u: unknown) => usuarios.includes(String(u));
      const ativLoc = new Set(transacoes.filter((e) => doCanal(e.props['locatario_id'])).map((e) => String(e.props['locatario_id'])));
      const ativProp = new Set(
        transacoes.filter((e) => doCanal(e.props['owner_id']) && listaram.has(String(e.props['owner_id']))).map((e) => String(e.props['owner_id'])),
      );
      const receita = transacoes
        .filter((e) => doCanal(e.props['locatario_id']))
        .reduce((t, e) => t + Number(e.props['taxa_plataforma'] ?? 0) - Number(e.props['desconto'] ?? 0), 0);
      return {
        canal,
        aquisicao: usuarios.length,
        ativacaoLocatario: ativLoc.size,
        ativacaoProprietario: ativProp.size,
        marcoAgendaAberta: usuarios.filter((u) => abriram.has(u)).length,
        receita,
        recomendacao: qualificadas.filter((e) => doCanal(e.props['referrer_id'])).length,
        taxaAtivacaoLocatario: usuarios.length ? (ativLoc.size / usuarios.length) * 100 : 0,
      };
    });
  }

  // ───────────── Retenção e retorno espontâneo (RF15, 8.3/8.4) ─────────────

  private indicePeriodo(iso: string, granularidade: 'semana' | 'mes'): number {
    const d = new Date(iso);
    return granularidade === 'semana' ? Math.floor((d.getTime() - EPOCH_SEG) / MS_SEMANA) : d.getUTCFullYear() * 12 + d.getUTCMonth();
  }

  /**
   * Retenção por coorte (semana de cadastro para proprietário; mês para
   * locatário) separando retorno ESPONTÂNEO de NOTIFICADO. `espontanea[k-1]`
   * = % da coorte com sessão espontânea no período k após o cadastro.
   */
  retencaoPorCoorte(papel: 'locatario' | 'proprietario', periodos = 4) {
    const granularidade = papel === 'proprietario' ? 'semana' : 'mes';
    const cadastros = this.eventos('cadastro_concluido').map((e) => ({ user: String(e.props['user_id'] ?? e.user_id), idx: this.indicePeriodo(e.timestamp, granularidade) }));
    const sessoes = this.eventos('sessao_iniciada').filter((e) => e.papel === papel);
    const coortes = [...new Set(cadastros.map((c) => c.idx))].sort((a, b) => a - b);

    return coortes.map((idx) => {
      const membros = cadastros.filter((c) => c.idx === idx).map((c) => c.user);
      const pct = (k: number, espontanea: boolean) => {
        const voltaram = new Set(
          sessoes
            .filter((s) => membros.includes(String(s.user_id)) && this.indicePeriodo(s.timestamp, granularidade) === idx + k && Boolean(s.props['retorno_espontaneo']) === espontanea)
            .map((s) => s.user_id),
        );
        return membros.length ? (voltaram.size / membros.length) * 100 : 0;
      };
      const ks = Array.from({ length: periodos }, (_, i) => i + 1);
      return { coorte: idx, granularidade, tamanho: membros.length, espontanea: ks.map((k) => pct(k, true)), notificada: ks.map((k) => pct(k, false)) };
    });
  }

  /** % de sessões com retorno espontâneo (sem abertura de notificação atribuída). */
  retornoEspontaneo(papel: PapelEvento) {
    const sessoes = this.eventos('sessao_iniciada').filter((e) => e.papel === papel);
    const espontaneas = sessoes.filter((e) => e.props['retorno_espontaneo']).length;
    return { sessoes: sessoes.length, espontaneas, notificadas: sessoes.length - espontaneas, pct: sessoes.length ? (espontaneas / sessoes.length) * 100 : 0 };
  }
}
