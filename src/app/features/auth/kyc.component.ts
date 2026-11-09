import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { mensagemErro } from '../../core/api/api.service';
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
              <label class="btn btn-secondary" style="align-self: flex-start; cursor: pointer;" [class.disabled]="enviando() === item.chave">
                <input type="file" hidden [accept]="item.chave === 'selfie' ? 'image/*' : 'image/*,application/pdf'" [attr.capture]="item.chave === 'selfie' ? 'user' : null" (change)="escolher(item.chave, $event)" />
                {{ enviando() === item.chave ? 'Enviando…' : auth.conta().kyc[item.chave] ? 'Reenviar arquivo' : 'Enviar arquivo' }}
              </label>
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
              {{ reservaId ? 'Continuar minha reserva' : 'Continuar' }}
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
  enviando = signal<keyof Kyc | null>(null);

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

  /** Envia o arquivo escolhido (multipart); com os 4 itens o servidor conclui a análise. */
  async escolher(item: keyof Kyc, ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo || item === 'aprovado') return;
    this.erro.set('');
    this.enviando.set(item);
    try {
      await this.auth.enviarItemKyc(item, arquivo);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.enviando.set(null);
    }
  }

  async continuar(): Promise<void> {
    if (this.reservaId) {
      try {
        await this.booking.continuarAposKyc(this.reservaId);
        this.router.navigate(['/reserva', this.reservaId, 'confirmado']);
      } catch (e) {
        this.erro.set(mensagemErro(e));
      }
      return;
    }
    this.router.navigate([this.auth.rotaInicial()]);
  }
}
