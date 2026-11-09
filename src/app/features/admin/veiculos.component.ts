import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/api/api.service';
import { Veiculo } from '../../core/models/domain.models';
import { AdminService } from '../../core/services/admin.service';
import { PricingService } from '../../core/services/pricing.service';
import { ArquivoImgComponent } from '../../shared/components/arquivo-img.component';
import { urlImagem } from '../../core/api/api.config';

/** Moderação de anúncios (admin): só veículos aprovados aparecem na busca. */
@Component({
  selector: 'qp-moderacao-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule, ArquivoImgComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Moderação</div>
    <h4 class="qp-screen-title">Veículos em análise</h4>

    @if (erro()) {
      <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
    }
    @if (carregado() && fila().length === 0) {
      <div class="qp-empty">Nenhum veículo aguardando análise.</div>
    }
    <div class="qp-stack">
      @for (v of fila(); track v.id) {
        <div class="card">
          <div class="qp-row-between">
            <span class="card-title">{{ v.titulo }}</span>
            <span class="card-meta">{{ pricing.moneyRounded(v.diaria) }}/dia · {{ v.local }}</span>
          </div>
          <div class="card-meta">Placa {{ v.placa }} · {{ v.categoria }} · {{ v.cambio }} · {{ v.combustivel }} · {{ v.km }} km · proprietário {{ v.proprietarioNome }} ({{ v.proprietarioId }})</div>
          <div class="qp-row" style="gap: var(--space-2); flex-wrap: wrap; margin: var(--space-2) 0;">
            @for (f of v.fotos; track f) {
              <a [href]="img(f)" target="_blank" rel="noopener"><img [src]="img(f)" alt="" style="width: 96px; height: 72px; object-fit: cover; border: 1px solid var(--color-divider);" /></a>
            }
          </div>
          <div class="qp-row" style="gap: var(--space-2); flex-wrap: wrap;">
            <input class="p-inputtext" placeholder="Motivo (obrigatório para recusar)" [ngModel]="motivos()[v.id] || ''" (ngModelChange)="definirMotivo(v.id, $event)" style="flex: 1; min-width: 200px;" />
            <button class="btn btn-primary" (click)="aprovar(v)">Aprovar</button>
            <button class="btn btn-secondary" (click)="recusar(v)">Recusar</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class VeiculosModeracaoComponent implements OnInit {
  private admin = inject(AdminService);
  pricing = inject(PricingService);
  img = urlImagem;
  fila = signal<Veiculo[]>([]);
  carregado = signal(false);
  erro = signal('');
  motivos = signal<Record<string, string>>({});

  ngOnInit(): void {
    void this.carregar();
  }

  definirMotivo(id: string, m: string): void {
    this.motivos.update((o) => ({ ...o, [id]: m }));
  }

  private async carregar(): Promise<void> {
    try {
      this.fila.set(await this.admin.veiculos('EM_ANALISE'));
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregado.set(true);
    }
  }

  async aprovar(v: Veiculo): Promise<void> {
    await this.agir(() => this.admin.aprovarVeiculo(v.id));
  }

  async recusar(v: Veiculo): Promise<void> {
    await this.agir(() => this.admin.recusarVeiculo(v.id, (this.motivos()[v.id] || '').trim()));
  }

  private async agir(f: () => Promise<void>): Promise<void> {
    this.erro.set('');
    try {
      await f();
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }
}
