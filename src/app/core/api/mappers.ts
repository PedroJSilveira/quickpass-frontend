import {
  Avaliacao,
  CanalNotificacao,
  Conta,
  Consentimentos,
  DecisaoDisputa,
  DepositHold,
  Dispute,
  FotoChave,
  FotosVistoria,
  Notificacao,
  Papel,
  Payment,
  Repasse,
  Reserva,
  SavedSearch,
  Solicitacao,
  StatusVeiculo,
  Veiculo,
  Vistoria,
} from '../models/domain.models';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

const baixo = (s: string | null | undefined) => (s ?? '').toLowerCase();

export const FOTO_CHAVES: FotoChave[] = ['frente', 'traseira', 'lateral_esquerda', 'lateral_direita', 'painel', 'estofamento', 'combustivel'];

const STATUS_VEICULO: Record<string, StatusVeiculo> = { APROVADO: 'Aprovado', EM_ANALISE: 'Em análise', RECUSADO: 'Recusado' };

export function paraPapeis(raw: string[]): Papel[] {
  return raw.filter((p) => p === 'LOCATARIO' || p === 'PROPRIETARIO').map((p) => baixo(p) as Papel);
}

export function mapConta(u: Raw): Conta {
  const cons = {} as Consentimentos;
  for (const canal of ['push', 'email', 'sms'] as CanalNotificacao[]) {
    const c = u.consentimentos?.[canal.toUpperCase()] ?? {};
    cons[canal] = { marketing: !!c['MARKETING'], transacional: c['TRANSACIONAL'] !== false };
  }
  const o = u.origem;
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    cpf: u.cpf,
    papeis: paraPapeis(u.papeis ?? []),
    admin: (u.papeis ?? []).includes('ADMIN'),
    kyc: { doc: !!u.kyc?.doc, cnh: !!u.kyc?.cnh, selfie: !!u.kyc?.selfie, banco: !!u.kyc?.banco, aprovado: !!u.kyc?.aprovado },
    nota: u.nota,
    cnhAnos: u.cnhAnos,
    membroDesde: u.membroDesde,
    validadeCnh: u.validadeCnh ?? '',
    origem: o
      ? {
          canal: baixo(o.canal) as any,
          utm_source: o.utmSource ?? null,
          utm_medium: o.utmMedium ?? null,
          utm_campaign: o.utmCampaign ?? null,
          utm_term: o.utmTerm ?? null,
          utm_content: o.utmContent ?? null,
          referral_code: o.referralCode ?? null,
          capturadaEm: o.capturadaEm,
        }
      : null,
    consentimentos: cons,
  };
}

export function mapVeiculo(v: Raw): Veiculo {
  return {
    id: v.id,
    titulo: v.titulo,
    foto: v.foto ?? '',
    fotos: v.fotos?.length ? v.fotos : v.foto ? [v.foto] : [],
    marca: v.marca,
    modelo: v.modelo,
    ano: v.ano,
    placa: v.placa,
    categoria: v.categoria,
    diaria: v.diaria,
    local: v.local,
    enderecoExato: v.enderecoExato,
    distanciaKm: v.distanciaKm ?? 0,
    cambio: v.cambio,
    combustivel: v.combustivel,
    lugares: v.lugares,
    km: v.km,
    consumo: v.consumo ?? '—',
    proprietarioId: v.proprietarioId,
    proprietarioNome: v.proprietarioNome ?? '',
    proprietarioIniciais: v.proprietarioIniciais ?? '',
    proprietarioNota: v.proprietarioNota ?? 0,
    status: STATUS_VEICULO[v.status] ?? 'Em análise',
    motivoRecusa: v.motivoRecusa ?? null,
    nota: v.nota ?? null,
    locacoes: v.locacoes ?? 0,
    manutencao: v.manutencao ?? [],
    docValidoAte: v.docValidoAte ?? undefined,
  };
}

export function mapReserva(r: Raw): Reserva {
  return {
    id: r.id,
    veiculoId: r.veiculoId,
    locatarioId: r.locatarioId,
    inicio: r.inicio,
    fim: r.fim,
    protecao: baixo(r.protecao) as any,
    status: baixo(r.status) as any,
    valores: r.valores,
    avaliada: !!r.avaliada,
    concluidaEm: r.concluidaEm ?? null,
    finalidade: r.finalidade ?? undefined,
    origem: r.origem ?? 'busca',
    criadaEm: r.criadaEm,
    holdExpiraEm: r.holdExpiraEm ?? null,
    aprovacaoExpiraEm: r.aprovacaoExpiraEm ?? null,
    checkoutEm: r.checkoutEm ?? null,
    veiculoTitulo: r.veiculoTitulo ?? 'Veículo',
    veiculoFoto: r.veiculoFoto ?? '',
    proprietarioId: r.proprietarioId ?? '',
    locatarioNome: r.locatarioNome ?? 'Locatário',
    disputaId: r.disputaId ?? null,
    disputaStatus: r.disputaStatus ?? null,
  };
}

export function mapPagamento(p: Raw): Payment | null {
  if (!p) return null;
  return { ...p, status: baixo(p.status) as any };
}

export function mapCaucao(c: Raw): DepositHold | null {
  return c ?? null;
}

const decisao = (d: Raw): DecisaoDisputa | null => (d ? { ...d, tipo: baixo(d.tipo) as any } : null);

export function mapDisputa(d: Raw): Dispute | null {
  if (!d) return null;
  return {
    id: d.id,
    reservaId: d.reservaId,
    status: d.status,
    avaria: { ...d.avaria, fotos: d.avaria?.fotos ?? [] },
    contestacao: d.contestacao ? { ...d.contestacao, evidencias: d.contestacao.evidencias ?? [] } : null,
    contestarAte: d.contestarAte,
    decisao: decisao(d.decisao),
  };
}

export function mapVistoria(v: Raw, reservaId: string, tipo: 'checkin' | 'checkout'): Vistoria {
  const fotos = {} as FotosVistoria;
  for (const k of FOTO_CHAVES) {
    const f = v?.fotos?.[k.toUpperCase()];
    fotos[k] = f?.enviada
      ? { status: 'enviada', progresso: 100, tentativas: 0, arquivoId: f.arquivoId ?? null, tiradaEm: f.tiradaEm ?? null, localAproximada: f.localAproximada ?? null }
      : { status: 'pendente', progresso: 0, tentativas: 0, arquivoId: null, tiradaEm: null, localAproximada: null };
  }
  return {
    reservaId,
    tipo,
    fotos,
    km: v?.km ?? null,
    combustivel: v?.combustivel ?? '3/4',
    observacoes: v?.observacoes ?? '',
    criadaEm: v?.criadaEm ?? '',
    aceiteLocatario: !!v?.aceiteLocatario,
    aceiteProprietario: !!v?.aceiteProprietario,
  };
}

export function mapSolicitacao(s: Raw): Solicitacao {
  return {
    id: s.id,
    reservaId: s.reservaId,
    veiculoId: s.veiculoId,
    veiculoTitulo: s.veiculoTitulo ?? 'Veículo',
    locatario: s.locatario,
    inicio: s.inicio,
    fim: s.fim,
    diaria: s.diaria,
    finalidade: s.finalidade,
    status: baixo(s.status) as any,
    expiraEm: s.expiraEm,
  };
}

export function mapRepasse(r: Raw): Repasse {
  return {
    reservaId: r.reservaId,
    veiculoId: r.veiculoId,
    veiculoTitulo: r.veiculoTitulo,
    periodo: r.periodo,
    bruto: r.bruto,
    taxa: r.taxa,
    liquido: r.liquido,
    status: r.status === 'PAGO' ? 'Pago' : 'Previsto',
    pagoEm: r.pagoEm ?? null,
  };
}

export function mapNotificacao(n: Raw): Notificacao {
  return { ...n, canal: baixo(n.canal) as any, tipo: baixo(n.tipo) as any, link: n.link ?? null, motivoDados: n.motivoDados ?? {}, abertaEm: n.abertaEm ?? null };
}

export function mapBusca(b: Raw): SavedSearch {
  return { ...b, categoria: b.categoria ?? 'Todos', precoMax: b.precoMax ?? null };
}

export function mapAvaliacao(a: Raw): Avaliacao {
  return { ...a, autorPapel: baixo(a.autorPapel) as Papel, publicadaEm: a.publicadaEm ?? null, selos: a.selos ?? [] };
}
