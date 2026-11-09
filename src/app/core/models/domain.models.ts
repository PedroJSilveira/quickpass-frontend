export type Papel = 'locatario' | 'proprietario';

/** Papéis que podem aparecer em eventos analíticos (inclui não autenticado e mediador). */
export type PapelEvento = Papel | 'visitante' | 'admin';

/** Status do KYC (RF02). */
export type StatusKyc = 'PENDENTE' | 'EM_ANALISE' | 'APROVADO' | 'REPROVADO' | 'EXPIRADO';

export type CanalOrigem =
  | 'hiperlocal'
  | 'busca_organica'
  | 'referral'
  | 'midia_paga'
  | 'direto'
  | 'desconhecido';

/** Atribuição first-touch gravada no cadastro e imutável (RF08). */
export interface AcquisitionAttribution {
  readonly canal: CanalOrigem;
  readonly utm_source: string | null;
  readonly utm_medium: string | null;
  readonly utm_campaign: string | null;
  readonly utm_term: string | null;
  readonly utm_content: string | null;
  readonly referral_code: string | null;
  readonly capturadaEm: string;
}

export interface Kyc {
  doc: boolean;
  cnh: boolean;
  selfie: boolean;
  banco: boolean;
  aprovado: boolean;
}

export type CanalNotificacao = 'push' | 'email' | 'sms';
export type FinalidadeConsentimento = 'marketing' | 'transacional';
export type Consentimentos = Record<CanalNotificacao, Record<FinalidadeConsentimento, boolean>>;

export interface Conta {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  /** Papéis de uso (locatário e/ou proprietário). Contas admin só nascem direto no banco. */
  papeis: Papel[];
  admin: boolean;
  kyc: Kyc;
  nota: number;
  cnhAnos: number;
  membroDesde: string;
  /** Validade da CNH (ISO). O KYC expira junto (RF02). */
  validadeCnh: string;
  /** Origem de aquisição, first-touch e imutável (RF08). */
  origem: AcquisitionAttribution | null;
  consentimentos: Consentimentos;
}

export type CategoriaVeiculo = 'Hatch' | 'Sedã' | 'SUV' | 'Híbrido' | 'Elétrico';
export type Cambio = 'Manual' | 'Automático';
export type Combustivel = 'Flex' | 'Híbrido' | 'Elétrico';
export type StatusVeiculo = 'Aprovado' | 'Em análise' | 'Recusado';

export interface ItemManutencao {
  chave: string;
  valor: string;
}

export interface Veiculo {
  id: string;
  titulo: string;
  foto: string;
  /** Todas as fotos do anúncio (URLs; a primeira é a capa). */
  fotos: string[];
  marca: string;
  modelo: string;
  ano: number;
  /** Só presente na visão do proprietário/admin. */
  placa?: string;
  categoria: CategoriaVeiculo;
  diaria: number;
  /** Localização APROXIMADA (bairro) — única exibida em busca/público (RNF02). */
  local: string;
  /** Endereço exato: só revelado após KYC aprovado e pagamento confirmado (RNF02). */
  enderecoExato?: string;
  distanciaKm: number;
  cambio: Cambio;
  combustivel: Combustivel;
  lugares: number;
  km: number;
  consumo: string;
  proprietarioId: string;
  proprietarioNome: string;
  proprietarioIniciais: string;
  proprietarioNota: number;
  motivoRecusa?: string | null;
  status: StatusVeiculo;
  nota: number | null;
  locacoes: number;
  manutencao: ItemManutencao[];
  /** Validade de documentação/seguro (ISO). Vencido bloqueia publicar agenda (RF11). */
  docValidoAte?: string;
}

export interface Disponibilidade {
  veiculoId: string;
  dias: Record<string, boolean>; // ISO date -> liberado
  aceiteAutomatico: boolean;
}

/**
 * Estados da reserva (QUICKPASS_REQUISITOS.md §4.2). Transições válidas ficam
 * em `TRANSICOES_RESERVA` (booking.service).
 */
export type StatusReserva =
  | 'aguardando_kyc'
  | 'solicitada'
  | 'aprovada'
  | 'confirmada'
  | 'em_andamento'
  | 'em_disputa'
  | 'concluida'
  | 'rejeitada'
  | 'expirada'
  | 'cancelada'
  | 'falha_pagamento';

export type Protecao = 'basica' | 'completa';

export interface Valores {
  diaria: number;
  dias: number;
  subtotal: number;
  protecao: number;
  taxa: number;
  total: number;
  repasse: number;
  caucao: number;
}

export interface Reserva {
  id: string; // "QP-2301"
  veiculoId: string;
  locatarioId: string;
  inicio: string; // ISO date
  fim: string; // ISO date
  protecao: Protecao;
  status: StatusReserva;
  valores: Valores; // congelado no momento da solicitação
  avaliada: boolean;
  /** Momento em que a reserva foi concluída (semana ISO da North Star). */
  concluidaEm?: string | null;
  /** Finalidade declarada pelo locatário (exibida ao proprietário). */
  finalidade?: string;
  /** Origem da solicitação (ex.: 'busca', 'radar'). */
  origem: string;
  criadaEm: string;
  /** Hold na agenda: vale enquanto status ∈ {aguardando_kyc, solicitada, aprovada}. */
  holdExpiraEm: string | null;
  /** Prazo para o proprietário responder (RF12). */
  aprovacaoExpiraEm: string | null;
  /** Janela de caução/disputa começa no check-out. */
  checkoutEm: string | null;
  /** Dados de apoio às listas (vêm junto da reserva). */
  veiculoTitulo: string;
  veiculoFoto: string;
  proprietarioId: string;
  locatarioNome: string;
  disputaId: string | null;
  disputaStatus: StatusDisputa | null;
}

/** As 7 fotos obrigatórias de cada vistoria (RF03). */
export type FotoChave =
  | 'frente'
  | 'traseira'
  | 'lateral_esquerda'
  | 'lateral_direita'
  | 'painel'
  | 'estofamento'
  | 'combustivel';

export type StatusUpload = 'pendente' | 'na_fila' | 'enviando' | 'enviada' | 'falhou';

export interface FotoVistoria {
  status: StatusUpload;
  /** Arquivo já recebido pelo servidor (baixável pelas partes). */
  arquivoId: string | null;
  /** 0..100 */
  progresso: number;
  tentativas: number;
  /** Momento da captura (ISO). */
  tiradaEm: string | null;
  /** Localização aproximada opcional (bairro) — nunca lat/long (RNF02). */
  localAproximada: string | null;
}

export type FotosVistoria = Record<FotoChave, FotoVistoria>;

export interface Vistoria {
  reservaId: string;
  tipo: 'checkin' | 'checkout';
  fotos: FotosVistoria;
  km: number | null;
  combustivel: string;
  observacoes: string;
  criadaEm: string;
  aceiteLocatario: boolean;
  aceiteProprietario: boolean;
}

export type StatusSolicitacao = 'pendente' | 'aceita' | 'recusada' | 'expirada';

export interface Solicitacao {
  id: string;
  reservaId: string;
  veiculoId: string;
  veiculoTitulo: string;
  locatario: { nome: string; cnhAnos: number; nota: number; locacoes: number };
  inicio: string;
  fim: string;
  diaria: number;
  finalidade: string;
  status: StatusSolicitacao;
  expiraEm: string; // 12h após a criação
}

export interface Avaliacao {
  reservaId: string;
  autorId: string;
  /** Papel de quem avaliou: define quem é o alvo (veículo/proprietário ou locatário). */
  autorPapel: Papel;
  alvoId: string;
  enviadaEm: string;
  /** Preenchido quando a avaliação é publicada (RF06). */
  publicadaEm: string | null;
  nota: 1 | 2 | 3 | 4 | 5;
  texto: string;
  selos: string[];
}

export type StatusRepasse = 'Previsto' | 'Pago';

export interface Repasse {
  reservaId: string;
  veiculoId: string;
  veiculoTitulo: string;
  periodo: string;
  bruto: number;
  taxa: number;
  liquido: number;
  status: StatusRepasse;
  pagoEm: string | null;
}

/** Estados da caução (§4.3). */
export type StatusCaucao =
  | 'PENDENTE_PRE_AUTORIZACAO'
  | 'PRE_AUTORIZADA'
  | 'FALHA'
  | 'RETIDA_EM_DISPUTA'
  | 'CAPTURADA_TOTAL'
  | 'CAPTURADA_PARCIAL'
  | 'LIBERADA';

export interface DepositHold {
  reservaId: string;
  valor: number;
  status: StatusCaucao;
  preAutorizadaEm: string | null;
  /** Validade da pré-autorização do cartão (deve cobrir locação + prazo de disputa). */
  validaAte: string | null;
  /** Valor efetivamente capturado (só após decisão registrada). */
  valorCapturado: number;
  liberarEm: string | null;
}

/** Arquivo enviado (foto/evidência); `url` é relativa à API. */
export interface ArquivoRef {
  id: string;
  nome: string;
  contentType: string;
  url: string;
}

/** Estados da disputa (§4.4). */
export type StatusDisputa =
  | 'ABERTA'
  | 'AGUARDANDO_CONTESTACAO'
  | 'CONTESTADA'
  | 'NAO_CONTESTADA_NO_PRAZO'
  | 'EM_ANALISE'
  | 'DECIDIDA';

export type TipoDecisao = 'captura_total' | 'captura_parcial' | 'liberacao';

export interface DecisaoDisputa {
  tipo: TipoDecisao;
  valor: number;
  justificativa: string;
  decididaPor: string;
  decididaEm: string;
}

export interface Dispute {
  id: string;
  reservaId: string;
  status: StatusDisputa;
  /** DamageReport do proprietário. */
  avaria: { descricao: string; qtdFotos: number; informadaEm: string; valorEstimado: number; fotos: ArquivoRef[] };
  contestacao: { texto: string; qtdEvidencias: number; enviadaEm: string; evidencias: ArquivoRef[] } | null;
  contestarAte: string;
  decisao: DecisaoDisputa | null;
}

export type StatusPagamento =
  | 'pendente'
  | 'finalizado'
  | 'falhou'
  | 'estornado_parcial'
  | 'estornado_total';

export interface Payment {
  reservaId: string;
  valorDiaria: number;
  taxaPlataforma: number;
  desconto: number;
  total: number;
  estornado: number;
  status: StatusPagamento;
  pagoEm: string | null;
}

export type TipoNotificacao = 'revisao_agenda' | 'demanda_local' | 'radar' | 'avaria_informada';

/** Notificação enviada, com o dado que a justificou (RNF03). */
export interface Notificacao {
  id: string;
  userId: string;
  canal: CanalNotificacao;
  tipo: TipoNotificacao;
  titulo: string;
  texto: string;
  link: string | null;
  motivoDados: Record<string, unknown>;
  enviadaEm: string;
  abertaEm: string | null;
}

/** Busca salva do locatário (RF14): localização aproximada, nunca exata. */
export interface SavedSearch {
  id: string;
  renterId: string;
  regiao: string;
  raioKm: number;
  inicio: string;
  fim: string;
  categoria: string;
  precoMax: number | null;
  alertasAtivos: boolean;
  pausada: boolean;
  criadaEm: string;
}

/** Template do "liberar agenda com um toque" (RF11). */
export interface AvailabilityTemplate {
  tipo: 'proximo_fim_de_semana' | 'sexta_a_domingo';
  /** Quantidade de semanas (só em `sexta_a_domingo`). */
  semanas: number;
}

/** Preferências do anúncio que melhoram o próximo ciclo (RF17). */
export interface PreferenciasAnuncio {
  antecedenciaMinimaHoras: number;
  duracaoMinimaDias: number;
}
