import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReferralService } from '../../core/services/referral.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { CanalNotificacao, Papel } from '../../core/models/domain.models';
import { mensagemErro } from '../../core/api/api.service';

interface ItemPerfil {
  titulo: string;
  meta: string;
  ir: () => void;
}

@Component({
  selector: 'qp-perfil',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-screen-kicker">Conta</div>
    <h4 class="qp-screen-title">Meu perfil</h4>

    <div class="qp-row" style="margin-bottom: var(--space-4);">
      <span class="qp-avatar" style="width: 52px; height: 52px; font-size: 16px;">{{ iniciais() }}</span>
      <div class="qp-stack" style="gap: 2px;">
        <strong>{{ auth.conta().nome }}</strong>
        <span class="card-meta">
          ★ {{ auth.conta().nota }} · {{ auth.admin() ? 'administrador · ' : '' }}membro desde {{ membroDesdeFmt() }} ·
          {{ auth.contaVerificada() ? 'Verificado' : 'Verificação pendente' }}
        </span>
      </div>
    </div>

    @if (!auth.admin()) {
      <div class="card" style="margin-bottom: var(--space-4);">
        <span class="card-kicker">Como você usa a QuickPass</span>
        <p class="text-muted" style="font-size: 12px; margin: 4px 0 8px;">Sua conta pode ser de locatário, de proprietário ou dos dois ao mesmo tempo.</p>
        <label class="qp-row" style="gap: var(--space-2);">
          <input type="checkbox" [checked]="auth.temPapel('locatario')" (change)="alternarPapelConta('locatario', $any($event.target).checked)" />
          Quero alugar carros (locatário)
        </label>
        <label class="qp-row" style="gap: var(--space-2);">
          <input type="checkbox" [checked]="auth.temPapel('proprietario')" (change)="alternarPapelConta('proprietario', $any($event.target).checked)" />
          Quero alugar meu carro (proprietário)
        </label>
        @if (ativar) {
          <p class="text-muted" style="font-size: 13px; margin: 8px 0 0;">Para acessar essa área, ative o papel de {{ ativar }} acima.</p>
        }
        @if (erro()) {
          <p style="font-size: 13px; margin: 8px 0 0; color: var(--color-danger, #b3261e);">{{ erro() }}</p>
        }
      </div>
    }

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

    <div class="card" style="margin-bottom: var(--space-4);">
      <span class="card-kicker">Indique amigos</span>
      <p class="text-muted" style="font-size: 12px; margin: 4px 0 8px;">
        A indicação só é contabilizada quando o convidado conclui e paga a primeira locação. Indicar não altera sua pontuação de confiança.
      </p>
      @if (link()) {
        <code style="word-break: break-all;">{{ link() }}</code>
      } @else {
        <button class="btn btn-secondary" (click)="gerarLink()" [disabled]="!auth.logado()">Gerar meu link</button>
      }
    </div>

    <div class="card" style="margin-bottom: var(--space-4);">
      <span class="card-kicker">Notificações e consentimento</span>
      <p class="text-muted" style="font-size: 12px; margin: 4px 0 8px;">
        Mensagens de marketing só são enviadas se você autorizar o canal. Avisos transacionais (reserva, caução) continuam ativos.
      </p>
      @for (canal of canais; track canal) {
        <label class="qp-row" style="gap: var(--space-2);">
          <input type="checkbox" [checked]="auth.conta().consentimentos[canal].marketing" (change)="definirConsentimento(canal, $any($event.target).checked)" />
          Marketing por {{ canal }}
        </label>
      }
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
export class PerfilComponent implements OnInit {
  private referral = inject(ReferralService);
  link = signal('');
  erro = signal('');
  ativar = inject(ActivatedRoute).snapshot.queryParamMap.get('ativar');

  async gerarLink(): Promise<void> {
    try {
      this.link.set((await this.referral.gerarLink()).url);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }

  canais: CanalNotificacao[] = ['push', 'email', 'sms'];

  itens: ItemPerfil[] = [
    { titulo: 'Minhas locações', meta: '', ir: () => this.router.navigate([this.auth.temPapel('locatario') ? '/locacoes' : '/proprietario/reservas']) },
    { titulo: 'Verificação', meta: '', ir: () => this.router.navigate(['/verificacao']) },
    { titulo: 'Dados bancários', meta: '', ir: () => this.router.navigate(['/verificacao']) },
  ];

  constructor(public auth: AuthService, private booking: BookingService, private router: Router) {}

  ngOnInit(): void {
    void this.booking.carregar().catch(() => undefined);
  }

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

  totalLocacoes = computed(() => this.booking.reservas().filter((r) => r.status === 'concluida').length);

  cancelamentos = computed(() => this.booking.reservas().filter((r) => ['cancelada', 'rejeitada'].includes(r.status)).length);

  /** Liga/desliga um papel da própria conta (a conta precisa manter ao menos um). */
  async alternarPapelConta(papel: Papel, ligado: boolean): Promise<void> {
    this.erro.set('');
    const atuais = this.auth.conta().papeis;
    const novos = ligado ? [...new Set([...atuais, papel])] : atuais.filter((p) => p !== papel);
    if (!novos.length) {
      this.erro.set('Mantenha ao menos um papel ativo.');
      return;
    }
    try {
      await this.auth.definirPapeis(novos);
      void this.booking.carregar().catch(() => undefined);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }

  async definirConsentimento(canal: CanalNotificacao, valor: boolean): Promise<void> {
    try {
      await this.auth.definirConsentimento(canal, 'marketing', valor);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }
}
