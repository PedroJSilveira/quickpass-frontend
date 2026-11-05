import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../config/app-config.service';
import { EventBusService } from '../analytics/event-bus.service';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { CatalogService } from './catalog.service';
import { aprovarKyc, configurarTestBed, hojeMais } from '../testing/test-helpers';

describe('RF01 — busca', () => {
  let catalog: CatalogService;

  beforeEach(() => {
    configurarTestBed();
    catalog = TestBed.inject(CatalogService);
    catalog.atualizarFiltros({ inicio: hojeMais(7), fim: hojeMais(10), categoria: 'Todos', precoMax: 1000 });
  });

  it('nunca exibe veículo inativo (não aprovado)', () => {
    const ids = catalog.resultados().map((v) => v.id);
    expect(ids).not.toContain('u1-v2'); // "Em análise"
    expect(ids).toContain('1');
  });

  it('esconde veículo com qualquer conflito no intervalo', async () => {
    await aprovarKyc();
    TestBed.inject(BookingService).solicitar({ veiculoId: '1', locatarioId: 'u1', inicio: hojeMais(9), fim: hojeMais(12), protecao: 'basica', diaria: 180 });
    expect(catalog.resultados().map((v) => v.id)).not.toContain('1'); // sobreposição parcial
  });

  it('respeita os dias liberados pelo proprietário', () => {
    expect(catalog.estaLivre('2', hojeMais(7), hojeMais(9))).toBeTrue(); // agenda não configurada = aberta
  });

  it('a resposta não contém localização exata, placa nem sobrenome do proprietário', () => {
    const v = catalog.resultados()[0] as unknown as Record<string, unknown>;
    expect('enderecoExato' in v).toBeFalse();
    expect('placa' in v).toBeFalse();
    expect(JSON.stringify(v)).not.toContain('Rua ');
    expect(String(v['proprietarioNome'])).toMatch(/^\S+( [A-Z]\.)?$/);
  });

  it('revela o endereço exato somente com KYC aprovado e pagamento confirmado', async () => {
    const booking = TestBed.inject(BookingService);
    expect(catalog.enderecoExatoDaReserva('QP-2330')).toBeNull(); // sem KYC
    await aprovarKyc();
    expect(TestBed.inject(AuthService).contaVerificada()).toBeTrue();
    expect(booking.pagamentoConfirmado('QP-2330')).toBeTrue();
    expect(catalog.enderecoExatoDaReserva('QP-2330')).toContain('Zona Norte');
    expect(catalog.enderecoExatoDaReserva('QP-2310')).toBeNull(); // não paga
  });

  it('ordena usando o peso de reputação/completude configurável', () => {
    const cfg = TestBed.inject(AppConfigService);
    cfg.definir('PESO_REPUTACAO_RANKING', 1);
    cfg.definir('PESO_COMPLETUDE_RANKING', 0);
    const primeiro = catalog.resultados()[0];
    const melhorNota = Math.max(...catalog.resultados().map((v) => v.nota ?? 0));
    expect(primeiro.nota).toBe(melhorNota);
  });

  it('busca() emite busca_realizada com região aproximada, sem lat/long', () => {
    catalog.buscar({ local: 'Zona Sul' });
    const ev = TestBed.inject(EventBusService).eventos().find((e) => e.event_name === 'busca_realizada')!;
    expect(ev.props['regiao_aproximada']).toBe('Zona Sul');
    expect(Object.keys(ev.props)).not.toContain('lat_long_centro');
  });
});
