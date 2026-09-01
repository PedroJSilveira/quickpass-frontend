import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { FotosVistoria, Vistoria } from '../../core/models/domain.models';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';

const ROTULOS: { chave: keyof FotosVistoria; rotulo: string }[] = [
  { chave: 'frente', rotulo: 'frente' },
  { chave: 'traseira', rotulo: 'traseira' },
  { chave: 'laterais', rotulo: 'laterais' },
  { chave: 'painel', rotulo: 'painel / km' },
];

@Component({
  selector: 'qp-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BlueprintFrameComponent,
    BackButtonComponent,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      <qp-back-button />
      <div class="qp-screen-kicker">Vistoria</div>
      <h4 class="qp-screen-title">Check-out — {{ v.titulo }}</h4>

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
          <label>Quilometragem final</label>
          <p-inputnumber [ngModel]="vistoria().km" (ngModelChange)="atualizar({ km: $event })" [useGrouping]="false" suffix=" km" />
        </div>
        <div class="field">
          <label>Combustível</label>
          <input pInputText [ngModel]="vistoria().combustivel" (ngModelChange)="atualizar({ combustivel: $event })" />
        </div>
      </div>

      <div class="field" style="margin-bottom: var(--space-4);">
        <label>Observações</label>
        <textarea pTextarea rows="3" [ngModel]="vistoria().observacoes" (ngModelChange)="atualizar({ observacoes: $event })"></textarea>
      </div>

      <qp-blueprint>
        <div class="qp-stack" style="padding: var(--space-3);">
          <div class="card-title">Acerto final</div>
          <div class="qp-row-between"><span class="text-muted">Locação</span><span>{{ reserva()?.id }}</span></div>
          <div class="qp-row-between"><span class="text-muted">Diferença de combustível</span><span>a apurar na entrega</span></div>
          <div class="qp-row-between"><span class="text-muted">Quilometragem excedente</span><span>a apurar na entrega</span></div>
          <div class="qp-row-between"><span class="text-muted">Caução liberada</span><span>{{ pricing.money(pricing.caucao) }}</span></div>
        </div>
      </qp-blueprint>

      <button class="btn btn-primary btn-block" [disabled]="fotosFeitas() < 4" (click)="confirmar()">
        Confirmar check-out ({{ fotosFeitas() }}/4 fotos)
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
export class CheckoutComponent {
  rotulos = ROTULOS;

  private booking = inject(BookingService);
  private catalog = inject(CatalogService);
  public pricing = inject(PricingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  veiculo = computed(() => {
    const r = this.reserva();
    return r ? this.catalog.porId(r.veiculoId) : undefined;
  });

  vistoria = signal<Vistoria>(this.booking.vistoriaVazia(this.reserva()?.id ?? '', 'checkout'));

  fotosFeitas = computed(() => this.booking.contarFotos(this.vistoria().fotos));

  atualizar(patch: Partial<Vistoria>): void {
    this.vistoria.update((v) => ({ ...v, ...patch }));
  }

  alternarFoto(chave: keyof FotosVistoria): void {
    this.vistoria.update((v) => ({ ...v, fotos: { ...v.fotos, [chave]: !v.fotos[chave] } }));
  }

  confirmar(): void {
    this.booking.registrarVistoria(this.vistoria());
    const r = this.reserva();
    if (r && !r.avaliada) {
      this.router.navigate(['/locacoes', r.id, 'avaliar']);
    } else {
      this.router.navigate(['/locacoes']);
    }
  }
}
