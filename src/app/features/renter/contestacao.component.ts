import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BookingService } from '../../core/services/booking.service';
import { DisputeService } from '../../core/services/dispute.service';
import { PricingService } from '../../core/services/pricing.service';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';

/** Locatário vê a ocorrência de avaria e pode contestar com evidências dentro do prazo (RF04). */
@Component({
  selector: 'qp-contestacao',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent, BlueprintFrameComponent, InputNumberModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <qp-back-button />
    <div class="qp-screen-kicker">Ocorrência</div>
    <h4 class="qp-screen-title">Avaria informada — {{ reserva()?.id }}</h4>

    @if (disputa(); as d) {
      <qp-blueprint>
        <div class="qp-stack" style="padding: var(--space-3);">
          <div class="card-title">Relato do proprietário</div>
          <p class="card-body" style="margin: 0;">{{ d.avaria.descricao }}</p>
          <div class="qp-row-between"><span class="text-muted">Fotos anexadas</span><span>{{ d.avaria.qtdFotos }}</span></div>
          <div class="qp-row-between"><span class="text-muted">Valor estimado do reparo</span><span>{{ pricing.money(d.avaria.valorEstimado) }}</span></div>
          <p class="text-muted" style="font-size: 12px; margin: 0;">
            A caução está retida e só será capturada após decisão registrada pela mediação.
          </p>
        </div>
      </qp-blueprint>

      @if (d.status === 'AGUARDANDO_CONTESTACAO') {
        <div class="field" style="margin: var(--space-4) 0;">
          <label>Sua contestação</label>
          <textarea pTextarea rows="4" [(ngModel)]="texto" name="texto"></textarea>
        </div>
        <div class="field" style="margin-bottom: var(--space-4);">
          <label>Evidências anexadas (fotos/prints)</label>
          <p-inputnumber [(ngModel)]="evidencias" name="evidencias" [min]="0" [useGrouping]="false" />
        </div>
        @if (erro()) {
          <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
        }
        <button class="btn btn-primary btn-block" (click)="enviar(d.id)">Enviar contestação</button>
      } @else {
        <p class="text-muted" style="margin-top: var(--space-4);">Situação da disputa: {{ d.status }}.</p>
      }
    } @else {
      <p>Nenhuma ocorrência para esta locação.</p>
    }
  `,
})
export class ContestacaoComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private booking = inject(BookingService);
  private dispute = inject(DisputeService);
  pricing = inject(PricingService);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  disputa = computed(() => this.dispute.daReserva(this.paramMap().get('id') ?? ''));
  texto = '';
  evidencias: number | null = 0;
  erro = signal('');

  enviar(id: string): void {
    try {
      this.dispute.contestar(id, { texto: this.texto, qtdEvidencias: this.evidencias ?? 0 });
      this.router.navigate(['/locacoes']);
    } catch (e) {
      this.erro.set((e as Error).message);
    }
  }
}
