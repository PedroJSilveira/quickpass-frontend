import { TestBed } from '@angular/core/testing';
import { ADAPTER_PROVIDERS } from '../adapters/adapters.providers';
import { MockPaymentGateway, PaymentGateway } from '../adapters/payment.gateway';
import { AuthService } from '../services/auth.service';
import { FOTOS_OBRIGATORIAS } from '../services/booking.service';
import { Vistoria } from '../models/domain.models';

/** Configura o TestBed com adapters mock e storage limpo. */
export function configurarTestBed(): void {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [...ADAPTER_PROVIDERS] });
}

export function gatewayMock(): MockPaymentGateway {
  return TestBed.inject(PaymentGateway) as MockPaymentGateway;
}

/** Aprova o KYC da conta (4 itens) e espera a análise assíncrona do provider. */
export async function aprovarKyc(): Promise<void> {
  const auth = TestBed.inject(AuthService);
  (['doc', 'cnh', 'selfie', 'banco'] as const).forEach((i) => auth.enviarItemKyc(i));
  await new Promise((r) => setTimeout(r, 0));
}

export function hojeMais(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Vistoria completa: 7 fotos enviadas e (opcionalmente) os dois aceites. */
export function vistoriaCompleta(base: Vistoria, aceites = true): Vistoria {
  const fotos = { ...base.fotos };
  for (const f of FOTOS_OBRIGATORIAS) {
    fotos[f.chave] = { status: 'enviada', progresso: 100, tentativas: 1, tiradaEm: new Date().toISOString(), localAproximada: null };
  }
  return { ...base, fotos, aceiteLocatario: aceites, aceiteProprietario: aceites };
}

import { BookingService } from '../services/booking.service';
import { ClockService } from '../services/clock.service';
import { DepositService } from '../services/deposit.service';

/** ISO (yyyy-mm-dd) de "agora do relógio simulado" + N dias. */
export function clockMais(dias: number): string {
  const c = TestBed.inject(ClockService);
  return new Date(c.now().getTime() + dias * 86400000).toISOString().slice(0, 10);
}

/** Todos os dias de hoje até hoje+N (relógio simulado). */
export function diasLiberadosAte(n: number): Record<string, boolean> {
  const dias: Record<string, boolean> = {};
  for (let i = 0; i <= n; i++) dias[clockMais(i)] = true;
  return dias;
}

/**
 * Leva uma locação do veículo (padrão '6') de solicitada até o check-out com
 * ou sem avaria. Sem avaria, avança o relógio, libera a caução e paga o repasse.
 */
export async function concluirLocacao(opcoes: { veiculoId?: string; avaria?: boolean } = {}): Promise<string> {
  const booking = TestBed.inject(BookingService);
  const r = booking.solicitar({ veiculoId: opcoes.veiculoId ?? '6', locatarioId: 'u1', inicio: hojeMais(0), fim: hojeMais(2), protecao: 'basica', diaria: 85 });
  booking.aprovar(r.id);
  await booking.pagar(r.id);
  booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkin')));
  booking.registrarVistoria(vistoriaCompleta(booking.vistoriaVazia(r.id, 'checkout')), { avaria: !!opcoes.avaria });
  if (!opcoes.avaria) {
    TestBed.inject(ClockService).avancar(25 * 3600_000);
    await TestBed.inject(DepositService).processarLiberacoes();
    await booking.processarRepasses();
  }
  return r.id;
}
