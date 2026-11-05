import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../core/services/catalog.service';
import { OwnerService } from '../../core/services/owner.service';
import { AvailabilityTemplate, Disponibilidade } from '../../core/models/domain.models';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'qp-disponibilidade',
  standalone: true,
  imports: [CommonModule, FormsModule, BackButtonComponent, InputNumberModule, CheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (veiculo(); as v) {
      <qp-back-button />
      <div class="qp-screen-kicker">Veículo</div>
      <h4 class="qp-screen-title">Disponibilidade — {{ v.titulo }}</h4>

      <div class="qp-calendar" style="margin-bottom: var(--space-2);">
        @for (dia of dias(); track dia.iso) {
          <div
            class="qp-cal-day"
            [style.background]="dia.ativo ? 'var(--color-accent)' : 'var(--color-bg)'"
            [style.color]="dia.ativo ? 'var(--color-bg)' : 'var(--color-neutral-700)'"
            (click)="alternar(dia.iso)"
          >
            {{ dia.numero }}
          </div>
        }
      </div>

      <div class="qp-row" style="gap: var(--space-4); font-size: 12px; margin-bottom: var(--space-4);">
        <span class="qp-row" style="gap: 4px;"><span class="qp-legend" style="background: var(--color-accent);"></span> Liberado</span>
        <span class="qp-row" style="gap: 4px;"><span class="qp-legend" style="background: var(--color-bg); border: 1px solid var(--color-divider);"></span> Bloqueado</span>
      </div>

      <div class="field" style="margin-bottom: var(--space-4); max-width: 220px;">
        <label>Diária do período (R$)</label>
        <p-inputnumber [(ngModel)]="diaria" name="diaria" mode="currency" currency="BRL" locale="pt-BR" />
      </div>

      <label class="qp-row" style="margin-bottom: var(--space-4); cursor: pointer; gap: var(--space-2);">
        <p-checkbox [(ngModel)]="aceiteAutomatico" name="aceite" [binary]="true" />
        Aceite automático de reservas
      </label>

      <div class="card" style="margin-bottom: var(--space-4);">
        <span class="card-kicker">Liberar agenda com um toque</span>
        <div class="qp-row" style="gap: var(--space-2); margin: var(--space-2) 0;">
          <select [ngModel]="template().tipo" (ngModelChange)="definirTemplate({ tipo: $event })" name="tplTipo">
            <option value="proximo_fim_de_semana">Próximo fim de semana</option>
            <option value="sexta_a_domingo">Sex–dom das próximas N semanas</option>
          </select>
          @if (template().tipo === 'sexta_a_domingo') {
            <p-inputnumber [ngModel]="template().semanas" (ngModelChange)="definirTemplate({ semanas: $event })" [min]="1" [max]="8" [useGrouping]="false" name="tplSemanas" suffix=" sem." />
          }
          <button class="btn btn-ghost" (click)="salvarTemplate()">Salvar template</button>
        </div>
        @if (previa(v.id); as p) {
          @if (p.motivos.length) {
            <p class="text-muted" style="font-size: 13px;">Não é possível publicar: {{ p.motivos.join(' ') }}</p>
          } @else {
            <p class="text-muted" style="font-size: 13px;">Serão liberados {{ p.dias.length }} dia(s): {{ p.dias.join(', ') }}</p>
          }
          <button class="btn btn-secondary" [disabled]="p.motivos.length > 0" (click)="liberar(v.id)">Confirmar e liberar</button>
        }
        @if (resultado(); as r) {
          <p style="margin: var(--space-2) 0 0;">
            Liberado. Solicitações recebidas: {{ r.recompensa.solicitacoesRecebidas }} ·
            Buscas compatíveis (7 dias): {{ r.recompensa.buscasCompativeis ?? 'dados insuficientes' }}.
          </p>
          <button class="btn btn-ghost" (click)="desfazer(v.id)">Desfazer</button>
        }
        @if (sugestoes().length) {
          <p class="text-muted" style="font-size: 12px;">Sugestão pelo seu histórico: {{ sugestoes().join(', ') }}</p>
        }
      </div>

      <div class="card" style="margin-bottom: var(--space-4);">
        <span class="card-kicker">Preferências do anúncio</span>
        <div class="qp-grid-2" style="margin-top: var(--space-2);">
          <div class="field"><label>Antecedência mínima (horas)</label><p-inputnumber [(ngModel)]="antecedencia" name="antec" [min]="0" [useGrouping]="false" /></div>
          <div class="field"><label>Duração mínima (diárias)</label><p-inputnumber [(ngModel)]="duracao" name="dur" [min]="1" [useGrouping]="false" /></div>
        </div>
        <p class="text-muted" style="font-size: 12px; margin: 4px 0 0;">Aplicadas automaticamente às próximas reservas. O aceite automático vale para locatários bem avaliados.</p>
      </div>

      @if (erro()) {
        <p class="text-muted" style="font-size: 13px;">{{ erro() }}</p>
      }
      <button class="btn btn-primary" (click)="salvar(v.id)">Salvar disponibilidade</button>
    }
  `,
  styles: [
    `.qp-legend { width: 12px; height: 12px; display: inline-block; }`,
  ],
})
export class DisponibilidadeComponent {
  private route = inject(ActivatedRoute);
  private paramMap = toSignal(this.route.paramMap, { requireSync: true });

  veiculo = computed(() => this.catalog.porId(this.paramMap().get('id') ?? ''));

  private disponibilidade = signal<Disponibilidade>({ veiculoId: '', dias: {}, aceiteAutomatico: false });
  diaria = 0;
  aceiteAutomatico = false;

  dias = computed(() =>
    Object.entries(this.disponibilidade().dias).map(([iso, ativo]) => ({
      iso,
      numero: Number(iso.slice(-2)),
      ativo,
    })),
  );

  constructor(private catalog: CatalogService, private owner: OwnerService, private router: Router) {
    const t = this.owner.template();
    if (t) this.template.set(t);
    const v = this.veiculo();
    if (v) {
      const d = this.owner.disponibilidadeDoVeiculo(v.id);
      this.disponibilidade.set(d);
      this.diaria = v.diaria;
      this.aceiteAutomatico = d.aceiteAutomatico;
      const pref = this.owner.preferencias(v.id);
      this.antecedencia = pref.antecedenciaMinimaHoras;
      this.duracao = pref.duracaoMinimaDias;
    }
  }

  alternar(iso: string): void {
    this.disponibilidade.update((d) => ({ ...d, dias: { ...d.dias, [iso]: !d.dias[iso] } }));
  }

  erro = signal('');
  template = signal<AvailabilityTemplate>({ tipo: 'proximo_fim_de_semana', semanas: 2 });
  resultado = signal<ReturnType<OwnerService['liberarComUmToque']> | null>(null);
  antecedencia = 0;
  duracao = 1;
  sugestoes = computed(() => (this.veiculo() ? this.owner.sugerirDatas(this.veiculo()!.id) : []));

  definirTemplate(patch: Partial<AvailabilityTemplate>): void {
    this.template.update((t) => ({ ...t, ...patch }));
  }

  salvarTemplate(): void {
    this.owner.salvarTemplate(this.template());
  }

  previa(id: string) {
    this.owner.template() ?? this.owner.salvarTemplate(this.template());
    return this.owner.previaUmToque(id);
  }

  liberar(id: string): void {
    this.erro.set('');
    try {
      this.resultado.set(this.owner.liberarComUmToque(id));
      this.disponibilidade.set(this.owner.disponibilidadeDoVeiculo(id));
    } catch (e) {
      this.erro.set((e as Error).message);
    }
  }

  desfazer(id: string): void {
    this.erro.set('');
    try {
      this.owner.desfazer(id);
      this.resultado.set(null);
      this.disponibilidade.set(this.owner.disponibilidadeDoVeiculo(id));
    } catch (e) {
      this.erro.set((e as Error).message);
    }
  }

  salvar(veiculoId: string): void {
    this.owner.salvarPreferencias(veiculoId, { antecedenciaMinimaHoras: this.antecedencia, duracaoMinimaDias: this.duracao });
    try {
      this.owner.salvarDisponibilidade({
        ...this.disponibilidade(),
        veiculoId,
        aceiteAutomatico: this.aceiteAutomatico,
      });
    } catch (e) {
      // Ex.: KYC não aprovado — publicar agenda exige verificação (RF02).
      this.erro.set((e as Error).message);
      return;
    }
    this.catalog.atualizar(veiculoId, { diaria: this.diaria });
    this.router.navigate(['/proprietario/veiculos']);
  }
}
