import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReferralService } from '../../core/services/referral.service';
import { CanalNotificacao, ConsentService } from '../../core/services/consent.service';
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

    <div class="card" style="margin-bottom: var(--space-4);">
      <span class="card-kicker">Indique amigos</span>
      <p class="text-muted" style="font-size: 12px; margin: 4px 0 8px;">
        A indicação só é contabilizada quando o convidado conclui e paga a primeira locação. Indicar não altera sua pontuação de confiança.
      </p>
      @if (link()) {
        <code style="word-break: break-all;">{{ link() }}</code>
      } @else {
        <button class="btn btn-secondary" (click)="gerarLink()">Gerar meu link</button>
      }
    </div>

    <div class="card" style="margin-bottom: var(--space-4);">
      <span class="card-kicker">Notificações e consentimento</span>
      <p class="text-muted" style="font-size: 12px; margin: 4px 0 8px;">
        Mensagens de marketing só são enviadas se você autorizar o canal. Avisos transacionais (reserva, caução) continuam ativos.
      </p>
      @for (canal of canais; track canal) {
        <label class="qp-row" style="gap: var(--space-2);">
          <input type="checkbox" [checked]="consent.consentimentos()[canal].marketing" (change)="consent.definir(canal, 'marketing', $any($event.target).checked)" />
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
export class PerfilComponent {
  consent = inject(ConsentService);
  private referral = inject(ReferralService);
  link = signal('');

  gerarLink(): void {
    this.link.set(this.referral.gerarLink(this.auth.conta().id, { cpf: this.auth.conta().cpf || undefined }).url);
  }

  canais: CanalNotificacao[] = ['push', 'email', 'sms'];

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
    () => this.booking.reservas().filter((r) => r.locatarioId === this.auth.conta().id && ['cancelada', 'rejeitada'].includes(r.status)).length,
  );

  trocarPapel(papel: Papel): void {
    this.auth.alternarPapel(papel);
    this.router.navigate([papel === 'locatario' ? '/buscar' : '/proprietario']);
  }
}
