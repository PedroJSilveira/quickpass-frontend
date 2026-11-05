import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../config/app-config.service';
import { EventBusService } from '../analytics/event-bus.service';
import { AgendaReminderService } from './agenda-reminder.service';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { CatalogService } from './catalog.service';
import { ClockService } from './clock.service';
import { ConsentService } from './consent.service';
import { DemandService } from './demand.service';
import { LocalDemandAlertService } from './local-demand-alert.service';
import { NotificationService } from './notification.service';
import { OwnerService } from './owner.service';
import { ReviewService } from './review.service';
import { RevenueSimulationService } from './revenue-simulation.service';
import { SavedSearchService } from './saved-search.service';
import { SchedulerService } from './scheduler.service';
import { aprovarKyc, clockMais, configurarTestBed, diasLiberadosAte, hojeMais } from '../testing/test-helpers';


describe('RF14 — Busca salva e Radar (BDD 9.4)', () => {
  let saved: SavedSearchService;
  let notifications: NotificationService;
  const salvar = (extra: Partial<Parameters<SavedSearchService['salvar']>[0]> = {}) =>
    saved.salvar({ regiao: 'Zona Sul', raioKm: 10, inicio: hojeMais(20), fim: hojeMais(22), categoria: 'Hatch', precoMax: null, alertasAtivos: true, canalConsentido: true, ...extra });

  beforeEach(() => {
    configurarTestBed();
    saved = TestBed.inject(SavedSearchService);
    notifications = TestBed.inject(NotificationService);
  });

  it('envia alerta com link direto quando há veículo realmente disponível', () => {
    const b = salvar();
    saved.verificarMatches();
    const n = notifications.notificacoes()[0];
    expect(n.tipo).toBe('radar');
    expect(n.link).toContain('/carros/2');
    expect(n.motivoDados['saved_search_id']).toBe(b.id);
    expect(TestBed.inject(EventBusService).contar('radar_alerta_enviado')).toBe(1);
  });

  it('sem correspondência real, nenhum alerta é enviado', () => {
    salvar({ categoria: 'Elétrico' }); // não há elétrico na Zona Sul
    saved.verificarMatches();
    expect(notifications.notificacoes().length).toBe(0);
  });

  it('não alerta quando o veículo está ocupado no período', async () => {
    await aprovarKyc();
    TestBed.inject(BookingService).solicitar({ veiculoId: '2', locatarioId: 'u1', inicio: hojeMais(19), fim: hojeMais(23), protecao: 'basica', diaria: 95 });
    salvar();
    saved.verificarMatches();
    expect(notifications.notificacoes().length).toBe(0);
  });

  it('não repete alerta do mesmo veículo para a mesma busca', () => {
    salvar();
    saved.verificarMatches();
    saved.verificarMatches();
    expect(notifications.notificacoes().length).toBe(1);
  });

  it('pausar ou excluir interrompe os alertas imediatamente', () => {
    const b = salvar();
    saved.pausar(b.id);
    saved.verificarMatches();
    expect(notifications.notificacoes().length).toBe(0);
    saved.pausar(b.id, false);
    saved.excluir(b.id);
    saved.verificarMatches();
    expect(notifications.notificacoes().length).toBe(0);
  });

  it('sem consentimento não há alerta', () => {
    salvar({ canalConsentido: false });
    saved.verificarMatches();
    expect(notifications.notificacoes().length).toBe(0);
  });

  it('os filtros salvos pré-preenchem a próxima busca', () => {
    const b = salvar({ precoMax: 120 });
    saved.aplicar(b.id);
    const f = TestBed.inject(CatalogService).filtros();
    expect([f.local, f.categoria, f.precoMax]).toEqual(['Zona Sul', 'Hatch', 120]);
  });

  it('solicitação vinda do alerta é registrada com origem = radar', async () => {
    await aprovarKyc();
    const catalog = TestBed.inject(CatalogService);
    catalog.origemSolicitacao.set('radar');
    const r = TestBed.inject(BookingService).solicitar({ veiculoId: '2', locatarioId: 'u1', inicio: hojeMais(20), fim: hojeMais(22), protecao: 'basica', diaria: 95 });
    expect(r.origem).toBe('radar');
    expect(TestBed.inject(EventBusService).eventos().find((e) => e.event_name === 'reserva_solicitada')?.props['origem']).toBe('radar');
    expect(catalog.origemSolicitacao()).toBe('busca');
  });
});

describe('RNF03 — notificações responsáveis', () => {
  beforeEach(() => configurarTestBed());

  it('exige consentimento, dado justificativo e respeita o limite global semanal', () => {
    const n = TestBed.inject(NotificationService);
    const consent = TestBed.inject(ConsentService);
    const base = { userId: 'u1', tipo: 'demanda_local' as const, titulo: 't', texto: 'x', motivoDados: { k: 1 } };
    expect(n.enviar(base)).toBeNull(); // sem consentimento
    consent.definir('push', 'marketing', true);
    expect(n.enviar({ ...base, motivoDados: {} })).toBeNull(); // sem dado real
    for (let i = 0; i < 3; i++) expect(n.enviar(base)).not.toBeNull();
    expect(n.enviar(base)).toBeNull(); // LIMITE_NOTIFICACOES_GLOBAL_SEMANA = 3
  });
});

describe('RF06 — avaliação bilateral (BDD 9.7)', () => {
  let reviews: ReviewService;
  const nova = (autorPapel: 'locatario' | 'proprietario', nota: 1 | 2 | 3 | 4 | 5 = 5) =>
    reviews.enviar({ reservaId: 'QP-2107', autorId: autorPapel === 'locatario' ? 'u1' : 'p2', autorPapel, alvoId: autorPapel === 'locatario' ? 'p2' : 'u1', nota, texto: '', selos: [] });

  beforeEach(() => {
    configurarTestBed();
    reviews = TestBed.inject(ReviewService);
  });

  it('nada fica visível antes de as duas partes enviarem ou do prazo expirar', () => {
    nova('locatario');
    expect(reviews.publicadas().length).toBe(0);
    reviews.publicarVencidas();
    expect(reviews.publicadas().length).toBeGreaterThan(0); // QP-2107 concluída há meses: prazo já venceu
  });

  it('publica as duas ao mesmo tempo quando ambas avaliam', () => {
    nova('locatario');
    expect(reviews.publicadas().length).toBe(0);
    nova('proprietario', 4);
    expect(reviews.publicadas().length).toBe(2);
  });

  it('só uma parte avalia: após 72h publica apenas essa, sem penalizar a outra', async () => {
    await aprovarKyc();
    const { concluirLocacao } = await import('../testing/test-helpers');
    const id = await concluirLocacao();
    reviews.enviar({ reservaId: id, autorId: 'u1', autorPapel: 'locatario', alvoId: 'p6', nota: 5, texto: '', selos: [] });
    expect(reviews.publicadas().length).toBe(0);
    reviews.publicarVencidas();
    expect(reviews.publicadas().length).toBe(0); // dentro do prazo
    TestBed.inject(ClockService).avancar(73 * 3600_000);
    reviews.publicarVencidas();
    expect(reviews.publicadas().map((a) => a.autorPapel)).toEqual(['locatario']);
    expect(reviews.reputacaoDoLocatario('u1').total).toBe(0); // ausência do proprietário não vira nota
  });

  it('ninguém avalia: nada é publicado e nenhuma nota negativa é criada', () => {
    reviews.publicarVencidas();
    expect(reviews.publicadas().length).toBe(0);
    expect(reviews.reputacaoDoVeiculo('2')).toEqual({ media: null, total: 0 });
  });

  it('só avalia locação concluída e uma vez por parte', () => {
    expect(() => reviews.enviar({ reservaId: 'QP-2330', autorId: 'u1', autorPapel: 'locatario', alvoId: 'p5', nota: 5, texto: '', selos: [] })).toThrowError(/concluída/);
    nova('locatario');
    expect(() => nova('locatario')).toThrowError(/já avaliou/);
  });

  it('o ranking usa a reputação publicada', () => {
    const catalog = TestBed.inject(CatalogService);
    const antes = reviews.notaParaRanking('2');
    expect(antes).toBe(catalog.porId('2')!.nota!);
    nova('locatario', 1);
    nova('proprietario', 3);
    expect(reviews.notaParaRanking('2')).toBe(1);
  });
});

describe('RF11/RF17 — liberar agenda com um toque e ativos de investimento', () => {
  let owner: OwnerService;
  let bus: EventBusService;

  beforeEach(async () => {
    configurarTestBed();
    owner = TestBed.inject(OwnerService);
    bus = TestBed.inject(EventBusService);
  });

  it('sem template pede para criar; sem KYC bloqueia com motivo', () => {
    expect(owner.previaUmToque('u1-v1').motivos.join()).toContain('template');
    owner.salvarTemplate({ tipo: 'sexta_a_domingo', semanas: 2 });
    expect(owner.previaUmToque('u1-v1').motivos.join()).toContain('KYC');
  });

  describe('com KYC aprovado', () => {
    beforeEach(async () => {
      await aprovarKyc();
      owner.salvarTemplate({ tipo: 'sexta_a_domingo', semanas: 2 });
      owner.salvarDisponibilidade({ veiculoId: 'u1-v1', dias: {}, aceiteAutomatico: false }); // agenda fechada
    });

    it('as datas aparecem imediatamente na busca e o evento registra a origem', () => {
      const catalog = TestBed.inject(CatalogService);
      const { dias } = owner.liberarComUmToque('u1-v1');
      expect(dias.length).toBeGreaterThan(0);
      expect(catalog.estaLivre('u1-v1', dias[0], dias[0].replace(/\d\d$/, (d) => String(Number(d) + 1).padStart(2, '0')))).toBeDefined();
      expect(owner.diasLiberados('u1-v1', dias)).toBeTrue();
      const ev = bus.eventos().filter((e) => e.event_name === 'agenda_aberta').at(-1)!;
      expect(ev.props['origem_acao']).toBe('um_toque');
    });

    it('desfazer remove a disponibilidade dentro da janela', () => {
      const { dias } = owner.liberarComUmToque('u1-v1');
      owner.desfazer('u1-v1');
      expect(owner.diasLiberados('u1-v1', dias)).toBeFalse();
      expect(bus.contar('agenda_desfeita')).toBe(1);
    });

    it('não desfaz fora da janela nem se já existe reserva nos dias', () => {
      const { dias } = owner.liberarComUmToque('u1-v1');
      TestBed.inject(ClockService).avancar(11 * 60_000); // JANELA_DESFAZER_AGENDA_MIN = 10
      expect(() => owner.desfazer('u1-v1')).toThrowError(/prazo/);

      owner.salvarDisponibilidade({ veiculoId: 'u1-v1', dias: {}, aceiteAutomatico: false });
      const out = owner.liberarComUmToque('u1-v1');
      TestBed.inject(BookingService).solicitar({ veiculoId: 'u1-v1', locatarioId: 'u1', inicio: out.adicionados[0], fim: out.adicionados[0].replace(/\d\d$/, (d) => String(Number(d) + 1).padStart(2, '0')), protecao: 'basica', diaria: 180 });
      expect(() => owner.desfazer('u1-v1')).toThrowError(/reserva/);
      expect(dias.length).toBeGreaterThan(0);
    });

    it('bloqueia com motivo: documentação vencida, veículo inativo, conflito', () => {
      const catalog = TestBed.inject(CatalogService);
      catalog.atualizar('u1-v1', { docValidoAte: '2000-01-01' });
      expect(owner.previaUmToque('u1-v1').motivos.join()).toContain('vencido');
      expect(() => owner.liberarComUmToque('u1-v1')).toThrow();
      expect(owner.previaUmToque('u1-v2').motivos.join()).toContain('inativo'); // "Em análise"
      catalog.atualizar('u1-v1', { docValidoAte: undefined });
      const dia = owner.liberarComUmToque('u1-v1').dias[0];
      TestBed.inject(BookingService).solicitar({ veiculoId: 'u1-v1', locatarioId: 'u1', inicio: dia, fim: dia.replace(/\d\d$/, (d) => String(Number(d) + 1).padStart(2, '0')), protecao: 'basica', diaria: 180 });
      expect(owner.previaUmToque('u1-v1').motivos.join()).toContain('Conflito');
    });

    it('recompensa mostra dados reais ou "dados insuficientes" (null), nunca promessa de receita', () => {
      const r = owner.liberarComUmToque('u1-v1').recompensa;
      expect(r.buscasCompativeis).toBe(24); // Centro tem amostra suficiente
      TestBed.inject(AppConfigService).definir('AMOSTRA_MINIMA_REGIAO', 1000);
      expect(owner.recompensa('u1-v1').buscasCompativeis).toBeNull();
    });
  });

  it('RF17: preferências salvas são aplicadas às próximas reservas', async () => {
    await aprovarKyc();
    const booking = TestBed.inject(BookingService);
    owner.salvarPreferencias('1', { antecedenciaMinimaHoras: 24 * 30, duracaoMinimaDias: 1 });
    expect(() => booking.solicitar({ veiculoId: '1', locatarioId: 'u1', inicio: hojeMais(20), fim: hojeMais(22), protecao: 'basica', diaria: 180 })).toThrowError(/antecedência/);
    owner.salvarPreferencias('1', { antecedenciaMinimaHoras: 0, duracaoMinimaDias: 3 });
    expect(() => booking.solicitar({ veiculoId: '1', locatarioId: 'u1', inicio: hojeMais(20), fim: hojeMais(22), protecao: 'basica', diaria: 180 })).toThrowError(/mínimo 3/);
  });

  it('RF17/RF12: aprovação automática só para locatário bem avaliado', async () => {
    await aprovarKyc();
    const booking = TestBed.inject(BookingService);
    owner.salvarDisponibilidade({ veiculoId: '2', dias: diasLiberadosAte(40), aceiteAutomatico: true });
    const a = booking.solicitar({ veiculoId: '2', locatarioId: 'u1', inicio: clockMais(20), fim: clockMais(22), protecao: 'basica', diaria: 95 });
    expect(a.status).toBe('solicitada');
    expect(booking.porId(a.id)?.status).toBe('aprovada'); // nota 4.8 ≥ 4.5
    TestBed.inject(AppConfigService).definir('NOTA_MINIMA_APROVACAO_AUTOMATICA', 4.9);
    const b = booking.solicitar({ veiculoId: '2', locatarioId: 'u1', inicio: clockMais(25), fim: clockMais(27), protecao: 'basica', diaria: 95 });
    expect(booking.porId(b.id)?.status).toBe('solicitada');
  });

  it('RF17: sugere datas pelo histórico de locações', async () => {
    await aprovarKyc();
    owner.salvarDisponibilidade({ veiculoId: '3', dias: {}, aceiteAutomatico: false });
    const s = owner.sugerirDatas('3'); // QP-2291 (sex–dom) no histórico
    expect(s.length).toBeGreaterThan(0);
  });
});

describe('RF05 — Simulação de Receita Potencial', () => {
  let sim: RevenueSimulationService;
  beforeEach(() => {
    configurarTestBed();
    sim = TestBed.inject(RevenueSimulationService);
  });

  it('com amostra suficiente mostra projeção e premissas; sem amostra, "dados insuficientes" (projecao nula)', () => {
    const centro = sim.simular('1')!;
    expect(centro.suficiente).toBeTrue();
    expect(centro.projecao).not.toBeNull();
    expect(centro.premissas.precoMedioDiaria).toBeGreaterThan(0);
    const norte = sim.simular('5')!;
    expect(norte.suficiente).toBeFalse();
    expect(norte.projecao).toBeNull();
  });

  it('mantém separados projeção, solicitações, locações concluídas e valor recebido', () => {
    const s = sim.simular('2')!;
    expect(s.locacoesConcluidas).toBe(1); // QP-2107
    expect(s.valorRecebido).toBe(0); // concluída, mas nenhum repasse pago registrado
    expect(s.solicitacoesRecebidas).toBe(1);
  });

  it('emite simulacao_receita_visualizada com dados_suficientes', () => {
    sim.simular('5');
    const ev = TestBed.inject(EventBusService).eventos().find((e) => e.event_name === 'simulacao_receita_visualizada')!;
    expect(ev.props['dados_suficientes']).toBeFalse();
  });
});

describe('RF07 — lembrete de revisão de agenda (BDD 9.2)', () => {
  let reminder: AgendaReminderService;
  let owner: OwnerService;
  let clock: ClockService;
  let notifications: NotificationService;
  const dia = 24 * 3600_000;

  beforeEach(async () => {
    configurarTestBed();
    reminder = TestBed.inject(AgendaReminderService);
    owner = TestBed.inject(OwnerService);
    clock = TestBed.inject(ClockService);
    notifications = TestBed.inject(NotificationService);
    await aprovarKyc();
    owner.salvarDisponibilidade({ veiculoId: '3', dias: {}, aceiteAutomatico: false }); // Aeroporto: agenda totalmente fechada
    TestBed.inject(ConsentService).definir('push', 'marketing', true);
  });

  it('proprietário realmente sem oferta há 15 dias recebe o lembrete (sem números se faltar dado regional)', () => {
    reminder.executar();
    expect(notifications.notificacoes().length).toBe(0); // ainda não completou 15 dias
    clock.avancar(16 * dia);
    expect(reminder.executar()).toBe(1);
    const n = notifications.notificacoes()[0];
    expect(n.tipo).toBe('revisao_agenda');
    expect(n.texto).not.toMatch(/perdid|garantid/i);
    expect(n.texto).not.toContain('buscas compatíveis'); // Aeroporto: amostra insuficiente
    expect(n.motivoDados['vehicle_id']).toBe('3');
  });

  it('inclui a estimativa de demanda como dado/projeção quando há amostra suficiente', () => {
    owner.salvarDisponibilidade({ veiculoId: '1', dias: {}, aceiteAutomatico: false }); // Centro
    reminder.executar();
    clock.avancar(16 * dia);
    const demand = TestBed.inject(DemandService);
    for (let i = 0; i < 25; i++) demand.registrarBusca({ regiao: 'Centro', categoria: 'Todos', inicio: '', fim: '' });
    reminder.executar();
    const n = notifications.notificacoes().find((x) => x.motivoDados['vehicle_id'] === '1')!;
    expect(n.texto).toContain('25 buscas compatíveis');
    expect(n.texto).toContain('projeção');
    expect(n.texto).not.toMatch(/perdid|garantid/i);
  });

  it('agenda aberta nos próximos 14 dias nunca recebe o aviso, mesmo sem editar há 20 dias', () => {
    clock.avancar(20 * dia);
    owner.salvarDisponibilidade({ veiculoId: '3', dias: diasLiberadosAte(14), aceiteAutomatico: false });
    expect(reminder.executar()).toBe(0);
    expect(notifications.notificacoes().length).toBe(0);
  });

  it('sem consentimento nenhum envio', () => {
    TestBed.inject(ConsentService).definir('push', 'marketing', false);
    reminder.executar();
    clock.avancar(16 * dia);
    expect(reminder.executar()).toBe(0);
  });

  it('no máximo 1 aviso por semana e para após MAX_AVISOS_TOTAL', () => {
    reminder.executar();
    clock.avancar(16 * dia);
    expect(reminder.executar()).toBe(1);
    expect(reminder.executar()).toBe(0); // mesma semana
    let total = 1;
    for (let i = 0; i < 6; i++) {
      clock.avancar(8 * dia);
      total += reminder.executar();
    }
    expect(total).toBe(4); // MAX_AVISOS_TOTAL
  });

  it('a régua encerra ao liberar novas datas e quando o proprietário recusa', () => {
    reminder.executar();
    clock.avancar(16 * dia);
    reminder.executar();
    expect(Object.keys(reminder.reguas())).toContain('3');
    owner.salvarDisponibilidade({ veiculoId: '3', dias: diasLiberadosAte(14), aceiteAutomatico: false });
    clock.avancar(8 * dia);
    expect(reminder.executar()).toBe(0);
    expect(Object.keys(reminder.reguas())).not.toContain('3');

    owner.salvarDisponibilidade({ veiculoId: '3', dias: {}, aceiteAutomatico: false });
    reminder.executar();
    clock.avancar(16 * dia);
    reminder.recusar('p3');
    expect(reminder.executar()).toBe(0);
  });
});

describe('RF16 — notificação de demanda local (BDD 9.5)', () => {
  let alert: LocalDemandAlertService;
  let notifications: NotificationService;
  beforeEach(() => {
    configurarTestBed();
    alert = TestBed.inject(LocalDemandAlertService);
    notifications = TestBed.inject(NotificationService);
    TestBed.inject(ConsentService).definir('push', 'marketing', true);
  });

  it('envia com o dado real e persiste o motivo', () => {
    expect(alert.executar()).toBeGreaterThan(0);
    const n = notifications.notificacoes().find((x) => x.motivoDados['regiao'] === 'Centro')!;
    expect(n.tipo).toBe('demanda_local');
    expect(n.texto).toContain('24 buscas');
    expect(n.motivoDados).toEqual(jasmine.objectContaining({ buscas: 24, janela_dias: 7 }));
    expect(n.texto).not.toMatch(/últim[ao] chance|corra|perdid/i);
  });

  it('abaixo do volume mínimo não envia nada', () => {
    TestBed.inject(AppConfigService).definir('MIN_BUSCAS_DEMANDA', 1000);
    expect(alert.executar()).toBe(0);
    expect(notifications.notificacoes().length).toBe(0);
  });

  it('sem consentimento não envia', () => {
    TestBed.inject(ConsentService).definir('push', 'marketing', false);
    expect(alert.executar()).toBe(0);
  });

  it('um alerta por proprietário por semana', () => {
    alert.executar();
    const total = notifications.notificacoes().length;
    alert.executar();
    expect(notifications.notificacoes().length).toBe(total);
  });
});

describe('jobs agendados', () => {
  it('o SchedulerService executa os jobs registrados pelos services', () => {
    configurarTestBed();
    TestBed.inject(SavedSearchService);
    TestBed.inject(AgendaReminderService);
    expect(() => TestBed.inject(SchedulerService).tick()).not.toThrow();
  });
});

