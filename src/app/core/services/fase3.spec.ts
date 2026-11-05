import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../config/app-config.service';
import { EventBusService } from '../analytics/event-bus.service';
import { AttributionService } from './attribution.service';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { ClockService } from './clock.service';
import { ConsentService } from './consent.service';
import { DepositService } from './deposit.service';
import { DisputeService } from './dispute.service';
import { ExperimentService } from './experiment.service';
import { HealthScoreService } from './health-score.service';
import { MetricsService } from './metrics.service';
import { NotificationService } from './notification.service';
import { OwnerService } from './owner.service';
import { PayoutService } from './payout.service';
import { ReferralService } from './referral.service';
import { SessionService } from './session.service';
import { SupplyHealthService } from './supply-health.service';
import { aprovarKyc, concluirLocacao, configurarTestBed, diasLiberadosAte, hojeMais, vistoriaCompleta } from '../testing/test-helpers';

const DIA = 24 * 3600_000;

describe('RF15 — sessão, retorno espontâneo e retenção', () => {
  let session: SessionService;
  let bus: EventBusService;
  let clock: ClockService;
  beforeEach(() => {
    configurarTestBed();
    session = TestBed.inject(SessionService);
    bus = TestBed.inject(EventBusService);
    clock = TestBed.inject(ClockService);
  });

  const ultima = () => bus.eventos().filter((e) => e.event_name === 'sessao_iniciada').at(-1)!;

  it('abertura de notificação recente atribui a sessão à notificação; fora da janela é espontânea', () => {
    TestBed.inject(ConsentService).definir('push', 'marketing', true);
    const notifications = TestBed.inject(NotificationService);
    const n = notifications.enviar({ userId: 'u1', tipo: 'demanda_local', titulo: 't', texto: 'x', motivoDados: { a: 1 } })!;
    notifications.abrir(n.id);

    session.iniciar('');
    expect(ultima().props['retorno_espontaneo']).toBeFalse();
    expect(ultima().props['ultima_interacao_notificacao']).toBeTruthy(); // auditoria da regra de atribuição

    clock.avancar(31 * 60_000); // JANELA_ATRIBUICAO_NOTIFICACAO_MIN = 30
    session.iniciar('');
    expect(ultima().props['retorno_espontaneo']).toBeTrue();
  });

  it('calcula % de retorno espontâneo por papel', () => {
    session.iniciar('');
    session.iniciar('?origem=push&notificacao_id=n1');
    const r = TestBed.inject(MetricsService).retornoEspontaneo('locatario');
    expect(r).toEqual({ sessoes: 2, espontaneas: 1, notificadas: 1, pct: 50 });
  });

  it('retenção por coorte separa retorno espontâneo de notificado', () => {
    const auth = TestBed.inject(AuthService);
    auth.cadastrar({ nome: 'P', email: 'p@p.com', cpf: '1', papel: 'proprietario' });
    session.iniciar(''); // semana 0
    clock.avancar(8 * DIA);
    session.iniciar(''); // semana +1, espontânea
    clock.avancar(8 * DIA);
    session.iniciar('?origem=push'); // semana +2, notificada
    const [coorte] = TestBed.inject(MetricsService).retencaoPorCoorte('proprietario');
    expect(coorte.tamanho).toBe(1);
    expect(coorte.espontanea[0]).toBe(100);
    expect(coorte.notificada[0]).toBe(0);
    expect(coorte.notificada[1]).toBe(100);
  });
});

describe('North Star e guardrails (§8)', () => {
  let metrics: MetricsService;
  beforeEach(async () => {
    configurarTestBed();
    metrics = TestBed.inject(MetricsService);
    await aprovarKyc();
  });

  it('conta locações concluídas por semana ISO só com caução resolvida; GMV é secundário e líquido', async () => {
    const antes = metrics.northStar().reduce((t, l) => t + l.locacoes, 0); // seed QP-2107
    const booking = TestBed.inject(BookingService);
    const r = booking.solicitar({ veiculoId: '6', locatarioId: 'u1', inicio: hojeMais(0), fim: hojeMais(2), protecao: 'basica', diaria: 85 });
    booking.aprovar(r.id);
    await booking.pagar(r.id);
    booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkin')));
    booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkout')));
    expect(metrics.northStar().reduce((t, l) => t + l.locacoes, 0)).toBe(antes); // caução ainda não resolvida

    TestBed.inject(ClockService).avancar(25 * 3600_000);
    await TestBed.inject(DepositService).processarLiberacoes();
    const linhas = metrics.northStar();
    expect(linhas.reduce((t, l) => t + l.locacoes, 0)).toBe(antes + 1);
    const atual = linhas.at(-1)!;
    expect(atual.semana).toMatch(/^\d{4}-W\d{2}$/);
    expect(atual.gmvLiquido).toBeGreaterThan(0);
  });

  it('guardrail de disputa = concluídas com disputa / concluídas, comparado à meta configurada', async () => {
    expect(metrics.guardrailDisputa()).toEqual(jasmine.objectContaining({ numerador: 0, denominador: 1, violado: false, meta: 3 }));
    const id = await concluirLocacao({ avaria: true });
    const dispute = TestBed.inject(DisputeService);
    const d = dispute.informarAvaria(id, { descricao: 'Risco', qtdFotos: 1, valorEstimado: 100 });
    dispute.contestar(d.id, { texto: 'não fui eu', qtdEvidencias: 0 });
    dispute.assumirAnalise(d.id, 'm');
    await dispute.decidir(d.id, { tipo: 'liberacao', valor: 0, justificativa: 'sem provas' }, 'm');
    const g = metrics.guardrailDisputa();
    expect([g.numerador, g.denominador]).toEqual([1, 2]);
    expect(g.violado).toBeTrue();
  });

  it('guardrail de churn silencioso conta proprietários sem oferta há ≥15 dias', () => {
    const owner = TestBed.inject(OwnerService);
    owner.salvarDisponibilidade({ veiculoId: '1', dias: {}, aceiteAutomatico: false });
    const supply = TestBed.inject(SupplyHealthService);
    supply.varrer(); // o job agendado mantém o relógio de "sem oferta"
    expect(metrics.guardrailChurnSilencioso().numerador).toBe(0);
    TestBed.inject(ClockService).avancar(16 * DIA);
    supply.varrer();
    const g = metrics.guardrailChurnSilencioso();
    expect(g.numerador).toBe(1);
    expect(g.pct).toBeGreaterThan(0);
  });

  it('funil por canal: aquisição, ativação do locatário e receita líquida de descontos', async () => {
    TestBed.inject(AttributionService).capturar('?utm_source=g&utm_medium=cpc', '');
    TestBed.inject(AuthService).cadastrar({ nome: 'L', email: 'l@l.com', cpf: '9', papel: 'locatario' });
    TestBed.inject(ExperimentService).sorteio = () => 0.99; // grupo controle: sem desconto, receita determinística
    await concluirLocacao();
    const linha = metrics.funilPorCanal().find((f) => f.canal === 'midia_paga')!;
    expect(linha.aquisicao).toBe(1);
    expect(linha.ativacaoLocatario).toBe(1);
    expect(linha.receita).toBeGreaterThan(0);
  });
});

describe('RF09 — experimento de isenção de taxa', () => {
  let exp: ExperimentService;
  let booking: BookingService;
  let bus: EventBusService;

  const pagarPrimeiraLocacao = async (veiculoId = '1', ini = 20, fim = 22) => {
    const r = booking.solicitar({ veiculoId, locatarioId: 'u1', inicio: hojeMais(ini), fim: hojeMais(fim), protecao: 'basica', diaria: 180 });
    booking.aprovar(r.id);
    await booking.pagar(r.id);
    return r.id;
  };

  beforeEach(async () => {
    configurarTestBed();
    exp = TestBed.inject(ExperimentService);
    booking = TestBed.inject(BookingService);
    bus = TestBed.inject(EventBusService);
    await aprovarKyc();
  });

  it('aplica 100% de desconto da taxa só ao grupo tratamento, na 1ª transação, e mostra no resumo financeiro', async () => {
    exp.sorteio = () => 0; // tratamento
    const id = await pagarPrimeiraLocacao();
    const pg = booking.pagamentoDaReserva(id)!;
    expect(pg.desconto).toBe(pg.taxaPlataforma);
    expect(pg.desconto).toBeGreaterThan(0);
    expect(bus.contar('desconto_aplicado')).toBe(1);
    expect(bus.eventos().find((e) => e.event_name === 'pagamento_finalizado')?.props['desconto']).toBe(pg.desconto);

    const outro = await pagarPrimeiraLocacao('1', 40, 42); // 2ª transação do mesmo proprietário
    expect(booking.pagamentoDaReserva(outro)!.desconto).toBe(0);
  });

  it('grupo controle não recebe desconto', async () => {
    exp.sorteio = () => 0.99;
    const id = await pagarPrimeiraLocacao();
    expect(booking.pagamentoDaReserva(id)!.desconto).toBe(0);
    expect(exp.grupoDe('p1')).toBe('controle');
  });

  it('o grupo é registrado uma vez e é imutável', async () => {
    exp.sorteio = () => 0;
    expect(exp.atribuir('p1')).toBe('tratamento');
    exp.sorteio = () => 0.99;
    expect(exp.atribuir('p1')).toBe('tratamento');
    expect(bus.contar('experimento_atribuido')).toBe(1);
  });

  it('para ao atingir o orçamento', async () => {
    exp.sorteio = () => 0;
    TestBed.inject(AppConfigService); // orçamento vem do estado inicial do experimento
    (exp as unknown as { salvar(p: object): void }).salvar({ orcamento: 10 });
    const id = await pagarPrimeiraLocacao(); // taxa (R$54) > orçamento restante
    expect(booking.pagamentoDaReserva(id)!.desconto).toBe(0);
    expect(exp.estado().encerradoPor).toBe('orcamento');
    expect(exp.ativo()).toBeFalse();
  });

  it('para ao fim do período', async () => {
    exp.sorteio = () => 0;
    TestBed.inject(ClockService).avancar(61 * DIA);
    const id = await pagarPrimeiraLocacao('1', 70, 72);
    expect(booking.pagamentoDaReserva(id)!.desconto).toBe(0);
    expect(exp.estado().encerradoPor).toBe('prazo');
  });

  it('para quando o guardrail de disputas é violado', async () => {
    exp.sorteio = () => 0;
    const id = await concluirLocacao({ avaria: true });
    const dispute = TestBed.inject(DisputeService);
    const d = dispute.informarAvaria(id, { descricao: 'Risco', qtdFotos: 1, valorEstimado: 100 });
    dispute.contestar(d.id, { texto: 'não fui eu', qtdEvidencias: 0 });
    dispute.assumirAnalise(d.id, 'm');
    await dispute.decidir(d.id, { tipo: 'liberacao', valor: 0, justificativa: 'sem provas' }, 'm');
    // 1 disputa em 2 locações concluídas (50%) ≥ meta de 3% → guardrail violado
    expect(exp.ativo()).toBeFalse();
    expect(exp.estado().encerradoPor).toBe('guardrail');
  });

  it('não é elegível quem já tem locação concluída', () => {
    expect(exp.elegivel('p2', true)).toBeFalse();
    expect(exp.elegivel('p2', false)).toBeTrue();
  });

  it('o repasse reflete a isenção da taxa', async () => {
    exp.sorteio = () => 0;
    TestBed.inject(OwnerService).salvarDisponibilidade({ veiculoId: '6', dias: diasLiberadosAte(5), aceiteAutomatico: false });
    const r = booking.solicitar({ veiculoId: '6', locatarioId: 'u1', inicio: hojeMais(0), fim: hojeMais(2), protecao: 'basica', diaria: 85 });
    booking.aprovar(r.id);
    await booking.pagar(r.id);
    booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkin')));
    const rep = TestBed.inject(PayoutService).daReserva(r.id)!;
    expect(rep.taxa).toBe(0);
    expect(rep.liquido).toBe(rep.bruto);
  });
});

describe('RF10 — referral (BDD 9.6)', () => {
  let referral: ReferralService;
  let bus: EventBusService;
  beforeEach(() => {
    configurarTestBed();
    referral = TestBed.inject(ReferralService);
    bus = TestBed.inject(EventBusService);
  });

  it('gera link individual e estável por usuário', () => {
    const a = referral.gerarLink('uA');
    expect(referral.gerarLink('uA').codigo).toBe(a.codigo);
    expect(referral.gerarLink('uB').codigo).not.toBe(a.codigo);
    expect(a.url).toContain('/cadastro?ref=' + a.codigo);
    expect(bus.contar('referral_link_gerado')).toBe(2);
  });

  it('bloqueia autoindicação por usuário, documento, dispositivo e cartão', () => {
    const { codigo } = referral.gerarLink('uA', { cpf: '111', dispositivo: 'd-1', cartao: 'c-1' });
    expect(referral.registrarCadastro(codigo, { id: 'uA' })).toBeFalse();
    expect(referral.registrarCadastro(codigo, { id: 'uX', cpf: '111' })).toBeFalse();
    expect(referral.registrarCadastro(codigo, { id: 'uY', dispositivo: 'd-1' })).toBeFalse();
    expect(referral.registrarCadastro(codigo, { id: 'uZ', cartao: 'c-1' })).toBeFalse();
    expect(referral.indicacoes().length).toBe(0);
    expect(referral.registrarCadastro(codigo, { id: 'uOk', cpf: '999', dispositivo: 'd-9' })).toBeTrue();
    expect(referral.registrarCadastro(codigo, { id: 'uOk', cpf: '999', dispositivo: 'd-9' })).toBeFalse(); // sem duplicar
  });

  it('cadastro pelo próprio link no mesmo dispositivo não registra a indicação (via AuthService)', () => {
    const auth = TestBed.inject(AuthService);
    const { codigo } = referral.gerarLink(auth.conta().id, { cpf: '123' });
    TestBed.inject(AttributionService).capturar('?ref=' + codigo, '');
    auth.cadastrar({ nome: 'Eu', email: 'e@e.com', cpf: '123', papel: 'locatario' });
    expect(referral.indicacoes().length).toBe(0);
    expect(auth.conta().origem?.canal).toBe('referral'); // a origem é registrada mesmo assim
  });

  it('qualifica uma vez, com bônus respeitando o teto do período, sem alterar o Health Score', () => {
    const config = TestBed.inject(AppConfigService);
    config.definir('REFERRAL_BONUS_VALOR', 10);
    config.definir('REFERRAL_TETO_PERIODO', 15);
    const { codigo } = referral.gerarLink('uA');
    referral.registrarCadastro(codigo, { id: 'i1', dispositivo: 'd-a' });
    referral.registrarCadastro(codigo, { id: 'i2', dispositivo: 'd-b' });

    const health = TestBed.inject(HealthScoreService);
    const antes = health.calcular('uA', 'proprietario');

    expect(referral.qualificar('i1')?.bonus).toBe(10);
    expect(referral.qualificar('i1')).toBeNull(); // no máximo um crédito por convidado
    expect(referral.qualificar('i2')?.bonus).toBe(0); // 10 + 10 > teto 15
    expect(referral.indicacoes().filter((i) => i.status === 'qualificada').length).toBe(2);
    expect(bus.contar('referral_bonus_creditado')).toBe(1);
    expect(bus.contar('referral_qualificada')).toBe(2);
    expect(health.calcular('uA', 'proprietario')).toBe(antes);
  });

  it('só qualifica convidado registrado', () => {
    expect(referral.qualificar('ninguem')).toBeNull();
  });
});
