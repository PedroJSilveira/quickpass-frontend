import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Veiculo } from '../models/domain.models';
import { EventBusService } from '../analytics/event-bus.service';
import { AppConfigService } from '../config/app-config.service';
import { diasEntre } from '../../shared/utils/date.util';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { OwnerService } from './owner.service';
import { ReviewService } from './review.service';
import { DemandService } from './demand.service';

/** Veículo como exposto na busca/público: sem endereço exato, placa nem sobrenome (RNF02). */
export type VeiculoPublico = Omit<Veiculo, 'enderecoExato' | 'placa'>;

export interface FiltrosBusca {
  local: string;
  inicio: string;
  fim: string;
  categoria: string; // 'Todos' | CategoriaVeiculo
  precoMax: number;
}

/**
 * Catálogo de veículos disponíveis para locação, com busca e filtros.
 * Em produção, isto seria substituído por chamadas HTTP a um serviço de
 * catálogo (com paginação e busca geoespacial).
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private bus = inject(EventBusService);
  private config = inject(AppConfigService);
  private booking = inject(BookingService);
  private owner = inject(OwnerService);
  private auth = inject(AuthService);
  // Review/Demand dependem do catálogo: resolvidos sob demanda para evitar ciclo.
  private injector = inject(Injector);
  /** Origem da solicitação em andamento (ex.: 'radar' quando veio de um alerta). */
  readonly origemSolicitacao = signal<string>('busca');

  readonly categorias = ['Todos', 'Hatch', 'Sedã', 'SUV', 'Híbrido', 'Elétrico'];

  private readonly _veiculos = signal<Veiculo[]>([
    {
      id: '1', titulo: 'Honda Civic 2021', foto: 'assets/civic.jpg',
      marca: 'Honda', modelo: 'Civic', ano: 2021, placa: 'FQP-4A12',
      categoria: 'Sedã', diaria: 180, local: 'Centro', enderecoExato: 'Rua Augusta, 1200 – Centro', distanciaKm: 1.2,
      cambio: 'Automático', combustivel: 'Flex', lugares: 5, km: 48320, consumo: '11 km/l',
      proprietarioId: 'p1', proprietarioNome: 'Lucas Almeida', proprietarioIniciais: 'LA', proprietarioNota: 4.9,
      status: 'Aprovado', nota: 4.9, locacoes: 23,
      manutencao: [
        { chave: 'Última revisão', valor: 'há 2 meses' },
        { chave: 'Troca de óleo', valor: 'há 3.200 km' },
        { chave: 'Pneus', valor: 'trocados há 6 meses' },
        { chave: 'Vistoria', valor: 'em dia' },
      ],
    },
    {
      id: '2', titulo: 'Fiat Argo 2022', foto: 'assets/argo.jpeg',
      marca: 'Fiat', modelo: 'Argo', ano: 2022, placa: 'HRT-2C90',
      categoria: 'Hatch', diaria: 95, local: 'Zona Sul', enderecoExato: 'Av. Santo Amaro, 800 – Zona Sul', distanciaKm: 2.8,
      cambio: 'Manual', combustivel: 'Flex', lugares: 5, km: 62140, consumo: '13 km/l',
      proprietarioId: 'p2', proprietarioNome: 'Camila Rocha', proprietarioIniciais: 'CR', proprietarioNota: 4.7,
      status: 'Aprovado', nota: 4.7, locacoes: 41,
      manutencao: [
        { chave: 'Última revisão', valor: 'há 1 mês' },
        { chave: 'Troca de óleo', valor: 'há 1.800 km' },
        { chave: 'Pneus', valor: 'trocados há 4 meses' },
        { chave: 'Vistoria', valor: 'em dia' },
      ],
    },
    {
      id: '3', titulo: 'Toyota Corolla Cross 2023', foto: 'assets/corolla-cross.jpg',
      marca: 'Toyota', modelo: 'Corolla Cross', ano: 2023, placa: 'JBK-9F31',
      categoria: 'SUV', diaria: 240, local: 'Aeroporto', enderecoExato: 'Av. Washington Luís, 3000 – Aeroporto', distanciaKm: 6.5,
      cambio: 'Automático', combustivel: 'Híbrido', lugares: 5, km: 21880, consumo: '18 km/l',
      proprietarioId: 'p3', proprietarioNome: 'Rafael Teixeira', proprietarioIniciais: 'RT', proprietarioNota: 5.0,
      status: 'Aprovado', nota: 5.0, locacoes: 12,
      manutencao: [
        { chave: 'Última revisão', valor: 'há 3 semanas' },
        { chave: 'Troca de óleo', valor: 'há 900 km' },
        { chave: 'Pneus', valor: 'trocados há 2 meses' },
        { chave: 'Vistoria', valor: 'em dia' },
      ],
    },
    {
      id: '4', titulo: 'BYD Dolphin 2024', foto: 'assets/foto-a.jpeg',
      marca: 'BYD', modelo: 'Dolphin', ano: 2024, placa: 'KLM-3D77',
      categoria: 'Elétrico', diaria: 300, local: 'Centro', enderecoExato: 'Rua Augusta, 1200 – Centro', distanciaKm: 3.1,
      cambio: 'Automático', combustivel: 'Elétrico', lugares: 5, km: 9450, consumo: '340 km/carga',
      proprietarioId: 'p4', proprietarioNome: 'Bruno Antunes', proprietarioIniciais: 'BA', proprietarioNota: 4.8,
      status: 'Aprovado', nota: 4.8, locacoes: 9,
      manutencao: [
        { chave: 'Última revisão', valor: 'há 1 mês' },
        { chave: 'Troca de óleo', valor: 'não aplicável' },
        { chave: 'Pneus', valor: 'trocados há 5 meses' },
        { chave: 'Vistoria', valor: 'em dia' },
      ],
    },
    {
      id: '5', titulo: 'Toyota Prius 2019', foto: 'assets/prius.jpg',
      marca: 'Toyota', modelo: 'Prius', ano: 2019, placa: 'NPQ-5G14',
      categoria: 'Híbrido', diaria: 220, local: 'Zona Norte', enderecoExato: 'Av. Cruzeiro do Sul, 450 – Zona Norte', distanciaKm: 4.4,
      cambio: 'Automático', combustivel: 'Híbrido', lugares: 5, km: 84700, consumo: '30 km/l',
      proprietarioId: 'p5', proprietarioNome: 'Marina Lopes', proprietarioIniciais: 'ML', proprietarioNota: 4.9,
      status: 'Aprovado', nota: 4.9, locacoes: 34,
      manutencao: [
        { chave: 'Última revisão', valor: 'há 2 meses' },
        { chave: 'Troca de óleo', valor: 'há 4.100 km' },
        { chave: 'Pneus', valor: 'trocados há 8 meses' },
        { chave: 'Vistoria', valor: 'em dia' },
      ],
    },
    {
      id: '6', titulo: 'Chevrolet Onix 2020', foto: 'assets/onix.avif',
      marca: 'Chevrolet', modelo: 'Onix', ano: 2020, placa: 'QRS-8H60',
      categoria: 'Hatch', diaria: 85, local: 'Zona Leste', enderecoExato: 'Av. Radial Leste, 900 – Zona Leste', distanciaKm: 5.2,
      cambio: 'Manual', combustivel: 'Flex', lugares: 5, km: 71020, consumo: '13 km/l',
      proprietarioId: 'p6', proprietarioNome: 'Diego Santos', proprietarioIniciais: 'DS', proprietarioNota: 4.6,
      status: 'Aprovado', nota: 4.6, locacoes: 57,
      manutencao: [
        { chave: 'Última revisão', valor: 'há 4 meses' },
        { chave: 'Troca de óleo', valor: 'há 5.600 km' },
        { chave: 'Pneus', valor: 'trocados há 10 meses' },
        { chave: 'Vistoria', valor: 'em dia' },
      ],
    },
    // — veículos do usuário logado (persona "proprietário"), ver AuthService —
    {
      id: 'u1-v1', titulo: 'Honda Civic 2021', foto: 'assets/civic.jpg',
      marca: 'Honda', modelo: 'Civic', ano: 2021, placa: 'FQP-4A12',
      categoria: 'Sedã', diaria: 180, local: 'Centro', enderecoExato: 'Rua Augusta, 1200 – Centro', distanciaKm: 0,
      cambio: 'Automático', combustivel: 'Flex', lugares: 5, km: 48320, consumo: '11 km/l',
      proprietarioId: 'u1', proprietarioNome: 'Mariana Souza', proprietarioIniciais: 'MS', proprietarioNota: 4.8,
      status: 'Aprovado', nota: 4.9, locacoes: 23,
      manutencao: [
        { chave: 'Última revisão', valor: 'há 2 meses' },
        { chave: 'Troca de óleo', valor: 'há 3.200 km' },
        { chave: 'Pneus', valor: 'trocados há 6 meses' },
        { chave: 'Vistoria', valor: 'em dia' },
      ],
    },
    {
      id: 'u1-v2', titulo: 'Fiat Mobi 2019', foto: 'assets/foto-a.jpeg',
      marca: 'Fiat', modelo: 'Mobi', ano: 2019, placa: 'GDX-7B88',
      categoria: 'Hatch', diaria: 70, local: 'Centro', enderecoExato: 'Rua Augusta, 1200 – Centro', distanciaKm: 0,
      cambio: 'Manual', combustivel: 'Flex', lugares: 5, km: 55000, consumo: '13 km/l',
      proprietarioId: 'u1', proprietarioNome: 'Mariana Souza', proprietarioIniciais: 'MS', proprietarioNota: 4.8,
      status: 'Em análise', nota: null, locacoes: 0,
      manutencao: [],
    },
  ]);

  readonly veiculos = this._veiculos.asReadonly();

  readonly filtros = signal<FiltrosBusca>({
    local: 'São Paulo, SP',
    inicio: this.hoje(7),
    fim: this.hoje(10),
    categoria: 'Todos',
    precoMax: 320,
  });

  /**
   * RF01: só veículos ativos com agenda livre em TODO o intervalo (sem reserva
   * confirmada/em andamento nem hold ativo), sem localização exata nem dados
   * pessoais. Ordenados por `pontuacao` (ver abaixo).
   */
  readonly resultados = computed<VeiculoPublico[]>(() => {
    const f = this.filtros();
    return this._veiculos()
      .filter((v) => v.status === 'Aprovado')
      .filter((v) => f.categoria === 'Todos' || v.categoria === f.categoria)
      .filter((v) => v.diaria <= Number(f.precoMax))
      .filter((v) => this.estaLivre(v.id, f.inicio, f.fim))
      .sort((a, b) => this.pontuacao(b) - this.pontuacao(a))
      .map((v) => this.publico(v));
  });

  /** Agenda livre em todo o intervalo: sem conflito de reserva/hold e dias liberados pelo proprietário. */
  estaLivre(veiculoId: string, inicio: string, fim: string, ignorarReservaId?: string): boolean {
    if (this.booking.temConflito(veiculoId, inicio, fim, ignorarReservaId)) return false;
    return this.owner.diasLiberados(veiculoId, diasEntre(inicio, fim));
  }

  /**
   * Regra de ranking documentada (RF01/RF06/RF17, pesos em config):
   *   pontuacao = wR·(nota/5) + wC·completude + (1 − wR − wC)·proximidade
   * proximidade = 1/(1+distanciaKm); completude = foto + itens de manutenção (até 4).
   */
  pontuacao(v: Veiculo): number {
    const wR = this.config.get('PESO_REPUTACAO_RANKING');
    const wC = this.config.get('PESO_COMPLETUDE_RANKING');
    const completude = ((v.foto ? 1 : 0) + Math.min(v.manutencao.length, 4) / 4) / 2;
    const proximidade = 1 / (1 + v.distanciaKm);
    return wR * (this.injector.get(ReviewService).notaParaRanking(v.id) / 5) + wC * completude + (1 - wR - wC) * proximidade;
  }

  publico(v: Veiculo): VeiculoPublico {
    const { enderecoExato: _e, placa: _p, ...resto } = v;
    const [primeiro, ...demais] = v.proprietarioNome.split(' ');
    const sobrenome = demais.length ? ` ${demais[demais.length - 1][0]}.` : '';
    return { ...resto, proprietarioNome: primeiro + sobrenome };
  }

  publicoPorId(id: string): VeiculoPublico | undefined {
    const v = this.porId(id);
    return v ? this.publico(v) : undefined;
  }

  /** Endereço exato: só após KYC aprovado e pagamento confirmado da reserva (RNF02). */
  enderecoExatoDaReserva(reservaId: string): string | null {
    const r = this.booking.porId(reservaId);
    if (!r || !this.auth.contaVerificada() || !this.booking.pagamentoConfirmado(reservaId)) return null;
    return this.porId(r.veiculoId)?.enderecoExato ?? null;
  }

  private hoje(offsetDias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDias);
    return d.toISOString().slice(0, 10);
  }

  atualizarFiltros(patch: Partial<FiltrosBusca>): void {
    this.filtros.update((f) => ({ ...f, ...patch }));
  }

  /** Submissão explícita da busca: atualiza filtros e emite `busca_realizada` (localização aproximada). */
  buscar(patch: Partial<FiltrosBusca>): void {
    this.atualizarFiltros(patch);
    const f = this.filtros();
    this.injector.get(DemandService).registrarBusca({ regiao: f.local, categoria: f.categoria, inicio: f.inicio, fim: f.fim });
    this.bus.emitir('busca_realizada', {
      regiao_aproximada: f.local,
      dias: diasEntre(f.inicio, f.fim).length,
      categoria: f.categoria,
      resultados: this.resultados().length,
    });
  }

  porId(id: string): Veiculo | undefined {
    return this._veiculos().find((v) => v.id === id);
  }

  /** Veículos anunciados por um proprietário específico. */
  doProprietario(proprietarioId: string): Veiculo[] {
    return this._veiculos().filter((v) => v.proprietarioId === proprietarioId);
  }

  cadastrar(veiculo: Veiculo): void {
    this._veiculos.update((lista) => [...lista, veiculo]);
  }

  atualizar(id: string, patch: Partial<Veiculo>): void {
    this._veiculos.update((lista) => lista.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }
}
