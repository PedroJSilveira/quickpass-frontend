import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { TagComponent } from '../../shared/components/tag.component';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { BackButtonComponent } from '../../shared/components/back-button.component';
import { Kyc } from '../../core/models/domain.models';

interface ItemKyc {
  chave: keyof Kyc;
  titulo: string;
  descricao: string;
}

@Component({
  selector: 'qp-kyc',
  standalone: true,
  imports: [CommonModule, TagComponent, BlueprintFrameComponent, BackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-page">
      <div class="qp-page-inner qp-stack">
        <div>
          <qp-back-button />
          <div class="qp-screen-kicker">Segurança</div>
          <h4 class="qp-screen-title" style="margin-bottom: 0;">Verificação de identidade</h4>
        </div>

        @for (item of itens; track item.chave) {
          <qp-blueprint>
            <div class="qp-stack" style="padding: var(--space-3);">
              <div class="qp-row-between">
                <div class="card-title">{{ item.titulo }}</div>
                @if (auth.conta().kyc[item.chave]) {
                  <qp-tag variant="accent">verificado</qp-tag>
                } @else {
                  <qp-tag variant="neutral">pendente</qp-tag>
                }
              </div>
              <p class="card-body">{{ item.descricao }}</p>
              <button class="btn btn-secondary" style="align-self: flex-start;" (click)="enviar(item.chave)">
                {{ auth.conta().kyc[item.chave] ? 'Reenviar' : 'Enviar agora' }}
              </button>
            </div>
          </qp-blueprint>
        }

        <div class="qp-stack" style="margin-top: var(--space-2);">
          <div class="qp-row-between" style="font-size: 13px;">
            <span>Status da conta</span>
            <span class="text-muted">{{ rotuloStatus() }} · {{ auth.itensKycConcluidos() }} de 4 itens enviados</span>
          </div>
          <div style="height: 4px; background: var(--color-divider);">
            <div
              style="height: 100%; background: var(--color-accent); transition: width .2s ease-out;"
              [style.width.%]="progresso()"
            ></div>
          </div>
          @if (erro()) {
            <p class="text-muted" style="font-size: 13px; margin: 0;">{{ erro() }}</p>
          }
          @if (auth.contaVerificada()) {
            <button class="btn btn-primary btn-block" (click)="continuar()">
              {{ reservaId ? 'Continuar minha reserva' : 'Ir para a busca' }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .qp-page { padding: var(--space-6); }
      .qp-page-inner { max-width: 480px; margin: 0 auto; }
    `,
  ],
})
export class KycComponent {
  itens: ItemKyc[] = [
    { chave: 'doc', titulo: 'Documento de identidade', descricao: 'RG ou CNH digitalizada, frente e verso.' },
    { chave: 'cnh', titulo: 'Habilitação e histórico', descricao: 'Validade da CNH, tempo de habilitação e pontuação.' },
    { chave: 'selfie', titulo: 'Selfie com prova de vida', descricao: 'Comparação biométrica com o documento enviado.' },
    { chave: 'banco', titulo: 'Dados de cobrança', descricao: 'Conta bancária para pagamentos e repasses.' },
  ];

  progresso = computed(() => (this.auth.itensKycConcluidos() / 4) * 100);

  /** Reserva retida aguardando o KYC (hold de agenda), quando veio do checkout. */
  reservaId = inject(ActivatedRoute).snapshot.queryParamMap.get('reserva');
  erro = signal('');

  rotuloStatus = computed(
    () =>
      ({
        PENDENTE: 'Pendente',
        EM_ANALISE: 'Em análise',
        APROVADO: 'Aprovado',
        REPROVADO: 'Reprovado',
        EXPIRADO: 'Expirado (renove a CNH)',
      })[this.auth.statusKyc()],
  );

  constructor(public auth: AuthService, private router: Router, private booking: BookingService) {}

  enviar(item: keyof Kyc): void {
    this.auth.enviarItemKyc(item);
  }

  continuar(): void {
    if (this.reservaId) {
      try {
        this.booking.continuarAposKyc(this.reservaId);
        this.router.navigate(['/reserva', this.reservaId, 'confirmado']);
      } catch (e) {
        this.erro.set((e as Error).message);
      }
      return;
    }
    this.router.navigate(['/buscar']);
  }
}
