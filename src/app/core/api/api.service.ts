import { HttpClient, HttpErrorResponse, HttpEventType, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, filter, map } from 'rxjs';
import { API_BASE } from './api.config';

type Params = Record<string, string | number | boolean | null | undefined>;

/** Extrai a mensagem de negócio devolvida pela API (`{ mensagem, campos }`) ou uma genérica. */
export function mensagemErro(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Não foi possível conectar ao servidor. Verifique se a API está no ar.';
    const b = e.error as { mensagem?: string; campos?: Record<string, string> } | null;
    if (b?.campos && Object.keys(b.campos).length) {
      return Object.entries(b.campos).map(([c, m]) => `${c}: ${m}`).join(' · ');
    }
    if (b?.mensagem) return b.mensagem;
    return `Erro ${e.status}`;
  }
  return (e as Error)?.message ?? 'Erro inesperado.';
}

/** Cliente HTTP fino da API: devolve Promises e já resolve a URL base. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  private params(p?: Params): HttpParams {
    let hp = new HttpParams();
    for (const [k, v] of Object.entries(p ?? {})) if (v !== null && v !== undefined && v !== '') hp = hp.set(k, String(v));
    return hp;
  }

  get<T>(path: string, params?: Params): Promise<T> {
    return firstValueFrom(this.http.get<T>(API_BASE + path, { params: this.params(params) }));
  }
  post<T>(path: string, body?: unknown, params?: Params): Promise<T> {
    return firstValueFrom(this.http.post<T>(API_BASE + path, body ?? null, { params: this.params(params) }));
  }
  put<T>(path: string, body?: unknown, params?: Params): Promise<T> {
    return firstValueFrom(this.http.put<T>(API_BASE + path, body ?? null, { params: this.params(params) }));
  }
  patch<T>(path: string, body?: unknown, params?: Params): Promise<T> {
    return firstValueFrom(this.http.patch<T>(API_BASE + path, body ?? null, { params: this.params(params) }));
  }
  delete<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.delete<T>(API_BASE + path));
  }

  /**
   * Envia multipart/form-data. Partes JSON (`dados`) vão como Blob application/json; arquivos
   * como partes repetidas com o mesmo nome. O Content-Type (com boundary) é do navegador.
   */
  upload<T>(path: string, partes: { dados?: unknown; arquivos?: Record<string, Blob | Blob[]>; campos?: Record<string, string | null | undefined> }, onProgress?: (pct: number) => void): Promise<T> {
    const form = new FormData();
    if (partes.dados !== undefined) form.append('dados', new Blob([JSON.stringify(partes.dados)], { type: 'application/json' }));
    for (const [nome, v] of Object.entries(partes.arquivos ?? {})) {
      for (const f of Array.isArray(v) ? v : [v]) form.append(nome, f, (f as File).name || 'arquivo');
    }
    for (const [k, v] of Object.entries(partes.campos ?? {})) if (v) form.append(k, v);
    return firstValueFrom(
      this.http.post<T>(API_BASE + path, form, { observe: 'events', reportProgress: true }).pipe(
        map((ev) => {
          if (ev.type === HttpEventType.UploadProgress && ev.total) onProgress?.(Math.round((ev.loaded / ev.total) * 100));
          return ev;
        }),
        filter((ev) => ev.type === HttpEventType.Response),
        map((ev) => (ev as { body: T }).body),
      ),
    );
  }

  /** Baixa um arquivo protegido (com o token) como Blob, para exibir via object URL. */
  blob(urlRelativa: string): Promise<Blob> {
    const url = urlRelativa.startsWith('/api/') ? API_BASE.replace(/\/api$/, '') + urlRelativa : urlRelativa;
    return firstValueFrom(this.http.get(url, { responseType: 'blob' }));
  }
}
