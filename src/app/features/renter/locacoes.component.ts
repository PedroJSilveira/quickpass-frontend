import { ChangeDetectionStrategy, Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Clock, CheckCircle2, Car, CheckCheck, XCircle, Search, AlertTriangle } from 'lucide-angular';
import { BookingService } from '../../core/services/booking.service';
import { PricingService } from '../../core/services/pricing.service';
import { urlImagem } from '../../core/api/api.config';
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
  aguardando_kyc: 'Aguardando verificação',
  solicitada: 'Aguardando proprietário',
  aprovada: 'Aprovada — falta pagar',
  confirmada: 'Confirmada',
  em_andamento: 'Em andamento',
  em_disputa: 'Em disputa',
  concluida: 'Concluída',
  rejeitada: 'Recusada',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
  falha_pagamento: 'Pagamento não concluído',
};

const DETALHES: Record<StatusReserva, string> = {
  aguardando_kyc: 'Conclua a verificação de identidade para seguir. As datas ficam reservadas por tempo limitado.',
  solicitada: 'Aguardando resposta do proprietário. Nada foi cobrado ainda.',
  aprovada: 'O proprietário aprovou. Pague a diária e a pré-autorização da caução para confirmar.',
  confirmada: 'Pagamento confirmado. Faça o check-in com fotos no momento da entrega.',
  em_andamento: 'Check-in feito. Devolva com o mesmo nível de combustível.',
  em_disputa: 'O proprietário informou uma avaria. A caução está retida até a decisão; você pode contestar.',
  concluida: 'Locação encerrada. A caução é liberada após o prazo sem ocorrências.',
  rejeitada: 'O proprietário recusou. Nada foi cobrado.',
  expirada: 'O prazo terminou e as datas foram liberadas. Nada foi cobrado.',
  cancelada: 'Reserva cancelada.',
  falha_pagamento: 'O pagamento ou a pré-autorização da caução falhou. As datas foram liberadas.',
};

const ICONES: Record<StatusReserva, typeof Clock> = {
  aguardando_kyc: Clock,
  solicitada: Clock,
  aprovada: CheckCircle2,
  confirmada: CheckCircle2,
  em_andamento: Car,
  em_disputa: AlertTriangle,
  concluida: CheckCheck,
  rejeitada: XCircle,
  expirada: XCircle,
  cancelada: XCircle,
  falha_pagamento: XCircle,
};

/** Faixa + fundo de cada card, e variante da tag — dentro da paleta de 2 tons já usada no app. */
const TOM_PENDENTE = { variant: 'accent-2' as TagVariant, cor: 'var(--color-accent-2)', fundo: 'var(--color-accent-2-100)' };
const TOM_ENCERRADA = { variant: 'outline' as TagVariant, cor: 'var(--color-neutral-300)', fundo: 'var(--color-surface)' };
const STATUS_TOM: Record<StatusReserva, { variant: TagVariant; cor: string; fundo: string }> = {
  aguardando_kyc: TOM_PENDENTE,
  solicitada: TOM_PENDENTE,
  aprovada: { variant: 'accent', cor: 'var(--color-accent)', fundo: 'var(--color-accent-100)' },
  confirmada: { variant: 'accent', cor: 'var(--color-accent)', fundo: 'var(--color-accent-100)' },
  em_andamento: { variant: 'accent', cor: 'var(--color-accent-600)', fundo: 'var(--color-accent-200)' },
  em_disputa: TOM_PENDENTE,
  concluida: { variant: 'neutral', cor: 'var(--color-neutral-400)', fundo: 'var(--color-neutral-100)' },
  rejeitada: TOM_ENCERRADA,
  expirada: TOM_ENCERRADA,
  cancelada: TOM_ENCERRADA,
  falha_pagamento: TOM_ENCERRADA,
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
export class LocacoesComponent implements OnInit {
  readonly SearchIcon = Search;

  constructor(
    private booking: BookingService,
    public pricing: PricingService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    void this.booking.carregar();
  }

  /** Só as reservas em que sou o locatário (a lista do servidor já vem filtrada). */
  private minhas = computed(() => this.booking.reservas());

  private toCard = (r: Reserva): CardReserva => {
    let acaoNome: string | null = null;
    let irParaAcao = () => {};

    if (r.status === 'aguardando_kyc') {
      acaoNome = 'Concluir verificação';
      irParaAcao = () => this.router.navigate(['/verificacao'], { queryParams: { reserva: r.id } });
    } else if (r.status === 'aprovada') {
      acaoNome = 'Pagar e confirmar';
      irParaAcao = () => this.router.navigate(['/locacoes', r.id, 'pagamento']);
    } else if (r.status === 'em_disputa' && r.disputaStatus === 'AGUARDANDO_CONTESTACAO') {
      acaoNome = 'Ver ocorrência e contestar';
      irParaAcao = () => this.router.navigate(['/locacoes', r.id, 'contestar']);
    } else if (r.status === 'confirmada') {
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
      titulo: r.veiculoTitulo,
      foto: urlImagem(r.veiculoFoto),
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
        itens: todas.filter((c) => ['em_andamento', 'em_disputa'].includes(c.reserva.status)),
        vazioTexto: 'Nenhuma locação em andamento no momento.',
        cta: false,
      },
      {
        nome: 'Próximas',
        itens: todas.filter((c) => ['aguardando_kyc', 'solicitada', 'aprovada', 'confirmada'].includes(c.reserva.status)),
        vazioTexto: 'Você não tem locações futuras. Que tal buscar um carro?',
        cta: true,
      },
      {
        nome: 'Histórico',
        itens: todas.filter((c) => ['concluida', 'rejeitada', 'expirada', 'cancelada', 'falha_pagamento'].includes(c.reserva.status)),
        vazioTexto: 'Seu histórico de locações aparecerá aqui.',
        cta: false,
      },
    ];
  });

  abrir(veiculoId: string): void {
    this.router.navigate(['/carros', veiculoId]);
  }
}
