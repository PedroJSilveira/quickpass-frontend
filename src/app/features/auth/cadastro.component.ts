import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Papel } from '../../core/models/domain.models';

@Component({
  selector: 'qp-cadastro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-auth-page">
      <div class="qp-auth-card qp-stack">
        <div class="nav-brand">QuickPass</div>
        <h4>Criar conta</h4>

        <form class="qp-stack" (ngSubmit)="continuar()" #f="ngForm">
          <div class="field">
            <label for="nome">Nome completo</label>
            <input id="nome" class="input" [(ngModel)]="nome" name="nome" required />
          </div>
          <div class="field">
            <label for="email">E-mail</label>
            <input id="email" class="input" type="email" [(ngModel)]="email" name="email" required />
          </div>
          <div class="field">
            <label for="cpf">CPF</label>
            <input id="cpf" class="input" [(ngModel)]="cpf" name="cpf" required placeholder="000.000.000-00" />
          </div>
          <div class="field">
            <label for="senha">Senha</label>
            <input id="senha" class="input" type="password" [(ngModel)]="senha" name="senha" required minlength="8" />
          </div>

          <div class="qp-stack" style="gap: var(--space-2);">
            <label
              class="qp-perfil-opt"
              [class.qp-perfil-sel]="perfil === 'locatario'"
            >
              <input type="radio" name="perfil" value="locatario" [(ngModel)]="perfil" style="display:none" />
              <strong>Quero alugar um carro</strong>
              <span class="text-muted" style="font-size: 13px;">Buscar veículos disponíveis perto de mim.</span>
            </label>
            <label
              class="qp-perfil-opt"
              [class.qp-perfil-sel]="perfil === 'proprietario'"
            >
              <input type="radio" name="perfil" value="proprietario" [(ngModel)]="perfil" style="display:none" />
              <strong>Quero alugar meu carro</strong>
              <span class="text-muted" style="font-size: 13px;">Anunciar um veículo ocioso e ganhar dinheiro com ele.</span>
            </label>
          </div>

          <button class="btn btn-primary btn-block" type="submit" [disabled]="f.invalid">
            Continuar para verificação
          </button>
        </form>

        <p class="text-muted" style="font-size: 11px;">
          Ao continuar você concorda com os Termos de Uso e a Política de Privacidade da QuickPass.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .qp-auth-page { min-height: 100vh; display: grid; place-items: center; padding: var(--space-6); }
      .qp-auth-card { width: min(420px, 100%); }
      .qp-perfil-opt {
        display: flex; flex-direction: column; gap: 2px; padding: var(--space-3);
        border: 1px solid var(--color-divider); cursor: pointer;
      }
      .qp-perfil-sel { background: var(--color-accent-100); border-color: var(--color-accent); }
    `,
  ],
})
export class CadastroComponent {
  nome = '';
  email = '';
  cpf = '';
  senha = '';
  perfil: Papel = 'locatario';

  constructor(private auth: AuthService, private router: Router) {}

  continuar(): void {
    this.auth.cadastrar({ nome: this.nome, email: this.email, cpf: this.cpf, papel: this.perfil });
    this.router.navigate(['/verificacao']);
  }
}
