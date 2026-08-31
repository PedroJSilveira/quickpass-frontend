import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { OwnerService } from '../../core/services/owner.service';
import { PricingService } from '../../core/services/pricing.service';
import { CategoriaVeiculo, Veiculo } from '../../core/models/domain.models';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';

const CATEGORIAS: CategoriaVeiculo[] = ['Hatch', 'Sedã', 'SUV', 'Híbrido', 'Elétrico'];

@Component({
  selector: 'qp-veiculo-novo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BlueprintFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Proprietário</div>
    <h4 class="qp-screen-title">Cadastrar veículo</h4>

    @if (!auth.conta().kyc.banco) {
      <div class="card" style="border-color: var(--color-accent); margin-bottom: var(--space-4);">
        <div class="card-title">Dados bancários pendentes</div>
        <p class="card-body">Para anunciar um veículo é preciso cadastrar os dados de cobrança primeiro.</p>
        <a class="btn btn-secondary" style="align-self: flex-start;" routerLink="/verificacao">Ir para verificação</a>
      </div>
    }

    <div class="qp-empty" style="margin-bottom: var(--space-4);">
      Fotos do veículo (mínimo 6) — envio de arquivos fora do escopo deste protótipo de design.
    </div>

    <div class="qp-grid-2" style="margin-bottom: var(--space-4);">
      <div class="field"><label>Marca</label><input class="input" [(ngModel)]="marca" name="marca" /></div>
      <div class="field"><label>Modelo</label><input class="input" [(ngModel)]="modelo" name="modelo" /></div>
      <div class="field"><label>Ano</label><input class="input" type="number" [(ngModel)]="ano" name="ano" /></div>
      <div class="field"><label>Placa</label><input class="input" [(ngModel)]="placa" name="placa" placeholder="ABC1D23" /></div>
      <div class="field"><label>Diária (R$)</label><input class="input" type="number" [(ngModel)]="diaria" name="diaria" /></div>
    </div>

    <div class="qp-row" style="flex-wrap: wrap; margin-bottom: var(--space-4);">
      @for (cat of categorias; track cat) {
        <button
          type="button"
          class="btn btn-secondary"
          [class.qp-chip-ativo]="categoria() === cat"
          (click)="categoria.set(cat)"
        >
          {{ cat }}
        </button>
      }
    </div>

    <div class="qp-empty" style="margin-bottom: var(--space-4);">
      Documentos do veículo: CRLV, comprovante de seguro e fotos da vistoria inicial — upload fora do escopo deste protótipo.
    </div>

    <h5>Disponibilidade inicial</h5>
    <div class="qp-calendar" style="margin-bottom: var(--space-2);">
      @for (dia of calendario(); track dia.iso) {
        <div
          class="qp-cal-day"
          [style.background]="dia.ativo ? 'var(--color-accent)' : 'var(--color-bg)'"
          [style.color]="dia.ativo ? 'var(--color-bg)' : 'var(--color-neutral-700)'"
          (click)="alternarDia(dia.iso)"
        >
          {{ dia.numero }}
        </div>
      }
    </div>
    <p class="text-muted" style="font-size: 13px; margin-bottom: var(--space-4);">
      {{ diasLiberados() }} de 28 dias liberados
    </p>

    <qp-blueprint [preenchido]="true">
      <div class="qp-stack">
        <span class="card-kicker" style="color: var(--color-accent-300);">Projeção</span>
        <div class="qp-row-between">
          <span>8 diárias/mês · taxa de {{ pricing.taxaPct }}% descontada</span>
        </div>
        <span style="font-size: 24px; font-family: var(--font-heading); font-weight: 600;">
          Você recebe {{ pricing.moneyRounded(projecao()) }}/mês
        </span>
      </div>
    </qp-blueprint>

    <button class="btn btn-primary btn-block" [disabled]="!auth.conta().kyc.banco" (click)="enviar()">
      Enviar para aprovação
    </button>
  `,
  styles: [
    `.qp-chip-ativo { border-color: var(--color-accent); background: var(--color-accent-100); color: var(--color-accent-800); }`,
  ],
})
export class VeiculoNovoComponent {
  categorias = CATEGORIAS;

  marca = '';
  modelo = '';
  ano: number | null = new Date().getFullYear();
  placa = '';
  diaria = 150;
  categoria = signal<CategoriaVeiculo>('Hatch');

  private diasAtivos = signal<Record<string, boolean>>(this.calendarioInicial());

  calendario = computed(() => {
    const dias = this.diasAtivos();
    return Object.entries(dias).map(([iso, ativo]) => ({
      iso,
      numero: Number(iso.slice(-2)),
      ativo,
    }));
  });

  diasLiberados = computed(() => Object.values(this.diasAtivos()).filter(Boolean).length);

  projecao = computed(() => {
    const bruto = this.diaria * 8;
    return bruto - bruto * (this.pricing.taxaPct / 100);
  });

  constructor(
    public auth: AuthService,
    private catalog: CatalogService,
    private owner: OwnerService,
    public pricing: PricingService,
    private router: Router,
  ) {}

  private calendarioInicial(): Record<string, boolean> {
    const dias: Record<string, boolean> = {};
    const base = new Date();
    for (let i = 0; i < 28; i++) {
      const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      dias[dt.toISOString().slice(0, 10)] = dt.getDay() >= 4 || dt.getDay() === 0;
    }
    return dias;
  }

  alternarDia(iso: string): void {
    this.diasAtivos.update((dias) => ({ ...dias, [iso]: !dias[iso] }));
  }

  enviar(): void {
    const id = 'u1-v' + (this.catalog.doProprietario(this.auth.conta().id).length + 1);
    const veiculo: Veiculo = {
      id,
      titulo: `${this.marca} ${this.modelo} ${this.ano}`.trim(),
      foto: 'assets/foto-a.jpeg',
      marca: this.marca,
      modelo: this.modelo,
      ano: this.ano ?? new Date().getFullYear(),
      placa: this.placa,
      categoria: this.categoria(),
      diaria: this.diaria,
      local: 'Centro',
      distanciaKm: 0,
      cambio: 'Manual',
      combustivel: 'Flex',
      lugares: 5,
      km: 0,
      consumo: '—',
      proprietarioId: this.auth.conta().id,
      proprietarioNome: this.auth.conta().nome,
      proprietarioIniciais: this.auth
        .conta()
        .nome.split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join(''),
      proprietarioNota: this.auth.conta().nota,
      status: 'Em análise',
      nota: null,
      locacoes: 0,
      manutencao: [],
    };
    this.catalog.cadastrar(veiculo);
    this.owner.salvarDisponibilidade({ veiculoId: id, dias: this.diasAtivos(), aceiteAutomatico: false });
    this.router.navigate(['/proprietario/veiculos']);
  }
}
