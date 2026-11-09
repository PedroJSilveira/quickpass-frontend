/**
 * Endereço da API Spring Boot (quickpass-backend). Em produção, troque pelo domínio real
 * (ou sirva frontend e API na mesma origem e use '/api').
 */
export const API_ORIGIN = 'http://localhost:8080';
export const API_BASE = `${API_ORIGIN}/api`;

/** Resolve a URL de uma imagem: `/api/arquivos/…` aponta para a API; `assets/…` é estático do app. */
export function urlImagem(u: string | null | undefined): string {
  if (!u) return '';
  return u.startsWith('/api/') ? API_ORIGIN + u : u;
}
