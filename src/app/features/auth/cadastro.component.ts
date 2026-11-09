import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { LucideAngularModule, User, Mail, IdCard, Lock, Search, CarFront } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { Papel } from '../../core/models/domain.models';
import { mensagemErro } from '../../core/api/api.service';
import { BackButtonComponent } from '../../shared/components/back-button.component';

interface CopyPerfil {
  foto: string;
  titulo: string;
  texto: string;
  beneficios: string[];
}

const COPY: Record<Papel, CopyPerfil> = {
  locatario: {
    foto: 'assets/civic.jpg',
    titulo: 'Encontre o carro certo, perto de você',
    texto: 'Milhares de veículos verificados, prontos pra retirar no seu bairro.',
    beneficios: [
      'Proteção contra danos em cada locação',
      'Proprietários com identidade verificada',
      'Caução pré-autorizada, sem burocracia',
    ],
  },
  proprietario: {
    foto: 'assets/foto-a.jpeg',
    titulo: 'Transforme seu carro parado em renda extra',
    texto: 'Anuncie em minutos e receba solicitações de locatários verificados.',
    beneficios: [
      'Locatários com identidade e CNH verificadas',
      'Repasse automático em D+2',
      'Você decide os dias disponíveis',
    ],
  },
};

@Component({
  selector: 'qp-cadastro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BackButtonComponent, InputTextModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-auth-page">
      <div class="qp-auth-shell">
        <aside class="qp-auth-visual" [style.background-image]="'url(' + copy().foto + ')'">
          <div class="nav-brand" style="color: var(--color-bg);">QuickPass</div>
          <div class="qp-auth-visual-copy">
            <h3>{{ copy().titulo }}</h3>
            <p>{{ copy().texto }}</p>
            <ul class="qp-check-list">
              @for (b of copy().beneficios; track b) {
                <li>{{ b }}</li>
              }
            </ul>
          </div>
        </aside>

        <div class="qp-auth-form-side">
        <div class="qp-auth-form-inner qp-stack">
          <qp-back-button />
          <div class="qp-screen-kicker">Passo 1 de 2</div>
          <h4 class="qp-screen-title" style="margin-bottom: 2px;">Criar conta</h4>
          <p class="text-muted" style="font-size: 13px; margin-bottom: var(--space-4);">Leva menos de 2 minutos.</p>

          <form class="qp-stack" (ngSubmit)="continuar()" #f="ngForm">
            <div class="field">
              <label for="nome">Nome completo</label>
              <div class="qp-input-icon">
                <lucide-icon [img]="UserIcon" [size]="16" />
                <input id="nome" pInputText [(ngModel)]="nome" name="nome" required />
              </div>
            </div>
            <div class="field">
              <label for="email">E-mail</label>
              <div class="qp-input-icon">
                <lucide-icon [img]="MailIcon" [size]="16" />
                <input id="email" pInputText type="email" [(ngModel)]="email" name="email" required />
              </div>
            </div>
            <div class="field">
              <label for="cpf">CPF</label>
              <div class="qp-input-icon">
                <lucide-icon [img]="IdCardIcon" [size]="16" />
                <input id="cpf" pInputText [(ngModel)]="cpf" name="cpf" required placeholder="000.000.000-00" />
              </div>
            </div>
            <div class="field">
              <label for="senha">Senha</label>
              <div class="qp-input-icon">
                <lucide-icon [img]="LockIcon" [size]="16" />
                <input id="senha" pInputText type="password" [(ngModel)]="senha" name="senha" required minlength="8" autocomplete="new-password" />
              </div>
              <span class="qp-hint" [class.qp-hint-ok]="senha.length >= 8">
                {{ senha.length >= 8 ? '✓' : '•' }} mínimo de 8 caracteres
              </span>
            </div>

            <div class="field">
              <label for="cnh">Há quantos anos você tem CNH?</label>
              <input id="cnh" pInputText type="number" min="0" max="80" [(ngModel)]="cnhAnos" name="cnhAnos" />
            </div>

            <div class="qp-stack" style="gap: var(--space-2);">
              <span class="text-muted" style="font-size: 12px;">Como você vai usar a QuickPass? (marque um ou os dois)</span>
              <label class="qp-perfil-opt" [class.qp-perfil-sel]="locatario()">
                <input type="checkbox" name="locatario" [checked]="locatario()" (change)="locatario.set($any($event.target).checked)" style="display:none" />
                <span class="qp-perfil-icon"><lucide-icon [img]="SearchIcon" [size]="18" /></span>
                <span class="qp-stack" style="gap: 2px;">
                  <strong>Quero alugar um carro</strong>
                  <span class="text-muted" style="font-size: 13px;">Buscar veículos disponíveis perto de mim.</span>
                </span>
              </label>
              <label class="qp-perfil-opt" [class.qp-perfil-sel]="proprietario()">
                <input type="checkbox" name="proprietario" [checked]="proprietario()" (change)="proprietario.set($any($event.target).checked)" style="display:none" />
                <span class="qp-perfil-icon"><lucide-icon [img]="CarFrontIcon" [size]="18" /></span>
                <span class="qp-stack" style="gap: 2px;">
                  <strong>Quero alugar meu carro</strong>
                  <span class="text-muted" style="font-size: 13px;">Anunciar um veículo ocioso e ganhar dinheiro com ele.</span>
                </span>
              </label>
              @if (!locatario() && !proprietario()) {
                <span class="text-muted" style="font-size: 12px;">Escolha ao menos uma opção.</span>
              }
            </div>

            @if (erro()) {
              <p role="alert" style="font-size: 13px; margin: 0; color: var(--color-danger, #b3261e);">{{ erro() }}</p>
            }
            <button class="btn btn-primary btn-block" type="submit" [disabled]="f.invalid || (!locatario() && !proprietario()) || enviando()">
              {{ enviando() ? 'Criando conta…' : 'Continuar para verificação' }}
            </button>
          </form>

          <p class="text-muted" style="font-size: 11px;">
            Ao continuar você concorda com os Termos de Uso e a Política de Privacidade da QuickPass.
          </p>
          <p class="text-muted" style="font-size: 13px; text-align: center;">
            Já tem conta? <a routerLink="/entrar">Entrar</a>
          </p>
        </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .qp-auth-page { min-height: 100vh; display: grid; place-items: center; padding: var(--space-6); }
      .qp-auth-shell {
        width: min(1240px, 94vw);
        display: grid; grid-template-columns: 1.2fr 1fr;
        background: var(--color-surface); border: 1px solid var(--color-divider); border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg); overflow: hidden;
      }

      .qp-auth-visual {
        position: relative; background-size: cover; background-position: center;
        padding: var(--space-6); display: flex; flex-direction: column; justify-content: space-between;
        min-height: 620px;
      }
      .qp-auth-visual::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(
          195deg,
          color-mix(in srgb, var(--color-accent-900) 45%, transparent) 0%,
          color-mix(in srgb, var(--color-accent-900) 92%, transparent) 100%
        );
      }
      .qp-auth-visual > * { position: relative; z-index: 1; }
      .qp-auth-visual-copy { color: var(--color-bg); display: flex; flex-direction: column; gap: var(--space-3); }
      .qp-auth-visual-copy h3 { font-size: 26px; line-height: 1.2; margin: 0; }
      .qp-auth-visual-copy p { margin: 0; color: color-mix(in srgb, var(--color-bg) 85%, transparent); font-size: 14px; }
      .qp-check-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); font-size: 13px; }
      .qp-check-list li {
        padding-left: var(--space-4); position: relative;
        color: color-mix(in srgb, var(--color-bg) 90%, transparent);
      }
      .qp-check-list li::before {
        content: ''; position: absolute; left: 0; top: 6px; width: 6px; height: 6px;
        border-radius: 50%; background: var(--color-accent-300);
      }

      .qp-auth-form-side { padding: var(--space-8); display: flex; align-items: center; justify-content: center; }
      .qp-auth-form-inner { width: 100%; max-width: 380px; }

      .qp-input-icon { position: relative; display: flex; align-items: center; }
      .qp-input-icon lucide-icon { position: absolute; left: 10px; color: var(--color-neutral-600); pointer-events: none; }
      .qp-input-icon input { padding-left: 34px; }

      .qp-hint {
        display: block; margin-top: 4px; font-size: 11px; color: var(--color-neutral-600);
        transition: color .15s ease;
      }
      .qp-hint-ok { color: var(--color-accent-700); font-weight: 500; }

      .qp-perfil-opt {
        display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3);
        border: 1px solid var(--color-divider); cursor: pointer; transition: border-color .15s ease, background-color .15s ease;
      }
      .qp-perfil-opt:hover { border-color: color-mix(in srgb, var(--color-text) 45%, transparent); }
      .qp-perfil-sel { background: var(--color-accent-100); border-color: var(--color-accent); }
      .qp-perfil-icon {
        flex: none; width: 32px; height: 32px; display: grid; place-items: center;
        background: var(--color-surface-light); color: var(--color-accent-700); border: 1px solid var(--color-divider);
      }
      .qp-perfil-sel .qp-perfil-icon { background: var(--color-accent); color: var(--color-bg); border-color: var(--color-accent); }

      @media (max-width: 820px) {
        .qp-auth-shell { grid-template-columns: 1fr; }
        .qp-auth-visual { display: none; }
      }
    `,
  ],
})
export class CadastroComponent {
  readonly UserIcon = User;
  readonly MailIcon = Mail;
  readonly IdCardIcon = IdCard;
  readonly LockIcon = Lock;
  readonly SearchIcon = Search;
  readonly CarFrontIcon = CarFront;

  nome = '';
  email = '';
  cpf = '';
  senha = '';
  cnhAnos: number | null = 0;
  locatario = signal(true);
  proprietario = signal(false);
  erro = signal('');
  enviando = signal(false);

  /** A cópia lateral acompanha o papel escolhido (proprietário se for só ele). */
  private perfilVisual = computed<Papel>(() => (this.proprietario() && !this.locatario() ? 'proprietario' : 'locatario'));

  constructor(private auth: AuthService, private router: Router) {}

  copy(): CopyPerfil {
    return COPY[this.perfilVisual()];
  }

  async continuar(): Promise<void> {
    this.erro.set('');
    const papeis: Papel[] = [...(this.locatario() ? (['locatario'] as Papel[]) : []), ...(this.proprietario() ? (['proprietario'] as Papel[]) : [])];
    if (!papeis.length) return;
    this.enviando.set(true);
    try {
      await this.auth.cadastrar({ nome: this.nome, email: this.email, cpf: this.cpf, senha: this.senha, papeis, cnhAnos: Math.max(0, Number(this.cnhAnos) || 0) });
      this.router.navigate(['/verificacao']);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
