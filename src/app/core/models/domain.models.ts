export type Papel = 'locatario' | 'proprietario';

export interface Kyc {
  doc: boolean;
  cnh: boolean;
  selfie: boolean;
  banco: boolean;
  aprovado: boolean;
}

export interface Conta {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  papel: Papel;
  kyc: Kyc;
  nota: number;
  cnhAnos: number;
  membroDesde: string;
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
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  categoria: CategoriaVeiculo;
  diaria: number;
  local: string;
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
  status: StatusVeiculo;
  nota: number | null;
  locacoes: number;
  manutencao: ItemManutencao[];
}

export interface Disponibilidade {
  veiculoId: string;
  dias: Record<string, boolean>; // ISO date -> liberado
  aceiteAutomatico: boolean;
}

export type StatusReserva =
  | 'aguardando'
  | 'confirmada'
  | 'em_andamento'
  | 'concluida'
  | 'recusada';

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
  valores: Valores; // congelado no momento do pagamento
  avaliada: boolean;
}

export interface FotosVistoria {
  frente: boolean;
  traseira: boolean;
  laterais: boolean;
  painel: boolean;
}

export interface Vistoria {
  reservaId: string;
  tipo: 'checkin' | 'checkout';
  fotos: FotosVistoria;
  km: number | null;
  combustivel: string;
  observacoes: string;
  criadaEm: string;
}

export type StatusSolicitacao = 'pendente' | 'aceita' | 'recusada';

export interface Solicitacao {
  id: string;
  reservaId: string;
  veiculoId: string;
  locatario: { nome: string; idade: number; cnhAnos: number; nota: number; locacoes: number };
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
  alvoId: string;
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
