import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppConfigService } from '../../core/config/app-config.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { DisputeService } from '../../core/services/dispute.service';
import { PricingService } from '../../core/services/pricing.service';
import { Vistoria } from '../../core/models/domain.models';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { FotoAlterada, VistoriaFotosComponent } from '../../shared/components/vistoria-fotos.component';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'qp-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BlueprintFrameComponent,
    VistoriaFotosComponent,
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

      <qp-vistoria-fotos [fotos]="vistoria().fotos" (alterada)="aoAlterarFoto($event)" style="display: block; margin-bottom: var(--space-4);" />

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

      <div class="qp-stack" style="margin-bottom: var(--space-4);">
        <label class="qp-row" style="gap: var(--space-2);">
          <input type="checkbox" [checked]="vistoria().aceiteLocatario" [disabled]="auth.papelAtivo() !== 'locatario'" (change)="atualizar({ aceiteLocatario: $any($event.target).checked })" />
          Aceite do locatário — devolvi o veículo conforme as fotos
        </label>
        <label class="qp-row" style="gap: var(--space-2);">
          <input type="checkbox" [checked]="vistoria().aceiteProprietario" [disabled]="auth.papelAtivo() !== 'proprietario'" (change)="atualizar({ aceiteProprietario: $any($event.target).checked })" />
          Aceite do proprietário — recebi o veículo e conferi as fotos
        </label>
      </div>

      @if (auth.papelAtivo() === 'proprietario') {
        <qp-blueprint>
          <div class="qp-stack" style="padding: var(--space-3);">
            <label class="qp-row" style="gap: var(--space-2);">
              <input type="checkbox" [checked]="avaria()" (change)="avaria.set($any($event.target).checked)" />
              Informar avaria
            </label>
            @if (avaria()) {
              <p class="text-muted" style="font-size: 12px; margin: 0;">
                A caução ficará retida até uma decisão registrada; o locatário será notificado e poderá contestar.
                Nada é capturado automaticamente.
              </p>
              <div class="field">
                <label>Descrição da avaria</label>
                <textarea pTextarea rows="3" [(ngModel)]="avariaDescricao" name="avariaDescricao"></textarea>
              </div>
              <div class="qp-grid-2">
                <div class="field">
                  <label>Fotos da avaria</label>
                  <p-inputnumber [(ngModel)]="avariaFotos" name="avariaFotos" [min]="0" [useGrouping]="false" />
                </div>
                <div class="field">
                  <label>Valor estimado do reparo</label>
                  <p-inputnumber [(ngModel)]="avariaValor" name="avariaValor" [min]="0" mode="currency" currency="BRL" locale="pt-BR" />
                </div>
              </div>
            }
          </div>
        </qp-blueprint>
      }

      <qp-blueprint>
        <div class="qp-stack" style="padding: var(--space-3);">
          <div class="card-title">Acerto final</div>
          <div class="qp-row-between"><span class="text-muted">Locação</span><span>{{ reserva()?.id }}</span></div>
          <div class="qp-row-between"><span class="text-muted">Diferença de combustível</span><span>a apurar na entrega</span></div>
          <div class="qp-row-between"><span class="text-muted">Quilometragem excedente</span><span>a apurar na entrega</span></div>
          <div class="qp-row-between"><span class="text-muted">Caução ({{ pricing.money(pricing.caucao) }})</span><span>liberada após {{ prazoLiberacao }}h sem ocorrências</span></div>
        </div>
      </qp-blueprint>

      @if (erro()) {
        <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
      }
      <button class="btn btn-primary btn-block" [disabled]="!podeConfirmar()" (click)="confirmar()">
        Confirmar check-out ({{ fotosFeitas() }}/{{ total }} fotos)
      </button>
    }
  `,
})
export class CheckoutComponent {
  private booking = inject(BookingService);
  private catalog = inject(CatalogService);
  private dispute = inject(DisputeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private config = inject(AppConfigService);
  public pricing = inject(PricingService);
  auth = inject(AuthService);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  total = this.config.get('FOTOS_VISTORIA_OBRIGATORIAS');
  prazoLiberacao = this.config.get('PRAZO_LIBERACAO_CAUCAO_HORAS');
  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  veiculo = computed(() => {
    const r = this.reserva();
    return r ? this.catalog.porId(r.veiculoId) : undefined;
  });

  private reservaId = computed(() => this.paramMap().get('id') ?? '');
  /** Rascunho guardado no service: sobrevive à troca de papel para o segundo aceite. */
  vistoria = computed(() => this.booking.rascunho(this.reservaId(), 'checkout'));
  erro = signal('');
  avaria = signal(false);
  avariaDescricao = '';
  avariaFotos: number | null = 0;
  avariaValor: number | null = 0;

  fotosFeitas = computed(() => this.booking.contarFotos(this.vistoria().fotos));
  podeConfirmar = computed(() => {
    const v = this.vistoria();
    return this.fotosFeitas() >= this.total && v.aceiteLocatario && v.aceiteProprietario;
  });

  atualizar(patch: Partial<Vistoria>): void {
    this.booking.atualizarRascunho(this.reservaId(), 'checkout', (v) => ({ ...v, ...patch }));
  }

  aoAlterarFoto(e: FotoAlterada): void {
    this.booking.atualizarRascunho(this.reservaId(), 'checkout', (v) => ({ ...v, fotos: { ...v.fotos, [e.chave]: { ...v.fotos[e.chave], ...e.patch } } }));
  }

  confirmar(): void {
    const r = this.reserva();
    if (!r) return;
    this.erro.set('');
    try {
      const comAvaria = this.avaria();
      if (comAvaria && (!this.avariaDescricao.trim() || (this.avariaFotos ?? 0) < 1)) {
        throw new Error('Para informar avaria, descreva o dano e anexe ao menos uma foto.');
      }
      this.booking.registrarVistoria(this.vistoria(), { avaria: comAvaria });
      if (comAvaria) {
        this.dispute.informarAvaria(r.id, { descricao: this.avariaDescricao, qtdFotos: this.avariaFotos ?? 0, valorEstimado: this.avariaValor ?? 0 });
        this.router.navigate(['/locacoes']);
      } else if (!r.avaliada) {
        this.router.navigate(['/locacoes', r.id, 'avaliar']);
      } else {
        this.router.navigate(['/locacoes']);
      }
    } catch (e) {
      this.erro.set((e as Error).message);
    }
  }
}
