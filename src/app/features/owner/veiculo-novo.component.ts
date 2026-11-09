import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { mensagemErro } from '../../core/api/api.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { OwnerService } from '../../core/services/owner.service';
import { PricingService } from '../../core/services/pricing.service';
import { CategoriaVeiculo } from '../../core/models/domain.models';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { BackButtonComponent } from '../../shared/components/back-button.component';

const CATEGORIAS: CategoriaVeiculo[] = ['Hatch', 'Sedã', 'SUV', 'Híbrido', 'Elétrico'];

/** Cadastro (e edição) de anúncio: dados em JSON + fotos e documentos em multipart/form-data. */
@Component({
  selector: 'qp-veiculo-novo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BlueprintFrameComponent, BackButtonComponent, InputTextModule, InputNumberModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <qp-back-button />
    <div class="qp-screen-kicker">Proprietário</div>
    <h4 class="qp-screen-title">{{ editarId ? 'Editar anúncio' : 'Cadastrar veículo' }}</h4>

    @if (!auth.contaVerificada()) {
      <div class="card" style="border-color: var(--color-accent); margin-bottom: var(--space-4);">
        <div class="card-title">Verificação de identidade pendente</div>
        <p class="card-body">Para anunciar um veículo é preciso ter o KYC aprovado (documento, CNH, selfie e dados de cobrança).</p>
        <a class="btn btn-secondary" style="align-self: flex-start;" routerLink="/verificacao">Ir para verificação</a>
      </div>
    }

    <div class="field" style="margin-bottom: var(--space-4);">
      <label>Fotos do veículo {{ editarId ? '(adicionar)' : '(mínimo ' + minimoFotos + ')' }}</label>
      <input type="file" accept="image/*" multiple (change)="escolherFotos($event)" />
      <span class="text-muted" style="font-size: 12px;">{{ fotos().length }} foto(s) selecionada(s)</span>
      @if (previas().length) {
        <div class="qp-row" style="gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-2);">
          @for (p of previas(); track p) {
            <img [src]="p" alt="" style="width: 72px; height: 54px; object-fit: cover; border: 1px solid var(--color-divider);" />
          }
        </div>
      }
    </div>

    @if (!editarId) {
      <div class="grid-form qp-grid-2" style="margin-bottom: var(--space-4);">
        <div class="field"><label>Marca</label><input pInputText [(ngModel)]="marca" name="marca" /></div>
        <div class="field"><label>Modelo</label><input pInputText [(ngModel)]="modelo" name="modelo" /></div>
        <div class="field"><label>Ano</label><p-inputnumber [(ngModel)]="ano" name="ano" [useGrouping]="false" /></div>
        <div class="field"><label>Placa</label><input pInputText [(ngModel)]="placa" name="placa" placeholder="ABC1D23" /></div>
        <div class="field"><label>Bairro / região (aparece na busca)</label><input pInputText [(ngModel)]="local" name="local" placeholder="Centro" /></div>
        <div class="field"><label>Endereço exato (só após pagamento)</label><input pInputText [(ngModel)]="enderecoExato" name="endereco" /></div>
        <div class="field">
          <label>Câmbio</label>
          <select [(ngModel)]="cambio" name="cambio"><option>Manual</option><option>Automático</option></select>
        </div>
        <div class="field">
          <label>Combustível</label>
          <select [(ngModel)]="combustivel" name="combustivel"><option>Flex</option><option>Híbrido</option><option>Elétrico</option></select>
        </div>
        <div class="field"><label>Lugares</label><p-inputnumber [(ngModel)]="lugares" name="lugares" [min]="1" [useGrouping]="false" /></div>
        <div class="field"><label>Quilometragem</label><p-inputnumber [(ngModel)]="km" name="km" [min]="0" [useGrouping]="false" suffix=" km" /></div>
        <div class="field"><label>Consumo (opcional)</label><input pInputText [(ngModel)]="consumo" name="consumo" placeholder="12 km/l" /></div>
      </div>

      <div class="qp-row" style="flex-wrap: wrap; margin-bottom: var(--space-4);">
        @for (cat of categorias; track cat) {
          <button type="button" class="btn btn-secondary" [class.qp-chip-ativo]="categoria() === cat" (click)="categoria.set(cat)">{{ cat }}</button>
        }
      </div>
    }

    <div class="qp-grid-2" style="margin-bottom: var(--space-4);">
      <div class="field"><label>Diária (R$)</label><p-inputnumber [(ngModel)]="diaria" name="diaria" mode="currency" currency="BRL" locale="pt-BR" /></div>
      @if (editarId) {
        <div class="field"><label>Endereço exato</label><input pInputText [(ngModel)]="enderecoExato" name="endereco2" /></div>
      }
    </div>

    @if (!editarId) {
      <div class="field" style="margin-bottom: var(--space-4);">
        <label>Documentos do veículo: CRLV e comprovante de seguro (imagem ou PDF, opcional)</label>
        <input type="file" accept="image/*,application/pdf" multiple (change)="escolherDocumentos($event)" />
        <span class="text-muted" style="font-size: 12px;">{{ documentos().length }} arquivo(s) selecionado(s) · só você e a moderação têm acesso</span>
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
      <p class="text-muted" style="font-size: 13px; margin-bottom: var(--space-4);">{{ diasLiberados() }} de 28 dias liberados</p>
    }

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

    @if (erro()) {
      <p role="alert" style="font-size: 13px; color: var(--color-danger, #b3261e);">{{ erro() }}</p>
    }
    <button class="btn btn-primary btn-block" [disabled]="!auth.contaVerificada() || enviando()" (click)="enviar()">
      {{ enviando() ? 'Enviando…' : editarId ? 'Salvar alterações' : 'Enviar para aprovação' }}
    </button>
  `,
  styles: [
    `
      .qp-chip-ativo { border-color: var(--color-accent); background: var(--color-accent-100); color: var(--color-accent-800); }
    `,
  ],
})
export class VeiculoNovoComponent implements OnInit {
  categorias = CATEGORIAS;
  minimoFotos = inject(AppConfigService).get('FOTOS_VEICULO_MINIMAS');
  editarId = inject(ActivatedRoute).snapshot.queryParamMap.get('editar');

  marca = '';
  modelo = '';
  ano: number | null = new Date().getFullYear();
  placa = '';
  diaria = 150;
  local = '';
  enderecoExato = '';
  cambio = 'Manual';
  combustivel = 'Flex';
  lugares: number | null = 5;
  km: number | null = 0;
  consumo = '';
  categoria = signal<CategoriaVeiculo>('Hatch');
  fotos = signal<File[]>([]);
  documentos = signal<File[]>([]);
  previas = signal<string[]>([]);
  erro = signal('');
  enviando = signal(false);

  private diasAtivos = signal<Record<string, boolean>>(this.calendarioInicial());

  calendario = computed(() =>
    Object.entries(this.diasAtivos()).map(([iso, ativo]) => ({ iso, numero: Number(iso.slice(-2)), ativo })),
  );
  diasLiberados = computed(() => Object.values(this.diasAtivos()).filter(Boolean).length);
  projecao = () => this.diaria * 8 - this.diaria * 8 * (this.pricing.taxaPct / 100);

  constructor(
    public auth: AuthService,
    private catalog: CatalogService,
    private owner: OwnerService,
    public pricing: PricingService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.editarId) return;
    await this.catalog.carregarMeus();
    const v = this.catalog.porId(this.editarId);
    if (!v) {
      this.erro.set('Anúncio não encontrado.');
      return;
    }
    this.diaria = v.diaria;
    this.enderecoExato = v.enderecoExato ?? '';
  }

  private calendarioInicial(): Record<string, boolean> {
    const dias: Record<string, boolean> = {};
    const base = new Date();
    for (let i = 0; i < 28; i++) {
      const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      dias[iso] = dt.getDay() >= 4 || dt.getDay() === 0;
    }
    return dias;
  }

  alternarDia(iso: string): void {
    this.diasAtivos.update((dias) => ({ ...dias, [iso]: !dias[iso] }));
  }

  escolherFotos(ev: Event): void {
    const arquivos = Array.from((ev.target as HTMLInputElement).files ?? []);
    this.fotos.set(arquivos);
    this.previas.update((antigas) => {
      antigas.forEach((u) => URL.revokeObjectURL(u));
      return arquivos.map((f) => URL.createObjectURL(f));
    });
  }

  escolherDocumentos(ev: Event): void {
    this.documentos.set(Array.from((ev.target as HTMLInputElement).files ?? []));
  }

  async enviar(): Promise<void> {
    this.erro.set('');
    this.enviando.set(true);
    try {
      if (this.editarId) {
        await this.catalog.atualizar(this.editarId, { diaria: this.diaria, enderecoExato: this.enderecoExato || undefined });
        if (this.fotos().length) await this.catalog.adicionarFotos(this.editarId, this.fotos());
        this.router.navigate(['/proprietario/veiculos']);
        return;
      }
      if (this.fotos().length < this.minimoFotos) throw new Error(`Envie ao menos ${this.minimoFotos} fotos do veículo.`);
      const v = await this.catalog.cadastrar(
        {
          marca: this.marca.trim(),
          modelo: this.modelo.trim(),
          ano: this.ano ?? new Date().getFullYear(),
          placa: this.placa.trim(),
          categoria: this.categoria(),
          diaria: this.diaria,
          local: this.local.trim(),
          enderecoExato: this.enderecoExato.trim(),
          cambio: this.cambio,
          combustivel: this.combustivel,
          lugares: this.lugares ?? 5,
          km: this.km ?? 0,
          consumo: this.consumo.trim() || undefined,
        },
        this.fotos(),
        this.documentos(),
      );
      // A agenda inicial é publicada junto; o anúncio só aparece na busca depois de aprovado pela moderação.
      try {
        await this.owner.salvarDisponibilidade({ veiculoId: v.id, dias: this.diasAtivos(), aceiteAutomatico: false });
      } catch {
        /* o anúncio já foi criado; a agenda pode ser ajustada depois */
      }
      this.router.navigate(['/proprietario/veiculos']);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
