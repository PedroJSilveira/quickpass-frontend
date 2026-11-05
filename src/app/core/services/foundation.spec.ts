import { TestBed } from '@angular/core/testing';
import { CONFIG_DEFAULTS } from '../config/config.defaults';
import { AppConfigService } from '../config/app-config.service';
import { EventBusService } from '../analytics/event-bus.service';
import { AttributionService } from './attribution.service';
import { AuthService } from './auth.service';
import { ConsentService } from './consent.service';
import { SessionService } from './session.service';
import { configurarTestBed } from '../testing/test-helpers';

describe('Fase 0 — fundação', () => {
  beforeEach(() => configurarTestBed());

  describe('config (RNF04)', () => {
    it('traz todos os padrões da §11 e permite alterar sem deploy', () => {
      const cfg = TestBed.inject(AppConfigService);
      expect(cfg.get('HOLD_KYC_MINUTOS')).toBe(15);
      expect(cfg.get('PRAZO_LIBERACAO_CAUCAO_HORAS')).toBe(24);
      expect(cfg.get('PRAZO_AVALIACAO_HORAS')).toBe(72);
      cfg.definir('HOLD_KYC_MINUTOS', 5);
      expect(cfg.get('HOLD_KYC_MINUTOS')).toBe(5);
      expect(JSON.parse(localStorage.getItem('qp.config')!)).toEqual({ HOLD_KYC_MINUTOS: 5 });
      cfg.restaurarPadroes();
      expect(cfg.get('HOLD_KYC_MINUTOS')).toBe(CONFIG_DEFAULTS.HOLD_KYC_MINUTOS);
    });

    it('sinaliza valores provisórios ("a definir")', () => {
      const cfg = TestBed.inject(AppConfigService);
      expect(cfg.ehProvisorio('JANELA_CHECKIN_MINUTOS')).toBeTrue();
      expect(cfg.ehProvisorio('HOLD_KYC_MINUTOS')).toBeFalse();
    });
  });

  describe('atribuição (RF08)', () => {
    it('grava first-touch e não muda depois', () => {
      const a = TestBed.inject(AttributionService);
      const primeira = a.capturar('?utm_source=google&utm_medium=cpc&utm_campaign=lancamento', '');
      expect(primeira.canal).toBe('midia_paga');
      const segunda = a.capturar('?utm_source=outro&utm_medium=organic', '');
      expect(segunda).toEqual(primeira);
    });

    it('classifica referral, direto e desconhecido', () => {
      expect(TestBed.inject(AttributionService).capturar('?ref=ABC123', '').canal).toBe('referral');
      localStorage.clear();
      expect(TestBed.inject(AttributionService).capturar('', '').canal).toBe('direto');
      localStorage.clear();
      expect(TestBed.inject(AttributionService).capturar('?utm_source=x', '').canal).toBe('desconhecido');
    });

    it('todo cadastro tem canal de origem e ele não muda em novo cadastro', () => {
      const auth = TestBed.inject(AuthService);
      auth.cadastrar({ nome: 'A', email: 'a@a.com', cpf: '1', papel: 'locatario' });
      const origem = auth.conta().origem!;
      expect(origem.canal).toBeTruthy();
      TestBed.inject(AttributionService).capturar('?ref=XYZ', '');
      auth.cadastrar({ nome: 'B', email: 'b@b.com', cpf: '2', papel: 'proprietario' });
      expect(auth.conta().origem).toEqual(origem);
      expect(TestBed.inject(EventBusService).contar('cadastro_concluido')).toBe(1);
    });
  });

  describe('eventos e sessão (RF15)', () => {
    it('todo evento carrega nome, timestamp, usuário, papel e sessão', () => {
      TestBed.inject(SessionService).iniciar('');
      const ev = TestBed.inject(EventBusService).eventos()[0];
      expect(ev.event_name).toBe('sessao_iniciada');
      expect(ev.user_id).toBe('u1');
      expect(ev.papel).toBe('locatario');
      expect(ev.session_id).toMatch(/^s-/);
      expect(ev.props['origem']).toBe('direta');
      expect(ev.props['retorno_espontaneo']).toBeTrue();
    });

    it('sessão aberta por notificação não é retorno espontâneo', () => {
      TestBed.inject(SessionService).iniciar('?origem=push&notificacao_id=n1');
      const ev = TestBed.inject(EventBusService).eventos()[0];
      expect(ev.props['origem']).toBe('push');
      expect(ev.props['retorno_espontaneo']).toBeFalse();
    });

    it('descarta lat/long exatas de qualquer evento (RNF02)', () => {
      const bus = TestBed.inject(EventBusService);
      const ev = bus.emitir('busca_realizada', { lat: -23.55, lng: -46.63, regiao_aproximada: 'Centro' });
      expect(ev.props['lat']).toBeUndefined();
      expect(ev.props['lng']).toBeUndefined();
      expect(ev.props['regiao_aproximada']).toBe('Centro');
    });
  });

  describe('consentimento (RNF02/03)', () => {
    it('marketing começa SEM consentimento; transacional ativo', () => {
      const c = TestBed.inject(ConsentService);
      expect(c.permite('push', 'marketing')).toBeFalse();
      expect(c.permite('email', 'transacional')).toBeTrue();
      c.definir('push', 'marketing', true);
      expect(c.permite('push', 'marketing')).toBeTrue();
    });
  });
});
