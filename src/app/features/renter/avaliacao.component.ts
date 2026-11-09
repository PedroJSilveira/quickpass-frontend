import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { ReviewService } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service';
import { mensagemErro } from '../../core/api/api.service';
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

      <p class="text-muted" style="font-size: 12px;">
        A avaliação é opcional e só fica visível quando as duas partes avaliarem ou após {{ prazoHoras }}h.
        Quem não avalia não é penalizado.
      </p>
      @if (erro()) {
        <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
      }
      <button class="btn btn-primary btn-block" [disabled]="nota() === 0 || enviando()" (click)="enviar()">
        Enviar avaliação
      </button>
    }
  `,
})
export class AvaliacaoComponent implements OnInit {
  selos = SELOS_SUGERIDOS;

  private route = inject(ActivatedRoute);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  veiculo = computed(() => {
    const r = this.reserva();
    return r ? this.catalog.porId(r.veiculoId) : undefined;
  });

  prazoHoras = inject(AppConfigService).get('PRAZO_AVALIACAO_HORAS');
  nota = signal(0);
  texto = signal('');
  selosEscolhidos = signal<string[]>([]);

  erro = signal('');
  enviando = signal(false);
  private auth = inject(AuthService);

  constructor(
    private booking: BookingService,
    private catalog: CatalogService,
    private router: Router,
    private reviews: ReviewService,
  ) {}

  async ngOnInit(): Promise<void> {
    const d = await this.booking.carregarDetalhe(this.paramMap().get('id') ?? '');
    if (d) await this.catalog.carregar(d.reserva.veiculoId);
  }

  alternarSelo(selo: string): void {
    this.selosEscolhidos.update((lista) =>
      lista.includes(selo) ? lista.filter((s) => s !== selo) : [...lista, selo],
    );
  }

  /** Quem avalia (locatário ou proprietário) e o alvo são decididos pelo servidor a partir da conta e da reserva. */
  async enviar(): Promise<void> {
    const r = this.reserva();
    if (!r || this.nota() === 0) return;
    this.erro.set('');
    this.enviando.set(true);
    try {
      await this.reviews.enviar(r.id, { nota: this.nota(), texto: this.texto(), selos: this.selosEscolhidos() });
      this.router.navigate([this.auth.conta().id === r.locatarioId ? '/locacoes' : '/proprietario/reservas']);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
