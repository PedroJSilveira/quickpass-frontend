import { ChangeDetectionStrategy, Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { OwnerService } from '../../core/services/owner.service';
import { urlImagem } from '../../core/api/api.config';
import { PayoutService } from '../../core/services/payout.service';
import { PricingService } from '../../core/services/pricing.service';
import { TagComponent } from '../../shared/components/tag.component';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';

@Component({
  selector: 'qp-painel',
  standalone: true,
  imports: [CommonModule, RouterLink, TagComponent, BlueprintFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Proprietário</div>
    <h4 class="qp-screen-title">Painel</h4>

    <qp-blueprint>
      <div class="qp-stack" style="padding: var(--space-3);">
        <span class="card-kicker">Repasses do mês</span>
        <span style="font-size: 36px; font-family: var(--font-heading); font-weight: 600;">
          {{ pricing.moneyRounded(payout.liquidoMesAtual()) }}
        </span>
        <span class="text-muted" style="font-size: 13px;">
          {{ pagos().length }} locações pagas nos últimos 30 dias
        </span>
      </div>
    </qp-blueprint>

    @if (pendentes().length > 0) {
      <div class="card" style="margin: var(--space-4) 0; border-color: var(--color-accent);">
        <div class="card-title">Ação necessária</div>
        <p class="card-body">
          Você tem {{ pendentes().length }} solicitação(ões) aguardando resposta.
        </p>
        <a class="btn btn-primary" style="align-self: flex-start;" routerLink="/proprietario/solicitacoes">Ver solicitações</a>
      </div>
    }

    <div class="qp-grid-2x2" style="margin: var(--space-4) 0;">
      <div class="card">
        <span class="card-kicker">Veículos ativos</span>
        <span class="card-title">{{ veiculosAtivos().length }}</span>
      </div>
      <div class="card">
        <span class="card-kicker">Taxa de aceite</span>
        <span class="card-title">{{ taxaAceite() }}%</span>
      </div>
      <div class="card">
        <span class="card-kicker">Avaliação</span>
        <span class="card-title">★ {{ owner.painel()?.reputacao?.media ?? auth.conta().nota }}</span>
      </div>
      <div class="card">
        <span class="card-kicker">Diárias no mês</span>
        <span class="card-title">{{ diariasNoMes() }}</span>
      </div>
    </div>

    <h5>Meus veículos</h5>
    <div class="qp-stack">
      @for (v of meusVeiculos(); track v.id) {
        <div class="qp-row-between card">
          <div class="qp-stack" style="gap: 2px;">
            <span class="card-title">{{ v.titulo }}</span>
            <qp-tag [variant]="v.status === 'Aprovado' ? 'accent' : 'neutral'">{{ v.status }}</qp-tag>
            <span class="card-meta">{{ pricing.moneyRounded(v.diaria) }}/dia · {{ v.placa }} · {{ v.locacoes }} locações</span>
          </div>
          <a class="btn btn-secondary" [routerLink]="['/proprietario/veiculos', v.id, 'disponibilidade']">Disponibilidade</a>
        </div>
      }
    </div>
  `,
})
export class PainelComponent implements OnInit {
  img = urlImagem;

  constructor(
    public auth: AuthService,
    private catalog: CatalogService,
    public owner: OwnerService,
    public payout: PayoutService,
    public pricing: PricingService,
  ) {}

  ngOnInit(): void {
    void Promise.all([this.catalog.carregarMeus(), this.owner.carregarSolicitacoes(), this.payout.carregar(), this.owner.carregarPainel()]).catch(() => undefined);
  }

  meusVeiculos = computed(() => this.catalog.meusVeiculos());
  veiculosAtivos = computed(() => this.meusVeiculos().filter((v) => v.status === 'Aprovado'));
  pendentes = computed(() => this.owner.solicitacoesPendentes());
  pagos = computed(() => this.payout.pagos());

  taxaAceite = computed(() => {
    const respondidas = this.owner.solicitacoes().filter((s) => s.status !== 'pendente');
    if (respondidas.length === 0) return 100;
    return Math.round((respondidas.filter((s) => s.status === 'aceita').length / respondidas.length) * 100);
  });

  diariasNoMes = computed(() => this.meusVeiculos().reduce((total, v) => total + v.locacoes, 0));
}
