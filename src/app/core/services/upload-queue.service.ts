import { Injectable } from '@angular/core';
import { FotoVistoria } from '../models/domain.models';

export type AtualizarFoto = (patch: Partial<FotoVistoria>) => void;

const MAX_TENTATIVAS = 4;

/**
 * Fila de upload de fotos de vistoria (RNF01): compressão local, envio
 * sequencial em segundo plano, retentativa com backoff e espera por
 * conectividade. O status só vira `enviada` após a confirmação do "servidor"
 * (aqui simulado por `enviarAoServidor`, substituível por HttpClient).
 */
@Injectable({ providedIn: 'root' })
export class UploadQueueService {
  /** Simulação de rede instável nos testes/demonstração (0..1). */
  taxaFalhaSimulada = 0;
  atrasoMs = 400;
  backoffBaseMs = 500;

  private fila: Promise<void> = Promise.resolve();

  /** Comprime a imagem no cliente (lado maior ≤ maxLado, JPEG). Sem DOM, devolve o arquivo original. */
  async comprimir(arquivo: Blob, maxLado = 1280, qualidade = 0.7): Promise<Blob> {
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
  enfileirar(arquivo: Blob, atualizar: AtualizarFoto): Promise<void> {
    atualizar({ status: 'na_fila', progresso: 0, tiradaEm: new Date().toISOString() });
    this.fila = this.fila.then(() => this.processar(arquivo, atualizar));
    return this.fila;
  }

  /** Reenvia manualmente uma foto que falhou. */
  reenviar(arquivo: Blob, atualizar: AtualizarFoto): Promise<void> {
    return this.enfileirar(arquivo, atualizar);
  }

  private async processar(arquivo: Blob, atualizar: AtualizarFoto): Promise<void> {
    const comprimido = await this.comprimir(arquivo);
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      await this.aguardarConexao();
      atualizar({ status: 'enviando', tentativas: tentativa, progresso: 0 });
      try {
        await this.enviarAoServidor(comprimido, (p) => atualizar({ progresso: p }));
        atualizar({ status: 'enviada', progresso: 100 });
        return;
      } catch {
        if (tentativa === MAX_TENTATIVAS) break;
        await this.dormir(this.backoffBaseMs * 2 ** (tentativa - 1));
      }
    }
    atualizar({ status: 'falhou' });
  }

  private async enviarAoServidor(_blob: Blob, progresso: (p: number) => void): Promise<void> {
    for (const p of [25, 60, 90]) {
      await this.dormir(this.atrasoMs / 3);
      progresso(p);
    }
    if (Math.random() < this.taxaFalhaSimulada) throw new Error('falha de rede simulada');
  }

  private async aguardarConexao(): Promise<void> {
    if (typeof navigator === 'undefined' || navigator.onLine) return;
    await new Promise<void>((resolve) => globalThis.addEventListener('online', () => resolve(), { once: true }));
  }

  private dormir(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
