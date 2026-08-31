import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { AuthService } from '../../core/services/auth.service';
import { Reserva, StatusReserva } from '../../core/models/domain.models';
import { TagComponent } from '../../shared/components/tag.component';

interface CardReserva {
  reserva: Reserva;
  titulo: string;
  statusFmt: string;
  detalhe: string;
  tagVariant: 'accent' | 'neutral';
  acaoNome: string | null;
  irParaAcao: () => void;
}

const ROTULOS: Record<StatusReserva, string> = {
  aguardando: 'Aguardando proprietário',
  confirmada: 'Confirmada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  recusada: 'Recusada',
};

const DETALHES: Record<StatusReserva, string> = {
  aguardando: 'O proprietário tem 12h para aceitar. Nada foi cobrado ainda.',
  confirmada: 'Retirada combinada com o proprietário. Faça o check-in no momento da entrega.',
  em_andamento: 'Check-in feito. Devolva com o mesmo nível de combustível.',
  concluida: 'Caução liberada. Locação encerrada.',
  recusada: 'O proprietário recusou. Valor não capturado.',
};

@Component({
  selector: 'qp-locacoes',
  standalone: true,
  imports: [CommonModule, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Locatário</div>
    <h4 class="qp-screen-title">Minhas locações</h4>

    @for (grupo of grupos(); track grupo.nome) {
      <div class="qp-stack" style="margin-bottom: var(--space-6);">
        <h6>{{ grupo.nome }}</h6>
        @if (grupo.itens.length === 0) {
          <div class="qp-empty">{{ grupo.vazioTexto }}</div>
        } @else {
          @for (c of grupo.itens; track c.reserva.id) {
            <div class="card">
              <div class="qp-row-between">
                <span class="card-title">{{ c.titulo }}</span>
                <qp-tag [variant]="c.tagVariant">{{ c.statusFmt }}</qp-tag>
              </div>
              <div class="card-meta">
                {{ pricing.formatarPeriodo(c.reserva.inicio, c.reserva.fim) }} · {{ pricing.money(c.reserva.valores.total) }} · {{ c.reserva.id }}
              </div>
              <p class="card-body" style="margin: 0;">{{ c.detalhe }}</p>
              @if (c.acaoNome) {
                <button class="btn btn-secondary" style="align-self: flex-start;" (click)="c.irParaAcao()">{{ c.acaoNome }}</button>
              }
            </div>
          }
        }
      </div>
    }
  `,
})
export class LocacoesComponent {
  constructor(
    private booking: BookingService,
    private catalog: CatalogService,
    public pricing: PricingService,
    private auth: AuthService,
    private router: Router,
  ) {}

  private minhas = computed(() =>
    this.booking.reservas().filter((r) => r.locatarioId === this.auth.conta().id),
  );

  private toCard = (r: Reserva): CardReserva => {
    const v = this.catalog.porId(r.veiculoId);
    let acaoNome: string | null = null;
    let irParaAcao = () => {};

    if (r.status === 'confirmada') {
      acaoNome = 'Fazer check-in';
      irParaAcao = () => this.router.navigate(['/locacoes', r.id, 'check-in']);
    } else if (r.status === 'em_andamento') {
      acaoNome = 'Fazer check-out';
      irParaAcao = () => this.router.navigate(['/locacoes', r.id, 'check-out']);
    } else if (r.status === 'concluida' && !r.avaliada) {
      acaoNome = 'Avaliar locação';
      irParaAcao = () => this.router.navigate(['/locacoes', r.id, 'avaliar']);
    }

    return {
      reserva: r,
      titulo: v?.titulo ?? 'Veículo',
      statusFmt: ROTULOS[r.status],
      detalhe: DETALHES[r.status],
      tagVariant: r.status === 'concluida' || r.status === 'recusada' ? 'neutral' : 'accent',
      acaoNome,
      irParaAcao,
    };
  };

  grupos = computed(() => {
    const todas = this.minhas().map(this.toCard);
    return [
      { nome: 'Em andamento', itens: todas.filter((c) => c.reserva.status === 'em_andamento'), vazioTexto: 'Nenhuma locação em andamento no momento.' },
      { nome: 'Próximas', itens: todas.filter((c) => ['aguardando', 'confirmada'].includes(c.reserva.status)), vazioTexto: 'Você não tem locações futuras. Que tal buscar um carro?' },
      { nome: 'Histórico', itens: todas.filter((c) => ['concluida', 'recusada'].includes(c.reserva.status)), vazioTexto: 'Seu histórico de locações aparecerá aqui.' },
    ];
  });
}
