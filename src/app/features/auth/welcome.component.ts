import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

/**
 * Tela de entrada (`/entrar`). Autenticação real (senha, sessão, JWT) está
 * fora do escopo do protótipo de design — aqui simulamos o fluxo apenas
 * navegando para a busca, já que o AuthService mantém uma conta única em
 * memória.
 */
@Component({
  selector: 'qp-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-auth-page">
      <div class="qp-auth-card">
        <div class="nav-brand" style="margin-bottom: var(--space-4);">QuickPass</div>
        <h4>Entrar na sua conta</h4>

        <form class="qp-stack" (ngSubmit)="entrar()">
          <div class="field">
            <label for="email">E-mail</label>
            <input id="email" class="input" type="email" [(ngModel)]="email" name="email" required />
          </div>
          <div class="field">
            <label for="senha">Senha</label>
            <input id="senha" class="input" type="password" [(ngModel)]="senha" name="senha" required />
          </div>
          <button class="btn btn-primary btn-block" type="submit">Entrar</button>
        </form>

        <p class="text-muted" style="font-size: 13px; margin-top: var(--space-4);">
          Ainda não tem conta? <a routerLink="/cadastro">Criar conta</a>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .qp-auth-page { min-height: 100vh; display: grid; place-items: center; padding: var(--space-6); }
      .qp-auth-card { width: min(380px, 100%); }
    `,
  ],
})
export class WelcomeComponent {
  email = '';
  senha = '';

  constructor(private router: Router) {}

  entrar(): void {
    this.router.navigate(['/buscar']);
  }
}
