import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PricingService } from '../../core/services/pricing.service';
import { DisputeService } from '../../core/services/dispute.service';
import { mensagemErro } from '../../core/api/api.service';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { VistoriaFotosComponent } from '../../shared/components/vistoria-fotos.component';
import { VistoriaBase } from '../../shared/vistoria.base';
import { inject } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'qp-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, BlueprintFrameComponent, VistoriaFotosComponent, BackButtonComponent, InputTextModule, InputNumberModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      @if (vistoria(); as vis) {
        <qp-back-button />
        <div class="qp-screen-kicker">Vistoria</div>
        <h4 class="qp-screen-title">Check-out — {{ v.titulo }}</h4>

        @if (!emDisputaSemAvaria()) {
          <qp-vistoria-fotos [fotos]="vis.fotos" (escolhida)="aoEscolherFoto($event)" style="display: block; margin-bottom: var(--space-4);" />

          <div class="qp-grid-2" style="margin-bottom: var(--space-4);">
            <div class="field">
              <label>Quilometragem final</label>
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
              Aceite do locatário — devolvi o veículo conforme as fotos
            </label>
            <label class="qp-row" style="gap: var(--space-2);">
              <input type="checkbox" [checked]="vis.aceiteProprietario" [disabled]="vis.aceiteProprietario || !souProprietario()" (change)="aceitar()" />
              Aceite do proprietário — recebi o veículo e conferi as fotos
            </label>
          </div>
        }

        @if (souProprietario()) {
          <qp-blueprint>
            <div class="qp-stack" style="padding: var(--space-3);">
              @if (!emDisputaSemAvaria()) {
                <label class="qp-row" style="gap: var(--space-2);">
                  <input type="checkbox" [checked]="avaria()" (change)="avaria.set($any($event.target).checked)" />
                  Informar avaria
                </label>
              } @else {
                <div class="card-title">Registrar a avaria</div>
                <p class="text-muted" style="font-size: 12px; margin: 0;">O check-out foi concluído com avaria; falta enviar a descrição e as fotos para abrir a disputa.</p>
              }
              @if (avaria() || emDisputaSemAvaria()) {
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
                    <label>Fotos da avaria (ao menos uma)</label>
                    <input type="file" accept="image/*" multiple (change)="escolherFotosAvaria($event)" />
                    <span class="text-muted" style="font-size: 12px;">{{ fotosAvaria().length }} foto(s) selecionada(s)</span>
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
        @if (emDisputaSemAvaria()) {
          <button class="btn btn-primary btn-block" [disabled]="processando()" (click)="registrarAvaria()">Enviar avaria e abrir disputa</button>
        } @else {
          <button class="btn btn-primary btn-block" [disabled]="!podeConfirmar()" (click)="confirmar()">
            Confirmar check-out ({{ fotosFeitas() }}/{{ total }} fotos)
          </button>
        }
      } @else {
        <p>{{ erro() || 'Carregando vistoria…' }}</p>
      }
    } @else {
      <p>Carregando…</p>
    }
  `,
})
export class CheckoutComponent extends VistoriaBase {
  protected readonly tipo = 'checkout' as const;
  private dispute = inject(DisputeService);
  public pricing = inject(PricingService);

  prazoLiberacao = this.config.get('PRAZO_LIBERACAO_CAUCAO_HORAS');
  avaria = signal(false);
  avariaDescricao = '';
  avariaValor: number | null = 0;
  fotosAvaria = signal<File[]>([]);

  /** Check-out já concluído com avaria, mas a disputa ainda não foi aberta (falha anterior no envio das fotos). */
  emDisputaSemAvaria(): boolean {
    const r = this.reserva();
    return !!r && r.status === 'em_disputa' && !r.disputaId && this.souProprietario();
  }

  escolherFotosAvaria(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.fotosAvaria.set(Array.from(input.files ?? []));
  }

  private validarAvaria(): void {
    if (!this.avariaDescricao.trim() || this.fotosAvaria().length < 1) {
      throw new Error('Para informar avaria, descreva o dano e anexe ao menos uma foto.');
    }
  }

  async registrarAvaria(): Promise<void> {
    this.erro.set('');
    this.processando.set(true);
    try {
      this.validarAvaria();
      await this.dispute.informarAvaria(this.reservaId(), { descricao: this.avariaDescricao, valorEstimado: this.avariaValor ?? 0 }, this.fotosAvaria());
      this.router.navigate(['/proprietario/reservas']);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.processando.set(false);
    }
  }

  async confirmar(): Promise<void> {
    const r = this.reserva();
    if (!r) return;
    this.erro.set('');
    this.processando.set(true);
    try {
      const comAvaria = this.avaria() && this.souProprietario();
      if (comAvaria) this.validarAvaria();
      await this.salvarDados();
      await this.booking.concluirVistoria(r.id, 'checkout', comAvaria);
      if (comAvaria) {
        try {
          await this.dispute.informarAvaria(r.id, { descricao: this.avariaDescricao, valorEstimado: this.avariaValor ?? 0 }, this.fotosAvaria());
        } catch (e) {
          // O check-out já foi concluído: a tela passa a pedir só o envio da avaria.
          await this.booking.carregarDetalhe(r.id);
          this.erro.set(mensagemErro(e));
          return;
        }
        this.router.navigate(['/proprietario/reservas']);
      } else if (this.souLocatario() && !r.avaliada) {
        this.router.navigate(['/locacoes', r.id, 'avaliar']);
      } else {
        this.router.navigate([this.souProprietario() ? '/proprietario/reservas' : '/locacoes']);
      }
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.processando.set(false);
    }
  }
}
