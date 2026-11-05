import { TestBed } from '@angular/core/testing';
import { ClockService } from './clock.service';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { CatalogService } from './catalog.service';
import { DepositService } from './deposit.service';
import { DisputeService } from './dispute.service';
import { EventBusService } from '../analytics/event-bus.service';
import { OwnerService } from './owner.service';
import { PayoutService } from './payout.service';
import { SchedulerService } from './scheduler.service';
import { aprovarKyc, configurarTestBed, gatewayMock, hojeMais, vistoriaCompleta } from '../testing/test-helpers';

describe('RF12 — orquestração da reserva', () => {
  let booking: BookingService;
  let clock: ClockService;

  const solicitar = (veiculoId = '1', ini = hojeMais(20), fim = hojeMais(22)) =>
    booking.solicitar({ veiculoId, locatarioId: 'u1', inicio: ini, fim, protecao: 'basica', diaria: 180 });

  beforeEach(() => {
    configurarTestBed();
    booking = TestBed.inject(BookingService);
    clock = TestBed.inject(ClockService);
  });

  it('rejeita transições inválidas com erro claro', async () => {
    await aprovarKyc();
    const r = solicitar();
    expect(() => booking.mover(r.id, 'em_andamento', 'x')).toThrowError(/Transição inválida de reserva: solicitada → em_andamento/);
    booking.rejeitar(r.id);
    expect(() => booking.aprovar(r.id)).toThrowError(/Transição inválida/);
  });

  it('audita toda transição (quem, quando, de/para)', async () => {
    await aprovarKyc();
    const r = solicitar();
    booking.aprovar(r.id, 'prop-1');
    const trilha = TestBed.inject(AuditService).daEntidade('reserva', r.id);
    expect(trilha.map((t) => `${t.de}→${t.para}`)).toEqual(['null→solicitada', 'solicitada→aprovada']);
    expect(trilha[1].ator).toBe('prop-1');
    expect(trilha[1].em).toBeTruthy();
  });

  it('não permite duas reservas sobrepostas para o mesmo veículo', async () => {
    await aprovarKyc();
    solicitar('1', hojeMais(20), hojeMais(23));
    expect(() => solicitar('1', hojeMais(22), hojeMais(25))).toThrowError(/indisponível/);
    // devolução e retirada no mesmo dia não conflitam
    expect(() => solicitar('1', hojeMais(23), hojeMais(25))).not.toThrow();
  });

  it('expira automaticamente a reserva sem resposta do proprietário e libera a agenda', async () => {
    await aprovarKyc();
    const r = solicitar();
    const catalog = TestBed.inject(CatalogService);
    expect(catalog.estaLivre('1', r.inicio, r.fim)).toBeFalse();
    clock.avancar(25 * 3600_000); // > PRAZO_APROVACAO_RESERVA_HORAS (24h)
    TestBed.inject(SchedulerService).tick();
    expect(booking.porId(r.id)?.status).toBe('expirada');
    expect(catalog.estaLivre('1', r.inicio, r.fim)).toBeTrue();
  });

  it('confirma só com pagamento E pré-autorização da caução', async () => {
    await aprovarKyc();
    const r = solicitar();
    booking.aprovar(r.id);
    const res = await booking.pagar(r.id);
    expect(res.status).toBe('confirmada');
    expect(TestBed.inject(DepositService).porReserva(r.id)?.status).toBe('PRE_AUTORIZADA');
    expect(booking.pagamentoConfirmado(r.id)).toBeTrue();
  });

  it('falha de pré-autorização impede a confirmação, estorna e libera o hold', async () => {
    await aprovarKyc();
    gatewayMock().falharPreAutorizacao = true;
    const r = solicitar();
    booking.aprovar(r.id);
    const res = await booking.pagar(r.id);
    expect(res.status).toBe('falha_pagamento');
    expect(TestBed.inject(DepositService).porReserva(r.id)?.status).toBe('FALHA');
    expect(TestBed.inject(CatalogService).estaLivre('1', r.inicio, r.fim)).toBeTrue();
  });

  it('falha na cobrança leva a falha_pagamento', async () => {
    await aprovarKyc();
    gatewayMock().falharCobranca = true;
    const r = solicitar();
    booking.aprovar(r.id);
    expect((await booking.pagar(r.id)).status).toBe('falha_pagamento');
  });

  it('cancelamento confirmado aplica a política de estorno e libera a caução', async () => {
    await aprovarKyc();
    const r = solicitar('1', hojeMais(20), hojeMais(22));
    booking.aprovar(r.id);
    await booking.pagar(r.id);
    await booking.cancelar(r.id, 'u1');
    expect(booking.pagamentoDaReserva(r.id)?.status).toBe('estornado_total'); // > 48h de antecedência
    expect(TestBed.inject(DepositService).porReserva(r.id)?.status).toBe('LIBERADA');
  });

  it('repasse só após concluída + caução resolvida', async () => {
    await aprovarKyc();
    const payout = TestBed.inject(PayoutService);
    const bus = TestBed.inject(EventBusService);
    const ini = hojeMais(0);
    const r = solicitar('6', ini, hojeMais(2));
    booking.aprovar(r.id);
    await booking.pagar(r.id);

    let v = vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkin'));
    booking.registrarVistoria(v);
    expect(payout.daReserva(r.id)?.status).toBe('Previsto');

    v = vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkout'));
    booking.registrarVistoria(v);
    await booking.processarRepasses();
    expect(booking.porId(r.id)?.status).toBe('concluida');
    expect(payout.daReserva(r.id)?.status).toBe('Previsto'); // caução ainda não resolvida
    expect(bus.contar('repasse_realizado')).toBe(0);

    clock.avancar(25 * 3600_000); // PRAZO_LIBERACAO_CAUCAO_HORAS
    await TestBed.inject(DepositService).processarLiberacoes();
    await booking.processarRepasses();
    expect(payout.daReserva(r.id)?.status).toBe('Pago');
    expect(bus.contar('repasse_realizado')).toBe(1);
    expect(bus.contar('transacao_concluida')).toBe(1);
  });
});

describe('RF02 — KYC e hold de agenda (BDD 9.1)', () => {
  let booking: BookingService;
  beforeEach(() => {
    configurarTestBed();
    booking = TestBed.inject(BookingService);
  });

  it('sem KYC aprovado a reserva fica em aguardando_kyc com hold e ocupa a agenda', () => {
    const r = booking.solicitar({ veiculoId: '1', locatarioId: 'u1', inicio: hojeMais(20), fim: hojeMais(22), protecao: 'basica', diaria: 180 });
    expect(r.status).toBe('aguardando_kyc');
    expect(TestBed.inject(CatalogService).estaLivre('1', r.inicio, r.fim)).toBeFalse();
  });

  it('libera as datas se o KYC não for aprovado em HOLD_KYC_MINUTOS (15)', () => {
    const r = booking.solicitar({ veiculoId: '1', locatarioId: 'u1', inicio: hojeMais(20), fim: hojeMais(22), protecao: 'basica', diaria: 180 });
    TestBed.inject(ClockService).avancar(16 * 60_000);
    TestBed.inject(SchedulerService).tick();
    expect(booking.porId(r.id)?.status).toBe('expirada');
    expect(TestBed.inject(CatalogService).estaLivre('1', r.inicio, r.fim)).toBeTrue();
  });

  it('bloqueia o avanço até o KYC e segue para solicitada depois de aprovado', async () => {
    const r = booking.solicitar({ veiculoId: '1', locatarioId: 'u1', inicio: hojeMais(20), fim: hojeMais(22), protecao: 'basica', diaria: 180 });
    expect(() => booking.continuarAposKyc(r.id)).toThrowError(/KYC ainda não aprovado/);
    await aprovarKyc();
    expect(booking.continuarAposKyc(r.id).status).toBe('solicitada');
  });

});

describe('RF02 — status e expiração do KYC', () => {
  beforeEach(() => configurarTestBed());

  it('passa por PENDENTE → EM_ANALISE → APROVADO e emite eventos', async () => {
    const auth = TestBed.inject(AuthService);
    expect(auth.statusKyc()).toBe('PENDENTE');
    auth.enviarItemKyc('doc');
    expect(auth.statusKyc()).toBe('EM_ANALISE');
    await aprovarKyc();
    expect(auth.statusKyc()).toBe('APROVADO');
    expect(auth.contaVerificada()).toBeTrue();
    const bus = TestBed.inject(EventBusService);
    expect(bus.contar('kyc_iniciado')).toBe(1);
    expect(bus.contar('kyc_aprovado')).toBe(1);
  });

  it('expira junto com a validade da CNH e bloqueia reservas', async () => {
    await aprovarKyc();
    const auth = TestBed.inject(AuthService);
    TestBed.inject(ClockService).avancar(4 * 365 * 24 * 3600_000); // validade = +3 anos
    expect(auth.verificarExpiracao()).toBeFalse();
    expect(auth.statusKyc()).toBe('EXPIRADO');
    const r = TestBed.inject(BookingService).solicitar({ veiculoId: '1', locatarioId: 'u1', inicio: hojeMais(20), fim: hojeMais(22), protecao: 'basica', diaria: 180 });
    expect(r.status).toBe('aguardando_kyc');
  });

  it('proprietário sem KYC aprovado não publica agenda', () => {
    const owner = TestBed.inject(OwnerService);
    expect(() => owner.alternarDia('u1-v1', hojeMais(1))).toThrowError(/KYC/);
  });
});

describe('RF04 — caução e disputa (BDD 9.3)', () => {
  let booking: BookingService;
  let deposit: DepositService;
  let dispute: DisputeService;
  let clock: ClockService;

  async function emCheckoutComAvaria(): Promise<string> {
    await aprovarKyc();
    const r = booking.solicitar({ veiculoId: '6', locatarioId: 'u1', inicio: hojeMais(0), fim: hojeMais(2), protecao: 'basica', diaria: 220 });
    booking.aprovar(r.id);
    await booking.pagar(r.id);
    booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkin')));
    booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkout')), { avaria: true });
    return r.id;
  }

  beforeEach(() => {
    configurarTestBed();
    booking = TestBed.inject(BookingService);
    deposit = TestBed.inject(DepositService);
    dispute = TestBed.inject(DisputeService);
    clock = TestBed.inject(ClockService);
  });

  it('avaria informada retém a caução, não captura, e o locatário é notificado', async () => {
    const id = await emCheckoutComAvaria();
    expect(booking.porId(id)?.status).toBe('em_disputa');
    const d = dispute.informarAvaria(id, { descricao: 'Risco na porta', qtdFotos: 2, valorEstimado: 300 });
    expect(deposit.porReserva(id)?.status).toBe('RETIDA_EM_DISPUTA');
    expect(deposit.porReserva(id)?.valorCapturado).toBe(0);
    expect(d.status).toBe('AGUARDANDO_CONTESTACAO');
    expect(TestBed.inject(EventBusService).contar('avaria_informada')).toBe(1);
  });

  it('exige fotos e descrição para informar avaria', async () => {
    const id = await emCheckoutComAvaria();
    expect(() => dispute.informarAvaria(id, { descricao: '', qtdFotos: 0, valorEstimado: 0 })).toThrowError(/descrição e ao menos uma foto/);
  });

  it('nunca captura sem decisão registrada', async () => {
    const id = await emCheckoutComAvaria();
    const d = dispute.informarAvaria(id, { descricao: 'Amassado', qtdFotos: 1, valorEstimado: 300 });
    // decidir antes da análise é recusado
    await expectAsync(dispute.decidir(d.id, { tipo: 'captura_total', valor: 500, justificativa: 'x' }, 'm')).toBeRejectedWithError(/em análise/);
    // chamada direta ao depósito com decisão incompleta também falha
    await expectAsync(
      deposit.aplicarDecisao(id, { tipo: 'captura_total', valor: 500, justificativa: '  ', decididaPor: 'm', decididaEm: clock.iso() }),
    ).toBeRejectedWithError(/decisão registrada/);
    expect(deposit.porReserva(id)?.valorCapturado).toBe(0);
  });

  it('fluxo completo: contestação → análise → decisão parcial → conclui e paga repasse', async () => {
    const id = await emCheckoutComAvaria();
    const d = dispute.informarAvaria(id, { descricao: 'Amassado', qtdFotos: 1, valorEstimado: 300 });
    dispute.contestar(d.id, { texto: 'Já estava assim no check-in', qtdEvidencias: 1 });
    dispute.assumirAnalise(d.id, 'mediador-1');
    await dispute.decidir(d.id, { tipo: 'captura_parcial', valor: 200, justificativa: 'Reparo parcial comprovado' }, 'mediador-1');
    expect(deposit.porReserva(id)?.status).toBe('CAPTURADA_PARCIAL');
    expect(deposit.porReserva(id)?.valorCapturado).toBe(200);
    expect(booking.porId(id)?.status).toBe('concluida');
    expect(TestBed.inject(PayoutService).daReserva(id)?.status).toBe('Pago');
  });

  it('sem contestação no prazo a disputa segue para análise do mediador', async () => {
    const id = await emCheckoutComAvaria();
    const d = dispute.informarAvaria(id, { descricao: 'Amassado', qtdFotos: 1, valorEstimado: 300 });
    clock.avancar(49 * 3600_000);
    dispute.encerrarPrazosDeContestacao();
    expect(dispute.daReserva(id)?.status).toBe('NAO_CONTESTADA_NO_PRAZO');
    expect(() => dispute.contestar(d.id, { texto: 'tarde', qtdEvidencias: 0 })).toThrow();
  });

  it('check-out sem avaria e sem contestação libera a caução após o prazo (job)', async () => {
    await aprovarKyc();
    const r = booking.solicitar({ veiculoId: '6', locatarioId: 'u1', inicio: hojeMais(0), fim: hojeMais(2), protecao: 'basica', diaria: 220 });
    booking.aprovar(r.id);
    await booking.pagar(r.id);
    booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkin')));
    booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkout')));
    expect(deposit.porReserva(r.id)?.status).toBe('PRE_AUTORIZADA');
    clock.avancar(25 * 3600_000);
    TestBed.inject(SchedulerService).tick();
    await new Promise((res) => setTimeout(res, 0));
    expect(deposit.porReserva(r.id)?.status).toBe('LIBERADA');
  });
});

describe('RF03 — vistoria', () => {
  let booking: BookingService;
  beforeEach(async () => {
    configurarTestBed();
    booking = TestBed.inject(BookingService);
    await aprovarKyc();
  });

  async function confirmada(inicio = hojeMais(0), fim = hojeMais(2)) {
    const r = booking.solicitar({ veiculoId: '6', locatarioId: 'u1', inicio, fim, protecao: 'basica', diaria: 220 });
    booking.aprovar(r.id);
    await booking.pagar(r.id);
    return r;
  }

  it('exige as 7 fotos confirmadas E o aceite das duas partes', async () => {
    const r = await confirmada();
    const base = booking.vistoriaVazia(r.id, 'checkin');
    expect(() => booking.registrarVistoria(base)).toThrowError(/Faltam fotos/);
    const semAceite = vistoriaCompleta(base, false);
    expect(() => booking.registrarVistoria(semAceite)).toThrowError(/aceite/);
    const umAceite = { ...semAceite, aceiteLocatario: true };
    expect(() => booking.registrarVistoria(umAceite)).toThrowError(/aceite/);
    // foto ainda "enviando" não conta
    const enviando = vistoriaCompleta(base);
    enviando.fotos.painel = { ...enviando.fotos.painel, status: 'enviando' };
    expect(() => booking.registrarVistoria(enviando)).toThrowError(/Faltam fotos/);
    expect(booking.porId(r.id)?.status).toBe('confirmada');
    booking.registrarVistoria(vistoriaCompleta(base));
    expect(booking.porId(r.id)?.status).toBe('em_andamento');
  });

  it('rejeita check-in fora da janela da reserva', async () => {
    const r = await confirmada(hojeMais(10), hojeMais(12));
    expect(() => booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkin')))).toThrowError(/janela/);
  });

  it('check-out só sai de em_andamento com 7 fotos e dois aceites', async () => {
    const r = await confirmada();
    booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkin')));
    const out = booking.vistoriaVazia(r.id, 'checkout');
    expect(() => booking.registrarVistoria(out)).toThrow();
    expect(booking.porId(r.id)?.status).toBe('em_andamento');
    booking.registrarVistoria(vistoriaCompleta(out));
    expect(booking.porId(r.id)?.status).toBe('concluida');
  });
});
