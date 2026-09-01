import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Clock, CheckCircle2, Car, CheckCheck, XCircle, Search } from 'lucide-angular';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { AuthService } from '../../core/services/auth.service';
import { Reserva, StatusReserva } from '../../core/models/domain.models';
import { TagComponent, TagVariant } from '../../shared/components/tag.component';

interface CardReserva {
  reserva: Reserva;
  titulo: string;
  foto: string;
  statusFmt: string;
  statusIcon: typeof Clock;
  detalhe: string;
  tagVariant: TagVariant;
  cor: string;
  fundo: string;
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

const ICONES: Record<StatusReserva, typeof Clock> = {
  aguardando: Clock,
  confirmada: CheckCircle2,
  em_andamento: Car,
  concluida: CheckCheck,
  recusada: XCircle,
};

/** Faixa + fundo de cada card, e variante da tag — dentro da paleta de 2 tons já usada no app. */
const STATUS_TOM: Record<StatusReserva, { variant: TagVariant; cor: string; fundo: string }> = {
  aguardando: { variant: 'accent-2', cor: 'var(--color-accent-2)', fundo: 'var(--color-accent-2-100)' },
  confirmada: { variant: 'accent', cor: 'var(--color-accent)', fundo: 'var(--color-accent-100)' },
  em_andamento: { variant: 'accent', cor: 'var(--color-accent-600)', fundo: 'var(--color-accent-200)' },
  concluida: { variant: 'neutral', cor: 'var(--color-neutral-400)', fundo: 'var(--color-neutral-100)' },
  recusada: { variant: 'outline', cor: 'var(--color-neutral-300)', fundo: 'var(--color-surface)' },
};

@Component({
  selector: 'qp-locacoes',
  standalone: true,
  imports: [CommonModule, RouterLink, TagComponent, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Locatário</div>
    <h4 class="qp-screen-title">Minhas locações</h4>

    @for (grupo of grupos(); track grupo.nome) {
      <div class="qp-stack" style="margin-bottom: var(--space-6);">
        <div class="qp-row" style="gap: var(--space-2);">
          <h6 style="margin: 0;">{{ grupo.nome }}</h6>
          @if (grupo.itens.length > 0) {
            <span class="qp-loc-count">{{ grupo.itens.length }}</span>
          }
        </div>
        @if (grupo.itens.length === 0) {
          <div class="qp-empty qp-loc-empty">
            <lucide-icon [img]="SearchIcon" [size]="20" />
            <p style="margin: 0;">{{ grupo.vazioTexto }}</p>
            @if (grupo.cta) {
              <a class="btn btn-secondary" routerLink="/buscar">Buscar carros</a>
            }
          </div>
        } @else {
          @for (c of grupo.itens; track c.reserva.id) {
            <div class="qp-loc-card" [style.background]="c.fundo">
              <div class="qp-loc-stripe" [style.background]="c.cor"></div>
              <div class="qp-loc-thumb-wrap" (click)="abrir(c.reserva.veiculoId)">
                <div class="qp-loc-thumb" [style.background-image]="'url(' + c.foto + ')'"></div>
              </div>
              <div class="qp-stack qp-loc-body">
                <div class="qp-row-between">
                  <span class="card-title">{{ c.titulo }}</span>
                  <qp-tag [variant]="c.tagVariant">
                    <lucide-icon [img]="c.statusIcon" [size]="12" style="margin-right: 4px; vertical-align: -2px;" />
                    {{ c.statusFmt }}
                  </qp-tag>
                </div>
                <div class="card-meta">
                  {{ pricing.formatarPeriodo(c.reserva.inicio, c.reserva.fim) }} · {{ pricing.money(c.reserva.valores.total) }} · {{ c.reserva.id }}
                </div>
                <p class="card-body" style="margin: 0;">{{ c.detalhe }}</p>
                @if (c.acaoNome) {
                  <button class="btn btn-secondary" style="align-self: flex-start;" (click)="c.irParaAcao()">{{ c.acaoNome }}</button>
                }
              </div>
            </div>
          }
        }
      </div>
    }
  `,
  styles: [
    `
      .qp-loc-count {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 18px; height: 18px; padding: 0 5px; font-size: 11px; font-weight: 600;
        background: var(--color-accent-100); color: var(--color-accent-800); border-radius: 999px;
      }

      .qp-loc-card {
        display: flex; overflow: hidden; background: var(--color-surface);
        border: 1px solid var(--color-divider); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
        transition: box-shadow .18s ease, transform .18s ease;
      }
      .qp-loc-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
      .qp-loc-stripe { flex: none; width: 8px; }
      .qp-loc-thumb-wrap { flex: none; width: 150px; overflow: hidden; cursor: pointer; }
      .qp-loc-thumb {
        width: 100%; height: 100%; min-height: 110px; background-size: cover; background-position: center;
        transition: transform .3s ease;
      }
      .qp-loc-thumb-wrap:hover .qp-loc-thumb { transform: scale(1.06); }
      .qp-loc-body { flex: 1; padding: var(--space-4); gap: 6px; min-width: 0; }

      .qp-loc-empty {
        display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
        color: var(--color-neutral-600); border-radius: var(--radius-lg);
      }

      @media (max-width: 560px) {
        .qp-loc-card { flex-direction: column; }
        .qp-loc-thumb-wrap { width: 100%; height: 140px; }
      }
    `,
  ],
})
export class LocacoesComponent {
  readonly SearchIcon = Search;

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
      foto: v?.foto ?? '',
      statusFmt: ROTULOS[r.status],
      statusIcon: ICONES[r.status],
      detalhe: DETALHES[r.status],
      tagVariant: STATUS_TOM[r.status].variant,
      cor: STATUS_TOM[r.status].cor,
      fundo: STATUS_TOM[r.status].fundo,
      acaoNome,
      irParaAcao,
    };
  };

  grupos = computed(() => {
    const todas = this.minhas().map(this.toCard);
    return [
      {
        nome: 'Em andamento',
        itens: todas.filter((c) => c.reserva.status === 'em_andamento'),
        vazioTexto: 'Nenhuma locação em andamento no momento.',
        cta: false,
      },
      {
        nome: 'Próximas',
        itens: todas.filter((c) => ['aguardando', 'confirmada'].includes(c.reserva.status)),
        vazioTexto: 'Você não tem locações futuras. Que tal buscar um carro?',
        cta: true,
      },
      {
        nome: 'Histórico',
        itens: todas.filter((c) => ['concluida', 'recusada'].includes(c.reserva.status)),
        vazioTexto: 'Seu histórico de locações aparecerá aqui.',
        cta: false,
      },
    ];
  });

  abrir(veiculoId: string): void {
    this.router.navigate(['/carros', veiculoId]);
  }
}
