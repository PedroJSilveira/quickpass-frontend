import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BookingService } from '../../core/services/booking.service';
import { DisputeService } from '../../core/services/dispute.service';
import { PricingService } from '../../core/services/pricing.service';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { ArquivoImgComponent } from '../../shared/components/arquivo-img.component';
import { mensagemErro } from '../../core/api/api.service';
import { TextareaModule } from 'primeng/textarea';

/** Locatário vê a ocorrência de avaria e pode contestar com evidências dentro do prazo (RF04). */
@Component({
  selector: 'qp-contestacao',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent, BlueprintFrameComponent, ArquivoImgComponent, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <qp-back-button />
    <div class="qp-screen-kicker">Ocorrência</div>
    <h4 class="qp-screen-title">Avaria informada — {{ reserva()?.id }}</h4>

    @if (disputa(); as d) {
      <qp-blueprint>
        <div class="qp-stack" style="padding: var(--space-3);">
          <div class="card-title">Relato do proprietário</div>
          <p class="card-body" style="margin: 0;">{{ d.avaria.descricao }}</p>
          <div class="qp-row-between"><span class="text-muted">Fotos anexadas</span><span>{{ d.avaria.qtdFotos }}</span></div>
          <div class="qp-row" style="gap: var(--space-2); flex-wrap: wrap;">
            @for (f of d.avaria.fotos; track f.id) { <qp-arquivo-img [url]="f.url" [nome]="f.nome" /> }
          </div>
          <div class="qp-row-between"><span class="text-muted">Valor estimado do reparo</span><span>{{ pricing.money(d.avaria.valorEstimado) }}</span></div>
          <p class="text-muted" style="font-size: 12px; margin: 0;">
            A caução está retida e só será capturada após decisão registrada pela mediação.
          </p>
        </div>
      </qp-blueprint>

      @if (d.status === 'AGUARDANDO_CONTESTACAO') {
        <div class="field" style="margin: var(--space-4) 0;">
          <label>Sua contestação</label>
          <textarea pTextarea rows="4" [(ngModel)]="texto" name="texto"></textarea>
        </div>
        <div class="field" style="margin-bottom: var(--space-4);">
          <label>Evidências (fotos/prints, opcional)</label>
          <input type="file" accept="image/*" multiple (change)="escolher($event)" />
          <span class="text-muted" style="font-size: 12px;">{{ evidencias().length }} arquivo(s) selecionado(s)</span>
        </div>
        @if (erro()) {
          <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
        }
        <button class="btn btn-primary btn-block" [disabled]="enviando() || !texto.trim()" (click)="enviar(d.id)">Enviar contestação</button>
      } @else {
        @if (d.contestacao; as c) {
          <p class="card-body">Sua contestação: {{ c.texto }}</p>
          <div class="qp-row" style="gap: var(--space-2); flex-wrap: wrap;">
            @for (f of c.evidencias; track f.id) { <qp-arquivo-img [url]="f.url" [nome]="f.nome" /> }
          </div>
        }
        <p class="text-muted" style="margin-top: var(--space-4);">Situação da disputa: {{ d.status }}.</p>
      }
    } @else {
      <p>Nenhuma ocorrência para esta locação.</p>
    }
  `,
})
export class ContestacaoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private booking = inject(BookingService);
  private dispute = inject(DisputeService);
  pricing = inject(PricingService);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  reserva = computed(() => this.booking.porId(this.paramMap().get('id') ?? ''));
  disputa = computed(() => this.booking.detalhe(this.paramMap().get('id') ?? '')?.disputa ?? undefined);
  texto = '';
  evidencias = signal<File[]>([]);
  erro = signal('');
  enviando = signal(false);

  ngOnInit(): void {
    void this.booking.carregarDetalhe(this.paramMap().get('id') ?? '');
  }

  escolher(ev: Event): void {
    this.evidencias.set(Array.from((ev.target as HTMLInputElement).files ?? []));
  }

  async enviar(id: string): Promise<void> {
    this.erro.set('');
    this.enviando.set(true);
    try {
      await this.dispute.contestar(id, this.texto, this.evidencias());
      this.router.navigate(['/locacoes']);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
