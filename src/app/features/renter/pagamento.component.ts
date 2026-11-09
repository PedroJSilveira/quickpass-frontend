import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { BookingService } from '../../core/services/booking.service';
import { mensagemErro } from '../../core/api/api.service';
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
          O pagamento por Pix é simulado pelo gateway de teste: ao confirmar, a cobrança é aprovada.
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
            A caução de {{ pricing.money(valores().caucao) }} é só pré-autorizada no cartão (não é cobrada) e liberada
            automaticamente após a devolução sem ocorrências. O repasse ao proprietário só ocorre após a conclusão.
          </p>
        </div>
      </qp-blueprint>

      @if (erro()) {
        <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
      }
      <button class="btn btn-primary btn-block" [disabled]="processando() || reserva()?.status !== 'aprovada'" (click)="pagar()">
        {{ processando() ? 'Processando…' : 'Pagar ' + pricing.money(valores().total) }}
      </button>
    }
  `,
})
export class PagamentoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  /** A rota recebe o id da RESERVA aprovada (pagamento só existe após a aprovação — RF12). */
  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  veiculo = computed(() => {
    const r = this.reserva();
    return r ? this.catalog.porId(r.veiculoId) : undefined;
  });

  metodo = signal<MetodoPagamento>('pix');
  metodoOptions: SegOption<MetodoPagamento>[] = [
    { label: 'Pix', value: 'pix' },
    { label: 'Cartão de crédito', value: 'cartao' },
  ];
  numero = '';
  validade = '';
  cvv = '';
  erro = signal('');
  processando = signal(false);

  valores = computed(() => this.reserva()?.valores ?? { diaria: 0, dias: 0, subtotal: 0, protecao: 0, taxa: 0, total: 0, repasse: 0, caucao: 0 });

  constructor(
    public catalog: CatalogService,
    public pricing: PricingService,
    private booking: BookingService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.paramMap().get('id') ?? '';
    await this.booking.carregarDetalhe(id);
    const r = this.reserva();
    if (r) await this.catalog.carregar(r.veiculoId);
  }

  async pagar(): Promise<void> {
    const r = this.reserva();
    if (!r) return;
    this.erro.set('');
    this.processando.set(true);
    try {
      const resultado = await this.booking.pagar(r.id, this.metodo(), this.metodo() === 'cartao' ? this.numero : undefined);
      if (resultado.status === 'confirmada') {
        this.router.navigate(['/locacoes']);
      } else {
        this.erro.set('Pagamento não concluído (diária ou caução recusada). As datas foram liberadas.');
      }
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.processando.set(false);
    }
  }
}
