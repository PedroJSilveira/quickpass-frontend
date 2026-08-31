import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { FotosVistoria, Vistoria } from '../../core/models/domain.models';

const ROTULOS: { chave: keyof FotosVistoria; rotulo: string }[] = [
  { chave: 'frente', rotulo: 'frente' },
  { chave: 'traseira', rotulo: 'traseira' },
  { chave: 'laterais', rotulo: 'laterais' },
  { chave: 'painel', rotulo: 'painel / km' },
];

@Component({
  selector: 'qp-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      <div class="qp-screen-kicker">Vistoria</div>
      <h4 class="qp-screen-title">Check-in — {{ v.titulo }}</h4>

      <div class="qp-grid-2x2" style="max-width: 260px; margin-bottom: var(--space-4);">
        @for (item of rotulos; track item.chave) {
          <div
            class="qp-foto-slot"
            [class.qp-foto-feita]="vistoria().fotos[item.chave]"
            (click)="alternarFoto(item.chave)"
          >
            <span>[ {{ item.rotulo }} ]</span>
            <small>{{ vistoria().fotos[item.chave] ? 'registrada' : 'toque para capturar' }}</small>
          </div>
        }
      </div>

      <div class="qp-grid-2" style="margin-bottom: var(--space-4);">
        <div class="field">
          <label>Quilometragem</label>
          <input class="input" type="number" [ngModel]="vistoria().km" (ngModelChange)="atualizar({ km: $event })" />
        </div>
        <div class="field">
          <label>Combustível</label>
          <input class="input" [ngModel]="vistoria().combustivel" (ngModelChange)="atualizar({ combustivel: $event })" />
        </div>
      </div>

      <div class="field" style="margin-bottom: var(--space-4);">
        <label>Observações</label>
        <textarea class="input" rows="3" [ngModel]="vistoria().observacoes" (ngModelChange)="atualizar({ observacoes: $event })"></textarea>
      </div>

      <p class="text-muted" style="font-size: 13px;">
        Ao confirmar, o repasse do proprietário é liberado e a caução segue retida até o check-out.
      </p>

      <button class="btn btn-primary btn-block" [disabled]="fotosFeitas() < 4" (click)="confirmar(v.id)">
        Confirmar check-in ({{ fotosFeitas() }}/4 fotos)
      </button>
    }
  `,
  styles: [
    `
      .qp-foto-slot {
        aspect-ratio: 1; border: 1px solid var(--color-divider); display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 4px; font-size: 12px; text-align: center; cursor: pointer;
      }
      .qp-foto-feita { border-color: var(--color-accent); background: var(--color-accent-100); }
    `,
  ],
})
export class CheckinComponent {
  rotulos = ROTULOS;

  private booking = inject(BookingService);
  private catalog = inject(CatalogService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  veiculo = computed(() => {
    const r = this.reserva();
    return r ? this.catalog.porId(r.veiculoId) : undefined;
  });

  vistoria = signal<Vistoria>(this.booking.vistoriaVazia(this.reserva()?.id ?? '', 'checkin'));

  fotosFeitas = computed(() => this.booking.contarFotos(this.vistoria().fotos));

  atualizar(patch: Partial<Vistoria>): void {
    this.vistoria.update((v) => ({ ...v, ...patch }));
  }

  alternarFoto(chave: keyof FotosVistoria): void {
    this.vistoria.update((v) => ({ ...v, fotos: { ...v.fotos, [chave]: !v.fotos[chave] } }));
  }

  confirmar(veiculoId: string): void {
    this.booking.registrarVistoria(this.vistoria());
    this.router.navigate(['/locacoes']);
  }
}
