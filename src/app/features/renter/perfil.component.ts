import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { Papel } from '../../core/models/domain.models';
import { SegControlComponent, SegOption } from '../../shared/components/seg-control.component';

interface ItemPerfil {
  titulo: string;
  meta: string;
  ir: () => void;
}

@Component({
  selector: 'qp-perfil',
  standalone: true,
  imports: [CommonModule, SegControlComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Conta</div>
    <h4 class="qp-screen-title">Meu perfil</h4>

    <div class="qp-row" style="margin-bottom: var(--space-4);">
      <span class="qp-avatar" style="width: 52px; height: 52px; font-size: 16px;">{{ iniciais() }}</span>
      <div class="qp-stack" style="gap: 2px;">
        <strong>{{ auth.conta().nome }}</strong>
        <span class="card-meta">
          ★ {{ auth.conta().nota }} · membro desde {{ membroDesdeFmt() }} ·
          {{ auth.contaVerificada() ? 'Verificado' : 'Verificação pendente' }}
        </span>
      </div>
    </div>

    <qp-seg-control
      [options]="papelOptions"
      [value]="auth.papelAtivo()"
      (valueChange)="trocarPapel($event)"
    />

    <div class="qp-grid-2x2" style="margin: var(--space-4) 0;">
      <div class="card">
        <span class="card-kicker">Locações</span>
        <span class="card-title">{{ totalLocacoes() }}</span>
      </div>
      <div class="card">
        <span class="card-kicker">Avaliação</span>
        <span class="card-title">★ {{ auth.conta().nota }}</span>
      </div>
      <div class="card">
        <span class="card-kicker">CNH</span>
        <span class="card-title">{{ auth.conta().cnhAnos }} anos</span>
      </div>
      <div class="card">
        <span class="card-kicker">Cancelamentos</span>
        <span class="card-title">{{ cancelamentos() }}</span>
      </div>
    </div>

    <div class="qp-stack">
      @for (item of itens; track item.titulo) {
        <button type="button" class="qp-row-between qp-item-nav" (click)="item.ir()">
          <span>{{ item.titulo }}</span>
          <span class="card-meta">{{ item.meta }} ›</span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .qp-item-nav {
        width: 100%; text-align: left; background: none; border: none; border-bottom: 1px solid var(--color-divider);
        padding: var(--space-3) 0; cursor: pointer; font: inherit; color: inherit;
      }
    `,
  ],
})
export class PerfilComponent {
  papelOptions: SegOption<Papel>[] = [
    { label: 'Locatário', value: 'locatario' },
    { label: 'Proprietário', value: 'proprietario' },
  ];

  itens: ItemPerfil[] = [
    { titulo: 'Minhas locações', meta: '', ir: () => this.router.navigate(['/locacoes']) },
    { titulo: 'Verificação', meta: '', ir: () => this.router.navigate(['/verificacao']) },
    { titulo: 'Dados bancários', meta: '', ir: () => this.router.navigate(['/verificacao']) },
  ];

  constructor(public auth: AuthService, private booking: BookingService, private router: Router) {}

  iniciais = computed(() =>
    this.auth
      .conta()
      .nome.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join(''),
  );

  membroDesdeFmt = computed(() => {
    const [ano, mes] = this.auth.conta().membroDesde.split('-');
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${meses[Number(mes) - 1]} de ${ano}`;
  });

  totalLocacoes = computed(() =>
    this.booking.reservas().filter((r) => r.locatarioId === this.auth.conta().id && r.status === 'concluida').length,
  );

  cancelamentos = computed(
    () => this.booking.reservas().filter((r) => r.locatarioId === this.auth.conta().id && r.status === 'recusada').length,
  );

  trocarPapel(papel: Papel): void {
    this.auth.alternarPapel(papel);
    this.router.navigate([papel === 'locatario' ? '/buscar' : '/proprietario']);
  }
}
