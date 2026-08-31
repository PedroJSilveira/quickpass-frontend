import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OwnerService } from '../../core/services/owner.service';
import { CatalogService } from '../../core/services/catalog.service';
import { PricingService } from '../../core/services/pricing.service';
import { TagComponent } from '../../shared/components/tag.component';

@Component({
  selector: 'qp-solicitacoes',
  standalone: true,
  imports: [CommonModule, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Proprietário</div>
    <h4 class="qp-screen-title">Solicitações</h4>

    @if (itens().length === 0) {
      <div class="qp-empty">Nenhuma solicitação no momento. Quando alguém pedir para alugar seu carro, ela aparece aqui.</div>
    } @else {
      <div class="qp-stack">
        @for (s of itens(); track s.id) {
          <div class="card">
            <div class="qp-row-between">
              <span class="card-title">{{ s.veiculoTitulo }}</span>
              <qp-tag [variant]="s.status === 'pendente' ? 'accent' : 'neutral'">
                {{ s.status === 'pendente' ? 'Aguardando você' : s.status === 'aceita' ? 'Aceita' : 'Recusada' }}
              </qp-tag>
            </div>
            <div class="card-meta">{{ pricing.formatarPeriodo(s.solicitacao.inicio, s.solicitacao.fim) }} · {{ s.diasFmt }}</div>

            <div class="qp-row" style="margin: var(--space-2) 0;">
              <span class="qp-avatar" style="width: 36px; height: 36px; font-size: 13px;">{{ s.iniciais }}</span>
              <div class="qp-stack" style="gap: 2px;">
                <strong>{{ s.solicitacao.locatario.nome }}</strong>
                <span class="card-meta">
                  {{ s.solicitacao.locatario.idade }} anos · CNH há {{ s.solicitacao.locatario.cnhAnos }} anos ·
                  ★ {{ s.solicitacao.locatario.nota }} · {{ s.solicitacao.locatario.locacoes }} viagens
                </span>
              </div>
            </div>

            <div class="qp-hairline-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: var(--space-2);">
              <div><strong>Identidade e CNH</strong><br />Verificadas</div>
              <div><strong>Finalidade declarada</strong><br />{{ s.solicitacao.finalidade }}</div>
              <div><strong>Reputação</strong><br />★ {{ s.solicitacao.locatario.nota }} em {{ s.solicitacao.locatario.locacoes }} locações</div>
              <div><strong>Caução pré-autorizada</strong><br />{{ pricing.money(pricing.caucao) }}</div>
            </div>

            <div class="qp-row-between">
              <span style="font-size: 20px; font-family: var(--font-heading); font-weight: 600;">
                {{ pricing.money(s.repasse) }}
              </span>
              @if (s.solicitacao.status === 'pendente') {
                <div class="qp-row">
                  <button class="btn btn-secondary" (click)="recusar(s.id)">Recusar</button>
                  <button class="btn btn-primary" (click)="aceitar(s.id)">Aceitar</button>
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class SolicitacoesComponent {
  constructor(private owner: OwnerService, private catalog: CatalogService, public pricing: PricingService) {}

  itens = computed(() =>
    this.owner.solicitacoes().map((s) => {
      const v = this.catalog.porId(s.veiculoId);
      const dias = this.pricing.dias(s.inicio, s.fim);
      const bruto = s.diaria * dias;
      const repasse = bruto - bruto * (this.pricing.taxaPct / 100);
      return {
        id: s.id,
        solicitacao: s,
        veiculoTitulo: v?.titulo ?? 'Veículo',
        status: s.status,
        diasFmt: dias + (dias > 1 ? ' diárias' : ' diária'),
        iniciais: s.locatario.nome.split(' ').map((p) => p[0]).slice(0, 2).join(''),
        repasse,
      };
    }),
  );

  aceitar(id: string): void {
    this.owner.aceitar(id);
  }

  recusar(id: string): void {
    this.owner.recusar(id);
  }
}
