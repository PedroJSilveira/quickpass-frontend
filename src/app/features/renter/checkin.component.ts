import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VistoriaFotosComponent } from '../../shared/components/vistoria-fotos.component';
import { VistoriaBase } from '../../shared/vistoria.base';
import { mensagemErro } from '../../core/api/api.service';
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
      @if (vistoria(); as vis) {
        <qp-back-button />
        <div class="qp-screen-kicker">Vistoria</div>
        <h4 class="qp-screen-title">Check-in — {{ v.titulo }}</h4>

        <qp-vistoria-fotos [fotos]="vis.fotos" (escolhida)="aoEscolherFoto($event)" style="display: block; margin-bottom: var(--space-4);" />

        <div class="qp-grid-2" style="margin-bottom: var(--space-4);">
          <div class="field">
            <label>Quilometragem</label>
            <p-inputnumber [ngModel]="vis.km" (ngModelChange)="atualizar({ km: $event })" (onBlur)="salvarDados()" [useGrouping]="false" suffix=" km" />
          </div>
          <div class="field">
            <label>Combustível</label>
            <input pInputText [ngModel]="vis.combustivel" (ngModelChange)="atualizar({ combustivel: $event })" (blur)="salvarDados()" />
          </div>
        </div>

        <div class="field" style="margin-bottom: var(--space-4);">
          <label>Observações</label>
          <textarea pTextarea rows="3" [ngModel]="vis.observacoes" (ngModelChange)="atualizar({ observacoes: $event })" (blur)="salvarDados()"></textarea>
        </div>

        <div class="qp-stack" style="margin-bottom: var(--space-4);">
          <label class="qp-row" style="gap: var(--space-2);">
            <input type="checkbox" [checked]="vis.aceiteLocatario" [disabled]="vis.aceiteLocatario || !souLocatario()" (change)="aceitar()" />
            Aceite do locatário — confirmo que as fotos refletem o estado do veículo
          </label>
          <label class="qp-row" style="gap: var(--space-2);">
            <input type="checkbox" [checked]="vis.aceiteProprietario" [disabled]="vis.aceiteProprietario || !souProprietario()" (change)="aceitar()" />
            Aceite do proprietário — confirmo as fotos e a entrega do veículo
          </label>
          <p class="text-muted" style="font-size: 12px; margin: 0;">
            Cada parte aceita com a própria conta. O check-in só é concluído com as {{ total }} fotos recebidas e os dois aceites; o aceite da outra
            parte aparece aqui automaticamente.
          </p>
        </div>

        @if (detalhe() && !detalhe()!.dentroDaJanelaCheckin) {
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
      } @else {
        <p>{{ erro() || 'Carregando vistoria…' }}</p>
      }
    } @else {
      <p>Carregando…</p>
    }
  `,
})
export class CheckinComponent extends VistoriaBase {
  protected readonly tipo = 'checkin' as const;

  async confirmar(): Promise<void> {
    this.erro.set('');
    this.processando.set(true);
    try {
      await this.salvarDados();
      await this.booking.concluirVistoria(this.reservaId(), 'checkin');
      this.router.navigate([this.souProprietario() ? '/proprietario/reservas' : '/locacoes']);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.processando.set(false);
    }
  }
}
