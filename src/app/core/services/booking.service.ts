import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { mapCaucao, mapDisputa, mapPagamento, mapReserva, mapVistoria } from '../api/mappers';
import { Avaliacao, DepositHold, Dispute, FotoChave, Payment, Protecao, Reserva, Vistoria } from '../models/domain.models';
import { AuthService } from './auth.service';

export const FOTOS_OBRIGATORIAS: { chave: FotoChave; rotulo: string }[] = [
  { chave: 'frente', rotulo: 'frente' },
  { chave: 'traseira', rotulo: 'traseira' },
  { chave: 'lateral_esquerda', rotulo: 'lateral esquerda' },
  { chave: 'lateral_direita', rotulo: 'lateral direita' },
  { chave: 'painel', rotulo: 'painel / km' },
  { chave: 'estofamento', rotulo: 'estofamento' },
  { chave: 'combustivel', rotulo: 'combustível' },
];

export interface DetalheReserva {
  reserva: Reserva;
  pagamento: Payment | null;
  caucao: DepositHold | null;
  enderecoExato: string | null;
  disputa: Dispute | null;
  avaliacoes: Avaliacao[];
  dentroDaJanelaCheckin: boolean;
}

type TipoVistoria = 'checkin' | 'checkout';

/**
 * Reservas e vistorias via API. A máquina de estados, os prazos, o pagamento e a caução rodam no
 * backend; aqui ficam só as listas em cache (como locatário e como proprietário) e as ações.
 */
@Injectable({ providedIn: 'root' })
export class BookingService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private readonly _reservas = signal<Reserva[]>([]);
  private readonly _doProprietario = signal<Reserva[]>([]);
  private readonly _detalhes = signal<Record<string, DetalheReserva>>({});

  /** Reservas em que sou o locatário. */
  readonly reservas = this._reservas.asReadonly();
  /** Reservas dos meus veículos (visão do proprietário). */
  readonly reservasProprietario = this._doProprietario.asReadonly();
  readonly todas = computed(() => [...this._reservas(), ...this._doProprietario()]);

  /** Recarrega as listas conforme os papéis da conta. */
  async carregar(): Promise<void> {
    const [loc, prop] = await Promise.all([
      this.auth.temPapel('locatario') ? this.api.get<any[]>('/reservas', { como: 'locatario' }) : Promise.resolve([]),
      this.auth.temPapel('proprietario') ? this.api.get<any[]>('/reservas', { como: 'proprietario' }) : Promise.resolve([]),
    ]);
    this._reservas.set(loc.map(mapReserva));
    this._doProprietario.set(prop.map(mapReserva));
  }

  porId(id: string): Reserva | undefined {
    return this._detalhes()[id]?.reserva ?? this.todas().find((r) => r.id === id);
  }

  detalhe(id: string): DetalheReserva | undefined {
    return this._detalhes()[id];
  }

  async carregarDetalhe(id: string): Promise<DetalheReserva | undefined> {
    try {
      const r = await this.api.get<any>(`/reservas/${id}`);
      const d: DetalheReserva = {
        reserva: mapReserva(r.reserva),
        pagamento: mapPagamento(r.pagamento),
        caucao: mapCaucao(r.caucao),
        enderecoExato: r.enderecoExato ?? null,
        disputa: mapDisputa(r.disputa),
        avaliacoes: r.avaliacoes ?? [],
        dentroDaJanelaCheckin: !!r.dentroDaJanelaCheckin,
      };
      this._detalhes.update((m) => ({ ...m, [id]: d }));
      return d;
    } catch {
      return undefined;
    }
  }

  private async depois(r: any): Promise<Reserva> {
    const reserva = mapReserva(r);
    await this.carregar();
    this._detalhes.update((m) => {
      const { [reserva.id]: _, ...resto } = m;
      return resto;
    });
    return reserva;
  }

  // ───────────── fluxo da reserva (RF12) ─────────────

  /** Cria a solicitação. Sem KYC aprovado → `aguardando_kyc` com hold de agenda; a UI leva ao KYC (BDD 9.1). */
  async solicitar(p: { veiculoId: string; inicio: string; fim: string; protecao: Protecao; finalidade?: string; origem?: string }): Promise<Reserva> {
    return this.depois(await this.api.post('/reservas', { ...p, protecao: p.protecao.toUpperCase() }));
  }

  async continuarAposKyc(id: string): Promise<Reserva> {
    return this.depois(await this.api.post(`/reservas/${id}/continuar-kyc`));
  }

  async aprovar(id: string): Promise<Reserva> {
    return this.depois(await this.api.post(`/reservas/${id}/aprovar`));
  }

  async rejeitar(id: string, motivo?: string): Promise<Reserva> {
    return this.depois(await this.api.post(`/reservas/${id}/rejeitar`, { motivo }));
  }

  /** Cobra e pré-autoriza a caução no servidor; o resultado pode ser `confirmada` ou `falha_pagamento`. */
  async pagar(id: string, metodo: 'pix' | 'cartao', numeroCartao?: string): Promise<Reserva> {
    return this.depois(await this.api.post(`/reservas/${id}/pagar`, { metodo, numeroCartao: numeroCartao?.replace(/\D/g, '') || undefined }));
  }

  async cancelar(id: string, motivo?: string): Promise<Reserva> {
    return this.depois(await this.api.post(`/reservas/${id}/cancelar`, { motivo }));
  }

  // ───────────── vistorias (RF03) ─────────────

  contarFotos(fotos: Vistoria['fotos']): number {
    return Object.values(fotos).filter((f) => f.status === 'enviada').length;
  }

  async carregarVistoria(id: string, tipo: TipoVistoria): Promise<Vistoria> {
    return mapVistoria(await this.api.get(`/reservas/${id}/vistorias/${tipo.toUpperCase()}`), id, tipo);
  }

  async salvarDadosVistoria(id: string, tipo: TipoVistoria, d: { km: number | null; combustivel: string; observacoes: string }): Promise<void> {
    await this.api.put(`/reservas/${id}/vistorias/${tipo.toUpperCase()}`, { km: d.km ?? undefined, combustivel: d.combustivel, observacoes: d.observacoes });
  }

  /** Envia a imagem da vistoria (multipart); só depois do 200 a foto conta como recebida. */
  async enviarFoto(id: string, tipo: TipoVistoria, chave: FotoChave, arquivo: Blob, onProgress?: (p: number) => void): Promise<void> {
    await this.api.upload(`/reservas/${id}/vistorias/${tipo.toUpperCase()}/fotos/${chave.toUpperCase()}`, { arquivos: { arquivo } }, onProgress);
  }

  async aceitarVistoria(id: string, tipo: TipoVistoria): Promise<Vistoria> {
    return mapVistoria(await this.api.post(`/reservas/${id}/vistorias/${tipo.toUpperCase()}/aceite`), id, tipo);
  }

  /** Conclui a vistoria (exige 7 fotos e os dois aceites). No check-out, `avaria` leva a `em_disputa`. */
  async concluirVistoria(id: string, tipo: TipoVistoria, avaria = false): Promise<Reserva> {
    return this.depois(await this.api.post(`/reservas/${id}/vistorias/${tipo.toUpperCase()}/concluir`, { avaria }));
  }
}
