import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_ORIGIN } from './api.config';
import { SessaoStore } from './sessao.store';

/** Anexa token, papel ativo e sessão às chamadas à API; sessão expirada (401) volta para o login. */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_ORIGIN)) return next(req);
  const sessao = inject(SessaoStore);
  const router = inject(Router);
  const headers: Record<string, string> = { 'X-Session-Id': sessao.sessionId };
  if (sessao.token) headers['Authorization'] = `Bearer ${sessao.token}`;
  const papel = sessao.papelAtivo();
  if (papel) headers['X-Papel-Ativo'] = papel.toUpperCase();
  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((e: unknown) => {
      if (e instanceof HttpErrorResponse && e.status === 401 && sessao.token && !req.url.includes('/auth/login')) {
        sessao.definirToken(null);
        sessao.definirPapel(null);
        router.navigate(['/entrar'], { queryParams: { expirou: 1 } });
      }
      return throwError(() => e);
    }),
  );
};
