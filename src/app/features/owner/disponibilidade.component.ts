import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../core/services/catalog.service';
import { OwnerService } from '../../core/services/owner.service';
import { Disponibilidade } from '../../core/models/domain.models';
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
    const v = this.veiculo();
    if (v) {
      const d = this.owner.disponibilidadeDoVeiculo(v.id);
      this.disponibilidade.set(d);
      this.diaria = v.diaria;
      this.aceiteAutomatico = d.aceiteAutomatico;
    }
  }

  alternar(iso: string): void {
    this.disponibilidade.update((d) => ({ ...d, dias: { ...d.dias, [iso]: !d.dias[iso] } }));
  }

  salvar(veiculoId: string): void {
    this.owner.salvarDisponibilidade({
      ...this.disponibilidade(),
      veiculoId,
      aceiteAutomatico: this.aceiteAutomatico,
    });
    this.catalog.atualizar(veiculoId, { diaria: this.diaria });
    this.router.navigate(['/proprietario/veiculos']);
  }
}
