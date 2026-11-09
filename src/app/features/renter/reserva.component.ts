import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../core/services/catalog.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { BookingService } from '../../core/services/booking.service';
import { PricingService } from '../../core/services/pricing.service';
import { DatePickerModule } from 'primeng/datepicker';
import { Protecao, Valores } from '../../core/models/domain.models';
import { mensagemErro } from '../../core/api/api.service';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { formatIsoDate, parseIsoDate } from '../../shared/utils/date.util';

@Component({
  selector: 'qp-reserva',
  standalone: true,
  imports: [CommonModule, FormsModule, BlueprintFrameComponent, BackButtonComponent, DatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      <qp-back-button />
      <div class="qp-screen-kicker">Reserva</div>
      <h4 class="qp-screen-title">Período e proteção</h4>

      <div class="qp-grid-2" style="margin-bottom: var(--space-4);">
        <div class="field">
          <label>Retirada</label>
          <p-datepicker [ngModel]="inicioDate()" (ngModelChange)="inicio.set(formatIsoDate($event))" dateFormat="dd/mm/yy" name="inicio" />
        </div>
        <div class="field">
          <label>Devolução</label>
          <p-datepicker [ngModel]="fimDate()" (ngModelChange)="fim.set(formatIsoDate($event))" dateFormat="dd/mm/yy" name="fim" />
        </div>
      </div>

      <div class="qp-stack" style="margin-bottom: var(--space-4);">
        <label class="qp-radio-card" [class.qp-radio-sel]="protecao() === 'basica'" (click)="protecao.set('basica')">
          <div class="qp-row-between">
            <strong>Proteção básica</strong>
            <span>{{ pricing.money(pricing.precoProtecaoBasica) }}/dia</span>
          </div>
          <span class="text-muted" style="font-size: 13px;">Franquia de {{ pricing.money(pricing.franquiaBasica) }} em caso de sinistro.</span>
        </label>
        <label class="qp-radio-card" [class.qp-radio-sel]="protecao() === 'completa'" (click)="protecao.set('completa')">
          <div class="qp-row-between">
            <strong>Proteção completa</strong>
            <span>{{ pricing.money(pricing.precoProtecaoCompleta) }}/dia</span>
          </div>
          <span class="text-muted" style="font-size: 13px;">Franquia reduzida de {{ pricing.money(pricing.franquiaCompleta) }}.</span>
        </label>
      </div>

      <qp-blueprint>
        <div class="qp-stack" style="padding: var(--space-3);">
          <div class="qp-row-between"><span>{{ pricing.money(valores().diaria) }} × {{ valores().dias }} dias</span><span>{{ pricing.money(valores().subtotal) }}</span></div>
          <div class="qp-row-between"><span>Proteção</span><span>{{ pricing.money(valores().protecao) }}</span></div>
          <div class="qp-row-between text-muted" style="font-size: 12px;"><span>Taxa da plataforma (já incluída)</span><span>{{ pricing.money(valores().taxa) }}</span></div>
          <div class="qp-row-between text-muted" style="font-size: 12px;"><span>Caução (pré-autorizada, devolvida)</span><span>{{ pricing.money(valores().caucao) }}</span></div>
          <div class="hr"></div>
          <div class="qp-row-between" style="font-size: 22px; font-family: var(--font-heading); font-weight: 600;">
            <span>Total</span><span>{{ pricing.money(valores().total) }}</span>
          </div>
          <p class="text-muted" style="font-size: 11px; margin: 0;">
            A caução não entra no total nem é receita da plataforma — é liberada no check-out.
          </p>
        </div>
      </qp-blueprint>

      @if (erro()) {
        <p class="text-muted" style="font-size: 13px; color: var(--color-danger, inherit);">{{ erro() }}</p>
      }
      <p class="text-muted" style="font-size: 12px;">
        Você só paga depois que o proprietário aprovar. Sem verificação de identidade, as datas ficam reservadas por {{ holdKycMin }} minutos.
      </p>
      <div class="field" style="margin-bottom: var(--space-3);">
        <label>Finalidade da locação (opcional, o proprietário vê)</label>
        <input type="text" class="p-inputtext" [ngModel]="finalidade()" (ngModelChange)="finalidade.set($event)" name="finalidade" maxlength="120" placeholder="Ex.: viagem de trabalho" />
      </div>
      <button class="btn btn-primary btn-block" [disabled]="enviando() || !cotacaoOk()" (click)="solicitar(v.id)">{{ enviando() ? 'Enviando…' : 'Confirmar reserva' }}</button>
    }
  `,
  styles: [
    `
      .qp-radio-card { display: block; padding: var(--space-3); border: 1px solid var(--color-divider); cursor: pointer; }
      .qp-radio-sel { border-color: var(--color-accent); background: var(--color-accent-100); }
    `,
  ],
})
export class ReservaComponent {
  private catalog = inject(CatalogService);
  public pricing = inject(PricingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private id = toSignal(this.route.paramMap, { requireSync: true });

  erro = signal('');
  holdKycMin = inject(AppConfigService).get('HOLD_KYC_MINUTOS');
  private booking = inject(BookingService);

  veiculo = computed(() => this.catalog.porId(this.id().get('id') ?? ''));

  inicio = signal(this.catalog.filtros().inicio);
  fim = signal(this.catalog.filtros().fim);
  protecao = signal<Protecao>('completa');
  finalidade = signal('');
  enviando = signal(false);
  cotacaoOk = signal(false);

  /** Valores calculados pelo servidor (fonte única de preço); zerados até a primeira cotação. */
  valores = signal<Valores>({ diaria: 0, dias: 0, subtotal: 0, protecao: 0, taxa: 0, total: 0, repasse: 0, caucao: 0 });

  constructor() {
    void this.catalog.carregar(this.id().get('id') ?? '');
    // Recota sempre que o período ou a proteção mudam.
    effect(() => {
      const id = this.id().get('id') ?? '';
      const [i, f, p] = [this.inicio(), this.fim(), this.protecao()];
      untracked(async () => {
        try {
          this.valores.set(await this.catalog.cotar(id, i, f, p));
          this.cotacaoOk.set(true);
          this.erro.set('');
        } catch (e) {
          this.cotacaoOk.set(false);
          this.erro.set(mensagemErro(e));
        }
      });
    });
  }

  /** Cria a solicitação (RF12). Sem KYC aprovado → reserva retida e redirecionamento ao KYC (BDD 9.1). */
  async solicitar(veiculoId: string): Promise<void> {
    this.erro.set('');
    this.enviando.set(true);
    try {
      const r = await this.booking.solicitar({
        veiculoId,
        inicio: this.inicio(),
        fim: this.fim(),
        protecao: this.protecao(),
        finalidade: this.finalidade().trim() || undefined,
        origem: this.catalog.origemSolicitacao(),
      });
      this.catalog.origemSolicitacao.set('busca');
      if (r.status === 'aguardando_kyc') {
        this.router.navigate(['/verificacao'], { queryParams: { reserva: r.id } });
      } else {
        this.router.navigate(['/reserva', r.id, 'confirmado']);
      }
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.enviando.set(false);
    }
  }

  inicioDate = computed(() => parseIsoDate(this.inicio()));
  fimDate = computed(() => parseIsoDate(this.fim()));
  formatIsoDate = formatIsoDate;
}
