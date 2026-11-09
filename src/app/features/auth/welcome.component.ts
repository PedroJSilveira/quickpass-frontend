import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { LucideAngularModule, Mail, Lock } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { mensagemErro } from '../../core/api/api.service';

/** Tela de entrada (`/entrar`): login real na API (e-mail + senha → token de sessão). */
@Component({
  selector: 'qp-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-auth-page">
      <div class="qp-auth-shell">
        <aside class="qp-auth-visual" style="background-image: url('assets/corolla-cross.jpg');">
          <div class="nav-brand" style="color: var(--color-bg);">QuickPass</div>
          <div class="qp-auth-visual-copy">
            <h3>Seu próximo carro está a alguns cliques</h3>
            <p>Entre pra continuar buscando, reservando ou anunciando na QuickPass.</p>
            <ul class="qp-check-list">
              <li>Milhares de veículos verificados</li>
              <li>Proteção contra danos em cada locação</li>
              <li>Repasse automático pra quem anuncia</li>
            </ul>
          </div>
        </aside>

        <div class="qp-auth-form-side">
        <div class="qp-auth-form-inner qp-stack">
          <div class="nav-brand" style="margin-bottom: var(--space-4);">QuickPass</div>
          <h4 class="qp-screen-title" style="margin-bottom: 2px;">Entrar na sua conta</h4>
          <p class="text-muted" style="font-size: 13px; margin-bottom: var(--space-4);">Bem-vindo de volta.</p>

          <form class="qp-stack" (ngSubmit)="entrar()">
            <div class="field">
              <label for="email">E-mail</label>
              <div class="qp-input-icon">
                <lucide-icon [img]="MailIcon" [size]="16" />
                <input id="email" pInputText type="email" [(ngModel)]="email" name="email" required />
              </div>
            </div>
            <div class="field">
              <label for="senha">Senha</label>
              <div class="qp-input-icon">
                <lucide-icon [img]="LockIcon" [size]="16" />
                <input id="senha" pInputText type="password" [(ngModel)]="senha" name="senha" required />
              </div>
            </div>
            @if (expirou) {
              <p class="text-muted" style="font-size: 13px; margin: 0;">Sua sessão expirou. Entre novamente.</p>
            }
            @if (erro()) {
              <p role="alert" style="font-size: 13px; margin: 0; color: var(--color-danger, #b3261e);">{{ erro() }}</p>
            }
            <button class="btn btn-primary btn-block" type="submit" [disabled]="enviando()">{{ enviando() ? 'Entrando…' : 'Entrar' }}</button>
          </form>

          <p class="text-muted" style="font-size: 13px; text-align: center;">
            Ainda não tem conta? <a routerLink="/cadastro">Criar conta</a>
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

      @media (max-width: 820px) {
        .qp-auth-shell { grid-template-columns: 1fr; }
        .qp-auth-visual { display: none; }
      }
    `,
  ],
})
export class WelcomeComponent {
  readonly MailIcon = Mail;
  readonly LockIcon = Lock;

  email = '';
  senha = '';
  erro = signal('');
  enviando = signal(false);
  expirou = !!inject(ActivatedRoute).snapshot.queryParamMap.get('expirou');
  private next = inject(ActivatedRoute).snapshot.queryParamMap.get('next');

  constructor(private auth: AuthService, private router: Router) {}

  async entrar(): Promise<void> {
    this.erro.set('');
    this.enviando.set(true);
    try {
      await this.auth.entrar(this.email, this.senha);
      void this.auth.iniciarSessao();
      // Só segue para `next` se for rota interna (evita redirecionamento aberto).
      await this.router.navigateByUrl(this.next && this.next.startsWith('/') && !this.next.startsWith('//') ? this.next : this.auth.rotaInicial());
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
