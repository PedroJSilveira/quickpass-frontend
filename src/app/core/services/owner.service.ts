import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { AvailabilityTemplate, Disponibilidade, PreferenciasAnuncio, Reserva, Solicitacao, StatusSolicitacao } from '../models/domain.models';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { diasEntre, formatIsoDate, parseIsoDate, proximoDia } from '../../shared/utils/date.util';
import { ClockService } from './clock.service';
import { DemandService } from './demand.service';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { CatalogService } from './catalog.service';

/** Perfis fictícios de locatários de outros usuários (dados de demonstração). */
const LOCATARIOS_DEMO: Record<string, Solicitacao['locatario']> = {
  u9: { nome: 'Rafael Teixeira', idade: 35, cnhAnos: 11, nota: 4.9, locacoes: 18 },
};

const STATUS_SOLICITACAO: Partial<Record<Reserva['status'], StatusSolicitacao>> = {
  solicitada: 'pendente',
  aprovada: 'aceita',
  rejeitada: 'recusada',
  expirada: 'expirada',
};

/**
 * Operações do lado do proprietário: disponibilidade por veículo e a fila de
 * solicitações (derivada das reservas — fonte única da verdade é o
 * BookingService, RF12).
 */
@Injectable({ providedIn: 'root' })
export class OwnerService {
  private booking = inject(BookingService);
  private auth = inject(AuthService);
  // CatalogService depende de OwnerService (checa agenda): resolvido sob demanda.
  private injector = inject(Injector);
  private bus = inject(EventBusService);
  private config = inject(AppConfigService);
  private clock = inject(ClockService);

  private readonly _disponibilidades = signal<Record<string, Disponibilidade>>({});
  private readonly _template = signal<AvailabilityTemplate | null>(null);
  private readonly _preferencias = signal<Record<string, PreferenciasAnuncio>>({});
  /** Última liberação com um toque por veículo, para o "desfazer" (RF11). */
  private readonly _desfazer = signal<Record<string, { adicionados: string[]; expiraEm: string }>>({});

  readonly template = this._template.asReadonly();
  readonly desfazerDisponivel = this._desfazer.asReadonly();

  /** Solicitações recebidas; o id é o da própria reserva. */
  readonly solicitacoes = computed<Solicitacao[]>(() =>
    this.booking
      .reservas()
      .filter((r) => r.status in STATUS_SOLICITACAO)
      .map((r) => this.paraSolicitacao(r)),
  );

  /** Solicitações aguardando resposta do proprietário. */
  readonly solicitacoesPendentes = computed(() => this.solicitacoes().filter((s) => s.status === 'pendente'));

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

  /**
   * Todos os dias estão liberados? Veículo cuja agenda nunca foi configurada
   * é tratado como aberto (catálogo de demonstração); com agenda configurada,
   * cada dia precisa estar explicitamente liberado.
   */
  diasLiberados(veiculoId: string, dias: string[]): boolean {
    const d = this._disponibilidades()[veiculoId];
    if (!d) return true;
    return dias.length > 0 && dias.every((iso) => d.dias[iso] === true);
  }

  aceiteAutomatico(veiculoId: string): boolean {
    return this._disponibilidades()[veiculoId]?.aceiteAutomatico ?? false;
  }

  /** Publicar agenda/veículo exige KYC aprovado (RF02). */
  podePublicar(): boolean {
    return this.auth.verificarExpiracao();
  }

  alternarDia(veiculoId: string, iso: string): void {
    this.exigirKyc();
    this._disponibilidades.update((mapa) => {
      const atual = mapa[veiculoId] ?? this.disponibilidadeDoVeiculo(veiculoId);
      return {
        ...mapa,
        [veiculoId]: { ...atual, dias: { ...atual.dias, [iso]: !atual.dias[iso] } },
      };
    });
  }

  salvarDisponibilidade(disponibilidade: Disponibilidade, origem: 'calendario' | 'notificacao' = 'calendario'): void {
    this.exigirKyc();
    const antes = this.disponibilidadeDoVeiculo(disponibilidade.veiculoId).dias;
    const novos = Object.keys(disponibilidade.dias).filter((d) => disponibilidade.dias[d] && !antes[d]).length;
    this._disponibilidades.update((mapa) => ({ ...mapa, [disponibilidade.veiculoId]: disponibilidade }));
    if (novos > 0) this.bus.emitir('agenda_aberta', { vehicle_id: disponibilidade.veiculoId, dias_liberados: novos, origem_acao: origem });
  }

  /** Agenda explicitamente configurada (null = nunca configurada, tratada como aberta). */
  agendaConfigurada(veiculoId: string): Disponibilidade | null {
    return this._disponibilidades()[veiculoId] ?? null;
  }

  /** Algum dos dias não está ocupado por reserva/hold? */
  algumDiaLivreDeReserva(veiculoId: string, dias: string[]): boolean {
    return dias.some((d) => !this.booking.temConflito(veiculoId, d, proximoDia(d)));
  }

  // ───────────── RF11 — liberar agenda com um toque ─────────────

  salvarTemplate(t: AvailabilityTemplate): void {
    this._template.set(t);
  }

  /** Dias que o template libera a partir de hoje (apenas futuros/hoje). */
  diasDoTemplate(t: AvailabilityTemplate): string[] {
    const hoje = this.clock.iso().slice(0, 10);
    const limite = t.tipo === 'sexta_a_domingo' ? Math.max(1, t.semanas) * 7 : 14;
    const dias = diasEntre(hoje, formatIsoDate(new Date(parseIsoDate(hoje).getTime() + limite * 86400000)));
    const fimDeSemana = dias.filter((d) => [5, 6, 0].includes(parseIsoDate(d).getDay()));
    if (t.tipo === 'sexta_a_domingo') return fimDeSemana;
    // próximo fim de semana: primeiro grupo consecutivo
    const grupo: string[] = [];
    for (const d of fimDeSemana) {
      if (grupo.length && d !== proximoDia(grupo[grupo.length - 1])) break;
      grupo.push(d);
    }
    return grupo;
  }

  /** O que seria liberado e o que impede a publicação (mostrado antes de confirmar). */
  previaUmToque(veiculoId: string): { dias: string[]; motivos: string[] } {
    const t = this._template();
    if (!t) return { dias: [], motivos: ['Crie seu template de disponibilidade primeiro.'] };
    const v = this.injector.get(CatalogService).porId(veiculoId);
    const hoje = this.clock.iso().slice(0, 10);
    const dias = this.diasDoTemplate(t);
    const motivos: string[] = [];
    if (!this.podePublicar()) motivos.push('Verificação de identidade (KYC) não aprovada.');
    if (!v || v.status !== 'Aprovado') motivos.push('Veículo inativo ou em análise.');
    if (v?.docValidoAte && v.docValidoAte < hoje) motivos.push('Documentação ou seguro do veículo vencido.');
    if (dias.some((d) => d < hoje)) motivos.push('O template inclui datas no passado.');
    const conflito = dias.filter((d) => this.booking.temConflito(veiculoId, d, proximoDia(d)));
    if (conflito.length) motivos.push(`Conflito com reserva existente em ${conflito.length} dia(s).`);
    if (dias.length === 0) motivos.push('O template não gerou nenhuma data.');
    return { dias, motivos };
  }

  /**
   * Publica as datas do template de uma vez. Aparece imediatamente na busca
   * (a busca lê a mesma agenda) e pode ser desfeito por JANELA_DESFAZER_AGENDA_MIN.
   */
  liberarComUmToque(veiculoId: string, origem: 'um_toque' | 'notificacao' = 'um_toque') {
    const { dias, motivos } = this.previaUmToque(veiculoId);
    if (motivos.length) throw new Error(motivos.join(' '));
    const base = this.disponibilidadeDoVeiculo(veiculoId);
    const adicionados = dias.filter((d) => base.dias[d] !== true);
    const novosDias = { ...base.dias };
    dias.forEach((d) => (novosDias[d] = true));
    this._disponibilidades.update((m) => ({ ...m, [veiculoId]: { ...base, dias: novosDias } }));
    this._desfazer.update((m) => ({ ...m, [veiculoId]: { adicionados, expiraEm: this.clock.maisMinutos(this.config.get('JANELA_DESFAZER_AGENDA_MIN')) } }));
    this.bus.emitir('agenda_aberta', { vehicle_id: veiculoId, dias_liberados: adicionados.length, origem_acao: origem });
    return { dias, adicionados, recompensa: this.recompensa(veiculoId) };
  }

  /** Recompensa pós-liberação: solicitações reais + buscas compatíveis (7d) ou "dados insuficientes" — sempre como dado, nunca promessa de receita. */
  recompensa(veiculoId: string): { solicitacoesRecebidas: number; buscasCompativeis: number | null } {
    const v = this.injector.get(CatalogService).porId(veiculoId);
    const d = v ? this.injector.get(DemandService).demanda(v.local) : null;
    return {
      solicitacoesRecebidas: this.booking.reservas().filter((r) => r.veiculoId === veiculoId && r.status !== 'aguardando_kyc').length,
      buscasCompativeis: d?.suficiente ? d.buscas : null,
    };
  }

  /** Desfaz a última liberação se ainda dentro da janela e sem reserva criada nesses dias. */
  desfazer(veiculoId: string): void {
    const snap = this._desfazer()[veiculoId];
    if (!snap) throw new Error('Não há liberação para desfazer.');
    if (this.clock.passou(snap.expiraEm)) throw new Error('O prazo para desfazer terminou.');
    if (snap.adicionados.some((d) => this.booking.temConflito(veiculoId, d, proximoDia(d)))) {
      throw new Error('Já existe reserva criada nesses dias: não é possível desfazer.');
    }
    this._disponibilidades.update((m) => {
      const atual = m[veiculoId];
      const dias = { ...atual.dias };
      snap.adicionados.forEach((d) => (dias[d] = false));
      return { ...m, [veiculoId]: { ...atual, dias } };
    });
    this._desfazer.update((m) => {
      const { [veiculoId]: _, ...resto } = m;
      return resto;
    });
    this.bus.emitir('agenda_desfeita', { vehicle_id: veiculoId, dias_removidos: snap.adicionados.length });
  }

  // ───────────── RF17 — preferências e histórico (investimento) ─────────────

  preferencias(veiculoId: string): PreferenciasAnuncio {
    return this._preferencias()[veiculoId] ?? { antecedenciaMinimaHoras: 0, duracaoMinimaDias: 1 };
  }

  salvarPreferencias(veiculoId: string, p: PreferenciasAnuncio): void {
    this._preferencias.update((m) => ({ ...m, [veiculoId]: p }));
  }

  /** Aplica as preferências salvas a uma nova reserva (lança erro claro se não atender). */
  validarPreferencias(veiculoId: string, inicio: string, fim: string): void {
    const p = this.preferencias(veiculoId);
    if (p.antecedenciaMinimaHoras <= 0 && p.duracaoMinimaDias <= 1) return;
    const horas = (new Date(inicio + 'T00:00:00').getTime() - this.clock.now().getTime()) / 3600_000;
    if (p.antecedenciaMinimaHoras > 0 && horas < p.antecedenciaMinimaHoras) throw new Error(`O proprietário exige antecedência mínima de ${p.antecedenciaMinimaHoras}h.`);
    const dias = diasEntre(inicio, fim).length;
    if (dias < p.duracaoMinimaDias) throw new Error(`O proprietário exige no mínimo ${p.duracaoMinimaDias} diária(s).`);
  }

  /** Sugestão de datas pelo histórico: próximos dias nos dias da semana mais alugados e ainda não liberados. */
  sugerirDatas(veiculoId: string, quantidade = 4): string[] {
    const historico = this.booking
      .reservas()
      .filter((r) => r.veiculoId === veiculoId && ['confirmada', 'em_andamento', 'em_disputa', 'concluida'].includes(r.status));
    const freq = new Map<number, number>();
    for (const r of historico) for (const d of diasEntre(r.inicio, r.fim)) freq.set(parseIsoDate(d).getDay(), (freq.get(parseIsoDate(d).getDay()) ?? 0) + 1);
    if (freq.size === 0) return [];
    const topo = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([dow]) => dow);
    const hoje = this.clock.iso().slice(0, 10);
    const atual = this.disponibilidadeDoVeiculo(veiculoId).dias;
    const candidatos = diasEntre(hoje, formatIsoDate(new Date(parseIsoDate(hoje).getTime() + 28 * 86400000)));
    return candidatos.filter((d) => topo.includes(parseIsoDate(d).getDay()) && atual[d] !== true).slice(0, quantidade);
  }

  aceitar(reservaId: string): void {
    this.booking.aprovar(reservaId);
  }

  recusar(reservaId: string): void {
    this.booking.rejeitar(reservaId);
  }

  veiculoTitulo(veiculoId: string): string {
    return this.injector.get(CatalogService).porId(veiculoId)?.titulo ?? 'Veículo';
  }

  proprietarioDoVeiculo(veiculoId: string): string | null {
    return this.injector.get(CatalogService).porId(veiculoId)?.proprietarioId ?? null;
  }

  private exigirKyc(): void {
    if (!this.podePublicar()) throw new Error('Verificação de identidade (KYC) pendente: não é possível publicar agenda.');
  }

  private paraSolicitacao(r: Reserva): Solicitacao {
    const conta = this.auth.conta();
    const locatario =
      r.locatarioId === conta.id
        ? {
            nome: conta.nome,
            idade: 34,
            cnhAnos: conta.cnhAnos,
            nota: conta.nota,
            locacoes: this.booking.reservas().filter((x) => x.locatarioId === conta.id && x.status === 'concluida').length,
          }
        : (LOCATARIOS_DEMO[r.locatarioId] ?? { nome: 'Locatário', idade: 30, cnhAnos: 5, nota: 4.5, locacoes: 0 });
    return {
      id: r.id,
      reservaId: r.id,
      veiculoId: r.veiculoId,
      locatario,
      inicio: r.inicio,
      fim: r.fim,
      diaria: r.valores.diaria,
      finalidade: r.finalidade ?? 'Não informada',
      status: STATUS_SOLICITACAO[r.status] ?? 'pendente',
      expiraEm: r.aprovacaoExpiraEm ?? r.holdExpiraEm ?? r.criadaEm,
    };
  }
}
