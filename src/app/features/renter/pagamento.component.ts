import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { Protecao } from '../../core/models/domain.models';
import { InputTextModule } from 'primeng/inputtext';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { SegControlComponent, SegOption } from '../../shared/components/seg-control.component';
import { BackButtonComponent } from '../../shared/components/back-button.component';

type MetodoPagamento = 'pix' | 'cartao';

@Component({
  selector: 'qp-pagamento',
  standalone: true,
  imports: [CommonModule, FormsModule, BlueprintFrameComponent, SegControlComponent, BackButtonComponent, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      <qp-back-button />
      <div class="qp-screen-kicker">Reserva</div>
      <h4 class="qp-screen-title">Pagamento</h4>

      <qp-seg-control [options]="metodoOptions" [value]="metodo()" (valueChange)="metodo.set($event)" />

      @if (metodo() === 'cartao') {
        <div class="qp-grid-2" style="margin: var(--space-4) 0;">
          <div class="field" style="grid-column: span 2;">
            <label>Número do cartão</label>
            <input pInputText [(ngModel)]="numero" name="numero" placeholder="0000 0000 0000 0000" />
          </div>
          <div class="field">
            <label>Validade</label>
            <input pInputText [(ngModel)]="validade" name="validade" placeholder="MM/AA" />
          </div>
          <div class="field">
            <label>CVV</label>
            <input pInputText [(ngModel)]="cvv" name="cvv" placeholder="123" />
          </div>
        </div>
      } @else {
        <p class="text-muted" style="margin: var(--space-4) 0;">
          Um QR Code Pix será exibido após a confirmação (integração de pagamento fora do escopo deste protótipo).
        </p>
      }

      <qp-blueprint>
        <div class="qp-stack" style="padding: var(--space-3);">
          <div class="qp-row-between"><span>{{ pricing.money(valores().diaria) }} × {{ valores().dias }} dias</span><span>{{ pricing.money(valores().subtotal) }}</span></div>
          <div class="qp-row-between"><span>Proteção</span><span>{{ pricing.money(valores().protecao) }}</span></div>
          <div class="hr"></div>
          <div class="qp-row-between" style="font-size: 20px; font-family: var(--font-heading); font-weight: 600;">
            <span>Total</span><span>{{ pricing.money(valores().total) }}</span>
          </div>
          <p class="text-muted" style="font-size: 11px; margin: 0;">
            O valor fica autorizado até o proprietário aceitar; o repasse é liberado somente após o check-in.
          </p>
        </div>
      </qp-blueprint>

      <button class="btn btn-primary btn-block" (click)="pagar(v.id, v.diaria)">Pagar {{ pricing.money(valores().total) }}</button>
    }
  `,
})
export class PagamentoComponent {
  private route = inject(ActivatedRoute);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });
  private queryMap = toSignal(this.route.queryParamMap, { requireSync: true });

  veiculo = computed(() => this.catalog.porId(this.paramMap().get('id') ?? ''));
  inicio = computed(() => this.queryMap().get('inicio') ?? this.catalog.filtros().inicio);
  fim = computed(() => this.queryMap().get('fim') ?? this.catalog.filtros().fim);
  protecao = computed<Protecao>(() => (this.queryMap().get('protecao') as Protecao) ?? 'completa');

  metodo = signal<MetodoPagamento>('pix');
  metodoOptions: SegOption<MetodoPagamento>[] = [
    { label: 'Pix', value: 'pix' },
    { label: 'Cartão de crédito', value: 'cartao' },
  ];
  numero = '';
  validade = '';
  cvv = '';

  valores = computed(() => {
    const v = this.veiculo();
    if (!v) return this.pricing.calcular(0, 'completa', this.inicio(), this.fim());
    return this.pricing.calcular(v.diaria, this.protecao(), this.inicio(), this.fim());
  });

  constructor(
    public catalog: CatalogService,
    public pricing: PricingService,
    private booking: BookingService,
    private auth: AuthService,
    private router: Router,
  ) {}

  pagar(veiculoId: string, diaria: number): void {
    const reserva = this.booking.criar({
      veiculoId,
      locatarioId: this.auth.conta().id,
      inicio: this.inicio(),
      fim: this.fim(),
      protecao: this.protecao(),
      diaria,
    });
    this.router.navigate(['/reserva', reserva.id, 'confirmado']);
  }
}
