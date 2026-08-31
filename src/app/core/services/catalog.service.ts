import { Injectable, computed, signal } from '@angular/core';
import { Veiculo } from '../models/domain.models';

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
  readonly categorias = ['Todos', 'Hatch', 'Sedã', 'SUV', 'Híbrido', 'Elétrico'];

  private readonly _veiculos = signal<Veiculo[]>([
    {
      id: '1', titulo: 'Honda Civic 2021', foto: 'assets/civic.jpg',
      marca: 'Honda', modelo: 'Civic', ano: 2021, placa: 'FQP-4A12',
      categoria: 'Sedã', diaria: 180, local: 'Centro', distanciaKm: 1.2,
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
      categoria: 'Hatch', diaria: 95, local: 'Zona Sul', distanciaKm: 2.8,
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
      categoria: 'SUV', diaria: 240, local: 'Aeroporto', distanciaKm: 6.5,
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
      categoria: 'Elétrico', diaria: 300, local: 'Centro', distanciaKm: 3.1,
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
      categoria: 'Híbrido', diaria: 220, local: 'Zona Norte', distanciaKm: 4.4,
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
      categoria: 'Hatch', diaria: 85, local: 'Zona Leste', distanciaKm: 5.2,
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
      categoria: 'Sedã', diaria: 180, local: 'Centro', distanciaKm: 0,
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
      categoria: 'Hatch', diaria: 70, local: 'Centro', distanciaKm: 0,
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

  readonly resultados = computed(() => {
    const f = this.filtros();
    return this._veiculos()
      .filter((v) => v.status === 'Aprovado')
      .filter((v) => f.categoria === 'Todos' || v.categoria === f.categoria)
      .filter((v) => v.diaria <= Number(f.precoMax));
  });

  private hoje(offsetDias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDias);
    return d.toISOString().slice(0, 10);
  }

  atualizarFiltros(patch: Partial<FiltrosBusca>): void {
    this.filtros.update((f) => ({ ...f, ...patch }));
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
