import { HttpErrorResponse } from '@angular/common/http';
import { mensagemErro } from './api.service';
import { urlImagem } from './api.config';
import { mapConta, mapReserva, mapVistoria } from './mappers';

describe('API ⇄ modelos', () => {
  it('converte papéis e marca admin sem expô-lo como papel de uso', () => {
    const c = mapConta({ id: 'a', nome: 'A', email: 'a@a', cpf: '1', papeis: ['LOCATARIO', 'PROPRIETARIO', 'ADMIN'], kyc: {}, statusKyc: 'PENDENTE', consentimentos: {} });
    expect(c.papeis).toEqual(['locatario', 'proprietario']);
    expect(c.admin).toBeTrue();
  });

  it('converte status e proteção da reserva para minúsculas', () => {
    const r = mapReserva({ id: 'QP-1', status: 'EM_ANDAMENTO', protecao: 'COMPLETA', valores: {} });
    expect(r.status).toBe('em_andamento');
    expect(r.protecao).toBe('completa');
  });

  it('marca como enviada só a foto que o servidor confirmou', () => {
    const v = mapVistoria({ fotos: { FRENTE: { enviada: true, arquivoId: 'F-1' } } }, 'QP-1', 'checkin');
    expect(v.fotos.frente.status).toBe('enviada');
    expect(v.fotos.traseira.status).toBe('pendente');
  });

  it('mostra a mensagem de negócio devolvida pela API', () => {
    const e = new HttpErrorResponse({ status: 400, error: { mensagem: 'Faltam fotos' } });
    expect(mensagemErro(e)).toBe('Faltam fotos');
    expect(mensagemErro(new HttpErrorResponse({ status: 0 }))).toContain('conectar');
  });

  it('resolve imagens da API e deixa assets estáticos como estão', () => {
    expect(urlImagem('/api/arquivos/F-1')).toContain('/api/arquivos/F-1');
    expect(urlImagem('/api/arquivos/F-1').startsWith('http')).toBeTrue();
    expect(urlImagem('assets/civic.jpg')).toBe('assets/civic.jpg');
  });
});
