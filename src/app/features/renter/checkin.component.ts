import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppConfigService } from '../../core/config/app-config.service';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { AuthService } from '../../core/services/auth.service';
import { FotoAlterada, VistoriaFotosComponent } from '../../shared/components/vistoria-fotos.component';
import { Vistoria } from '../../core/models/domain.models';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'qp-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule, VistoriaFotosComponent, BackButtonComponent, InputTextModule, InputNumberModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      <qp-back-button />
      <div class="qp-screen-kicker">Vistoria</div>
      <h4 class="qp-screen-title">Check-in — {{ v.titulo }}</h4>

      <qp-vistoria-fotos [fotos]="vistoria().fotos" (alterada)="aoAlterarFoto($event)" style="display: block; margin-bottom: var(--space-4);" />

      <div class="qp-grid-2" style="margin-bottom: var(--space-4);">
        <div class="field">
          <label>Quilometragem</label>
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
          Aceite do locatário — confirmo que as fotos refletem o estado do veículo
        </label>
        <label class="qp-row" style="gap: var(--space-2);">
          <input type="checkbox" [checked]="vistoria().aceiteProprietario" [disabled]="auth.papelAtivo() !== 'proprietario'" (change)="atualizar({ aceiteProprietario: $any($event.target).checked })" />
          Aceite do proprietário — confirmo as fotos e a entrega do veículo
        </label>
        <p class="text-muted" style="font-size: 12px; margin: 0;">
          Cada parte aceita com o próprio papel (use o seletor de papel no topo). O check-in só é concluído com as 7 fotos
          recebidas e os dois aceites.
        </p>
      </div>

      @if (!dentroDaJanela()) {
        <p class="text-muted" style="font-size: 13px;">Fora da janela de check-in desta reserva.</p>
      }
      @if (erro()) {
        <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
      }
      <p class="text-muted" style="font-size: 13px;">
        Ao confirmar, o repasse fica previsto; ele só é pago após a conclusão e a resolução da caução.
      </p>

      <button class="btn btn-primary btn-block" [disabled]="!podeConfirmar()" (click)="confirmar()">
        Confirmar check-in ({{ fotosFeitas() }}/{{ total }} fotos)
      </button>
    }
  `,
})
export class CheckinComponent {
  private booking = inject(BookingService);
  private catalog = inject(CatalogService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private config = inject(AppConfigService);
  auth = inject(AuthService);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  total = this.config.get('FOTOS_VISTORIA_OBRIGATORIAS');
  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  veiculo = computed(() => {
    const r = this.reserva();
    return r ? this.catalog.porId(r.veiculoId) : undefined;
  });

  private reservaId = computed(() => this.paramMap().get('id') ?? '');
  /** Rascunho guardado no service: sobrevive à troca de papel para o segundo aceite. */
  vistoria = computed(() => this.booking.rascunho(this.reservaId(), 'checkin'));
  erro = signal('');

  fotosFeitas = computed(() => this.booking.contarFotos(this.vistoria().fotos));
  dentroDaJanela = computed(() => {
    const r = this.reserva();
    return !!r && this.booking.dentroDaJanelaCheckin(r);
  });
  podeConfirmar = computed(() => {
    const v = this.vistoria();
    return this.fotosFeitas() >= this.total && v.aceiteLocatario && v.aceiteProprietario && this.dentroDaJanela();
  });

  atualizar(patch: Partial<Vistoria>): void {
    this.booking.atualizarRascunho(this.reservaId(), 'checkin', (v) => ({ ...v, ...patch }));
  }

  aoAlterarFoto(e: FotoAlterada): void {
    this.booking.atualizarRascunho(this.reservaId(), 'checkin', (v) => ({ ...v, fotos: { ...v.fotos, [e.chave]: { ...v.fotos[e.chave], ...e.patch } } }));
  }

  confirmar(): void {
    try {
      this.booking.registrarVistoria(this.vistoria());
      this.router.navigate(['/locacoes']);
    } catch (e) {
      this.erro.set((e as Error).message);
    }
  }
}
