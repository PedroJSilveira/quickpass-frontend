import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { mensagemErro } from '../../core/api/api.service';
import { Reserva } from '../../core/models/domain.models';
import { BookingService } from '../../core/services/booking.service';
import { PricingService } from '../../core/services/pricing.service';
import { TagComponent } from '../../shared/components/tag.component';

const ROTULOS: Record<string, string> = {
  aguardando_kyc: 'Aguardando verificação do locatário',
  solicitada: 'Aguardando sua resposta',
  aprovada: 'Aprovada — aguardando pagamento',
  confirmada: 'Confirmada',
  em_andamento: 'Em andamento',
  em_disputa: 'Em disputa',
  concluida: 'Concluída',
  rejeitada: 'Recusada',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
  falha_pagamento: 'Pagamento não concluído',
};

/** Reservas dos meus veículos: check-in/check-out (as duas partes fazem a vistoria), avaria e avaliação do locatário. */
@Component({
  selector: 'qp-reservas-proprietario',
  standalone: true,
  imports: [CommonModule, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Proprietário</div>
    <h4 class="qp-screen-title">Reservas dos meus veículos</h4>

    @if (erro()) {
      <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
    }
    @if (lista().length === 0) {
      <div class="qp-empty">Nenhuma reserva ainda. As solicitações aprovadas e pagas aparecem aqui.</div>
    }
    <div class="qp-stack">
      @for (r of lista(); track r.id) {
        <div class="card">
          <div class="qp-row-between">
            <span class="card-title">{{ r.veiculoTitulo }}</span>
            <qp-tag [variant]="r.status === 'confirmada' || r.status === 'em_andamento' ? 'accent' : 'neutral'">{{ rotulo(r.status) }}</qp-tag>
          </div>
          <div class="card-meta">
            {{ pricing.formatarPeriodo(r.inicio, r.fim) }} · {{ r.locatarioNome }} · {{ pricing.money(r.valores.repasse) }} a receber · {{ r.id }}
          </div>
          <div class="qp-row" style="margin-top: var(--space-2); flex-wrap: wrap;">
            @if (r.status === 'confirmada') {
              <button class="btn btn-secondary" (click)="ir(r, 'check-in')">Fazer check-in</button>
              <button class="btn btn-ghost" (click)="cancelar(r)">Cancelar (reembolso integral)</button>
            }
            @if (r.status === 'em_andamento') {
              <button class="btn btn-secondary" (click)="ir(r, 'check-out')">Fazer check-out</button>
            }
            @if (r.status === 'em_disputa' && !r.disputaId) {
              <button class="btn btn-secondary" (click)="ir(r, 'check-out')">Registrar avaria</button>
            }
            @if (r.status === 'concluida') {
              <button class="btn btn-ghost" (click)="ir(r, 'avaliar')">Avaliar locatário</button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ReservasProprietarioComponent implements OnInit {
  private booking = inject(BookingService);
  private router = inject(Router);
  pricing = inject(PricingService);
  erro = signal('');

  /** Só o que já passou da fila de solicitações (as pendentes ficam em "Solicitações"). */
  lista = computed(() => this.booking.reservasProprietario().filter((r) => !['solicitada', 'aguardando_kyc'].includes(r.status)));

  ngOnInit(): void {
    void this.booking.carregar();
  }

  rotulo(s: string): string {
    return ROTULOS[s] ?? s;
  }

  ir(r: Reserva, tela: 'check-in' | 'check-out' | 'avaliar'): void {
    this.router.navigate(['/locacoes', r.id, tela]);
  }

  async cancelar(r: Reserva): Promise<void> {
    if (!globalThis.confirm('Cancelar esta reserva? O locatário será reembolsado integralmente.')) return;
    this.erro.set('');
    try {
      await this.booking.cancelar(r.id, 'cancelada pelo proprietário');
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }
}
