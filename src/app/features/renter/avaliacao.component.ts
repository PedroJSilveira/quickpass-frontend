import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { AuthService } from '../../core/services/auth.service';
import { StarRatingComponent } from '../../shared/components/star-rating.component';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { TextareaModule } from 'primeng/textarea';

const SELOS_SUGERIDOS = ['Carro limpo', 'Como anunciado', 'Entrega pontual', 'Boa comunicação'];

@Component({
  selector: 'qp-avaliacao',
  standalone: true,
  imports: [CommonModule, FormsModule, StarRatingComponent, BackButtonComponent, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      <qp-back-button />
      <div class="qp-screen-kicker">Reputação</div>
      <h4 class="qp-screen-title">Avaliar locação — {{ v.titulo }}</h4>

      <qp-star-rating [value]="nota()" (valueChange)="nota.set($event)" />

      <div class="field" style="margin: var(--space-4) 0;">
        <label>Comentário</label>
        <textarea pTextarea rows="4" [ngModel]="texto()" (ngModelChange)="texto.set($event)" placeholder="Como foi sua experiência com este carro e proprietário?"></textarea>
      </div>

      <div class="qp-row" style="flex-wrap: wrap; margin-bottom: var(--space-4);">
        @for (selo of selos; track selo) {
          <button
            type="button"
            class="tag"
            [class.tag-accent]="selosEscolhidos().includes(selo)"
            [class.tag-outline]="!selosEscolhidos().includes(selo)"
            (click)="alternarSelo(selo)"
          >
            {{ selo }}
          </button>
        }
      </div>

      <button class="btn btn-primary btn-block" [disabled]="nota() === 0" (click)="enviar(v.proprietarioId)">
        Enviar avaliação
      </button>
    }
  `,
})
export class AvaliacaoComponent {
  selos = SELOS_SUGERIDOS;

  private route = inject(ActivatedRoute);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  veiculo = computed(() => {
    const r = this.reserva();
    return r ? this.catalog.porId(r.veiculoId) : undefined;
  });

  nota = signal(0);
  texto = signal('');
  selosEscolhidos = signal<string[]>([]);

  constructor(
    private booking: BookingService,
    private catalog: CatalogService,
    private auth: AuthService,
    private router: Router,
  ) {}

  alternarSelo(selo: string): void {
    this.selosEscolhidos.update((lista) =>
      lista.includes(selo) ? lista.filter((s) => s !== selo) : [...lista, selo],
    );
  }

  enviar(proprietarioId: string): void {
    const r = this.reserva();
    const nota = this.nota();
    if (!r || nota === 0) return;
    this.booking.avaliar({
      reservaId: r.id,
      autorId: this.auth.conta().id,
      alvoId: proprietarioId,
      nota: nota as 1 | 2 | 3 | 4 | 5,
      texto: this.texto(),
      selos: this.selosEscolhidos(),
    });
    this.router.navigate(['/locacoes']);
  }
}
