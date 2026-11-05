import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepositService } from '../../core/services/deposit.service';
import { DisputeService } from '../../core/services/dispute.service';
import { PricingService } from '../../core/services/pricing.service';
import { TipoDecisao } from '../../core/models/domain.models';
import { TagComponent } from '../../shared/components/tag.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';

/** Fila do mediador (papel admin mockado): assume a análise e registra a decisão (RF04). */
@Component({
  selector: 'qp-disputas',
  standalone: true,
  imports: [CommonModule, FormsModule, TagComponent, InputNumberModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Mediação</div>
    <h4 class="qp-screen-title">Disputas de caução</h4>

    @if (dispute.disputas().length === 0) {
      <div class="qp-empty">Nenhuma disputa aberta.</div>
    }
    <div class="qp-stack">
      @for (d of dispute.disputas(); track d.id) {
        <div class="card">
          <div class="qp-row-between">
            <span class="card-title">{{ d.reservaId }} · {{ d.id }}</span>
            <qp-tag [variant]="d.status === 'DECIDIDA' ? 'neutral' : 'accent'">{{ d.status }}</qp-tag>
          </div>
          <p class="card-body">Proprietário: {{ d.avaria.descricao }} ({{ d.avaria.qtdFotos }} foto(s), estimativa {{ pricing.money(d.avaria.valorEstimado) }})</p>
          @if (d.contestacao; as c) {
            <p class="card-body">Locatário: {{ c.texto }} ({{ c.qtdEvidencias }} evidência(s))</p>
          } @else if (d.status === 'AGUARDANDO_CONTESTACAO') {
            <p class="text-muted" style="font-size: 13px;">Aguardando contestação até {{ d.contestarAte | date: 'dd/MM HH:mm' }}.</p>
          } @else {
            <p class="text-muted" style="font-size: 13px;">Sem contestação no prazo.</p>
          }

          @if (d.status === 'CONTESTADA' || d.status === 'NAO_CONTESTADA_NO_PRAZO') {
            <button class="btn btn-secondary" (click)="assumir(d.id)">Assumir análise</button>
          }
          @if (d.status === 'EM_ANALISE') {
            <div class="qp-stack" style="margin-top: var(--space-2);">
              <div class="qp-row" style="gap: var(--space-2);">
                <select [ngModel]="tipo()" (ngModelChange)="tipo.set($event)" name="tipo">
                  <option value="liberacao">Liberar caução</option>
                  <option value="captura_parcial">Captura parcial</option>
                  <option value="captura_total">Captura total</option>
                </select>
                @if (tipo() === 'captura_parcial') {
                  <p-inputnumber [(ngModel)]="valor" name="valor" mode="currency" currency="BRL" locale="pt-BR" />
                }
              </div>
              <textarea pTextarea rows="2" placeholder="Justificativa da decisão (obrigatória)" [(ngModel)]="justificativa" name="justificativa"></textarea>
              @if (erro()) {
                <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
              }
              <button class="btn btn-primary" (click)="decidir(d.id)">Registrar decisão</button>
            </div>
          }
          @if (d.decisao; as dec) {
            <p class="card-body">Decisão: {{ dec.tipo }} · {{ pricing.money(dec.valor) }} — {{ dec.justificativa }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class DisputasComponent {
  dispute = inject(DisputeService);
  private deposit = inject(DepositService);
  pricing = inject(PricingService);

  tipo = signal<TipoDecisao>('liberacao');
  valor: number | null = 0;
  justificativa = '';
  erro = signal('');
  private readonly mediador = 'mediador-1';

  assumir(id: string): void {
    this.dispute.assumirAnalise(id, this.mediador);
  }

  async decidir(id: string): Promise<void> {
    this.erro.set('');
    try {
      await this.dispute.decidir(id, { tipo: this.tipo(), valor: this.valor ?? 0, justificativa: this.justificativa }, this.mediador);
      this.justificativa = '';
    } catch (e) {
      this.erro.set((e as Error).message);
    }
  }
}
