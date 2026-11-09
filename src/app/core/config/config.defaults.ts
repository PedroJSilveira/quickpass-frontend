/**
 * Parâmetros configuráveis (QUICKPASS_REQUISITOS.md §11, RNF04).
 * Nenhuma regra de negócio deve usar número literal: leia via AppConfigService.
 *
 * Estes são só valores de reserva até a API responder: a fonte da verdade é o backend
 * (`GET /api/config/publica`), carregada no início do app.
 *
 * Chaves marcadas em `PROVISORIOS` estão "a definir" no documento. O valor
 * abaixo é só um padrão provisório para o protótipo funcionar e DEVE ser
 * validado pela equipe (pontos em aberto §14).
 */
export const CONFIG_DEFAULTS = {
  HOLD_KYC_MINUTOS: 15,
  PRAZO_APROVACAO_RESERVA_HORAS: 24,
  PRAZO_PAGAMENTO_HORAS: 24, // provisório (janela para pagar após aprovação)
  JANELA_CHECKIN_MINUTOS: 120, // provisório
  PRAZO_LIBERACAO_CAUCAO_HORAS: 24,
  PRAZO_CONTESTACAO_HORAS: 48, // provisório
  PRAZO_AVALIACAO_HORAS: 72,
  DIAS_SEM_OFERTA: 15,
  HORIZONTE_DISPONIBILIDADE_DIAS: 14,
  MAX_AVISOS_SEMANA: 1,
  MAX_AVISOS_TOTAL: 4, // provisório
  JANELA_DEMANDA_DIAS: 7,
  RAIO_DEMANDA_KM: 5, // provisório
  MIN_BUSCAS_DEMANDA: 10, // provisório
  AMOSTRA_MINIMA_REGIAO: 20, // provisório
  JANELA_DESFAZER_AGENDA_MIN: 10, // provisório
  JANELA_ATRIBUICAO_NOTIFICACAO_MIN: 30, // provisório
  LIMITE_NOTIFICACOES_GLOBAL_SEMANA: 3, // provisório
  REFERRAL_BONUS_VALOR: 0, // provisório
  REFERRAL_TETO_PERIODO: 0, // provisório
  META_GUARDRAIL_DISPUTA: 3,
  META_GUARDRAIL_CHURN_SILENCIOSO: 15,
  /** Peso da reputação na ordenação da busca (0..1) — ponto em aberto §14.8. */
  PESO_REPUTACAO_RANKING: 0.3, // provisório
  /** Peso da completude do anúncio no ranking (0..1) — ponto em aberto §14.8. */
  PESO_COMPLETUDE_RANKING: 0.2, // provisório
  /** Reembolso (%) por antecedência do cancelamento — ponto em aberto §14.5. */
  CANCELAMENTO_REEMBOLSO_TOTAL_HORAS: 48, // provisório
  CANCELAMENTO_REEMBOLSO_PARCIAL_PCT: 50, // provisório
  /** Nota mínima do locatário para aprovação automática (RF06/RF12). */
  NOTA_MINIMA_APROVACAO_AUTOMATICA: 4.5, // provisório
  /** Experimento RF09 (isenção de taxa na 1ª locação). */
  EXP_RF09_DURACAO_DIAS: 60, // provisório
  EXP_RF09_ORCAMENTO: 5000, // provisório
  EXP_RF09_PCT_TRATAMENTO: 50, // provisório
  EXP_RF09_ATIVACAO_DIAS: 30, // provisório
  /** Fotos obrigatórias por vistoria (RF03). */
  FOTOS_VISTORIA_OBRIGATORIAS: 7,
  /** Fotos mínimas para anunciar um veículo. */
  FOTOS_VEICULO_MINIMAS: 6,
} as const;

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;

export const PROVISORIOS: readonly ConfigKey[] = [
  'NOTA_MINIMA_APROVACAO_AUTOMATICA',
  'EXP_RF09_DURACAO_DIAS',
  'EXP_RF09_ORCAMENTO',
  'EXP_RF09_PCT_TRATAMENTO',
  'EXP_RF09_ATIVACAO_DIAS',
  'PRAZO_PAGAMENTO_HORAS',
  'JANELA_CHECKIN_MINUTOS',
  'PRAZO_CONTESTACAO_HORAS',
  'MAX_AVISOS_TOTAL',
  'RAIO_DEMANDA_KM',
  'MIN_BUSCAS_DEMANDA',
  'AMOSTRA_MINIMA_REGIAO',
  'JANELA_DESFAZER_AGENDA_MIN',
  'JANELA_ATRIBUICAO_NOTIFICACAO_MIN',
  'LIMITE_NOTIFICACOES_GLOBAL_SEMANA',
  'REFERRAL_BONUS_VALOR',
  'REFERRAL_TETO_PERIODO',
  'PESO_REPUTACAO_RANKING',
  'PESO_COMPLETUDE_RANKING',
  'CANCELAMENTO_REEMBOLSO_TOTAL_HORAS',
  'CANCELAMENTO_REEMBOLSO_PARCIAL_PCT',
];
