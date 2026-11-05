import { Injectable, inject } from '@angular/core';
import { BookingService } from './booking.service';
import { ReviewService } from './review.service';

/**
 * Health Score de confiança (0–100) a partir de reputação publicada e de
 * locações concluídas. NÃO considera indicações (RF10): reputação de confiança
 * não cresce por indicar amigos.
 */
@Injectable({ providedIn: 'root' })
export class HealthScoreService {
  private reviews = inject(ReviewService);
  private booking = inject(BookingService);

  calcular(userId: string, papel: 'locatario' | 'proprietario'): number {
    const rep = papel === 'locatario' ? this.reviews.reputacaoDoLocatario(userId) : this.reputacaoComoProprietario(userId);
    const concluidas = this.booking.reservas().filter((r) => r.locatarioId === userId && r.status === 'concluida').length;
    const notaPct = rep.media === null ? 50 : (rep.media / 5) * 100;
    return Math.round(Math.min(100, notaPct * 0.8 + Math.min(concluidas, 10) * 2));
  }

  private reputacaoComoProprietario(userId: string): { media: number | null } {
    const notas = this.reviews
      .publicadas()
      .filter((a) => a.autorPapel === 'locatario' && a.alvoId === userId)
      .map((a) => a.nota);
    return { media: notas.length ? notas.reduce((x, y) => x + y, 0) / notas.length : null };
  }
}
