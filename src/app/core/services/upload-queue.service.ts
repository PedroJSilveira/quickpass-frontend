import { Injectable } from '@angular/core';
import { FotoVistoria } from '../models/domain.models';

export type AtualizarFoto = (patch: Partial<FotoVistoria>) => void;
/** Faz o envio de verdade (HTTP multipart); lança se falhar. */
export type EnviarArquivo = (blob: Blob, progresso: (p: number) => void) => Promise<void>;

const MAX_TENTATIVAS = 4;

/**
 * Fila de upload de fotos de vistoria (RNF01): compressão local, envio sequencial em segundo
 * plano, retentativa com backoff e espera por conectividade. O status só vira `enviada` depois
 * que o servidor responde 200 ao multipart.
 */
@Injectable({ providedIn: 'root' })
export class UploadQueueService {
  backoffBaseMs = 500;
  private fila: Promise<void> = Promise.resolve();

  /** Comprime a imagem no cliente (lado maior ≤ maxLado, JPEG). Sem DOM, devolve o arquivo original. */
  async comprimir(arquivo: Blob, maxLado = 1600, qualidade = 0.8): Promise<Blob> {
    if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return arquivo;
    try {
      const bmp = await createImageBitmap(arquivo);
      const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * escala);
      canvas.height = Math.round(bmp.height * escala);
      canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', qualidade));
      return blob && blob.size < arquivo.size ? blob : arquivo;
    } catch {
      return arquivo;
    }
  }

  /** Enfileira o envio de uma foto; resolve quando enviada ou esgotadas as tentativas. */
  enfileirar(arquivo: Blob, atualizar: AtualizarFoto, enviar: EnviarArquivo): Promise<void> {
    atualizar({ status: 'na_fila', progresso: 0, tiradaEm: new Date().toISOString() });
    this.fila = this.fila.then(() => this.processar(arquivo, atualizar, enviar));
    return this.fila;
  }

  private async processar(arquivo: Blob, atualizar: AtualizarFoto, enviar: EnviarArquivo): Promise<void> {
    const comprimido = await this.comprimir(arquivo);
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      await this.aguardarConexao();
      atualizar({ status: 'enviando', tentativas: tentativa, progresso: 0 });
      try {
        await enviar(comprimido, (p) => atualizar({ progresso: p }));
        atualizar({ status: 'enviada', progresso: 100 });
        return;
      } catch (e) {
        // Recusa de negócio (4xx, ex.: formato inválido ou vistoria já concluída) não adianta repetir.
        const status = (e as { status?: number }).status ?? 0;
        if (status >= 400 && status < 500 && status !== 408 && status !== 429) break;
        if (tentativa === MAX_TENTATIVAS) break;
        await this.dormir(this.backoffBaseMs * 2 ** (tentativa - 1));
      }
    }
    atualizar({ status: 'falhou' });
  }

  private async aguardarConexao(): Promise<void> {
    if (typeof navigator === 'undefined' || navigator.onLine) return;
    await new Promise<void>((resolve) => globalThis.addEventListener('online', () => resolve(), { once: true }));
  }

  private dormir(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
