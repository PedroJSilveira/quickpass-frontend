import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, MapPin } from 'lucide-angular';
import { PricingService } from '../../core/services/pricing.service';
@Component({
  selector: 'qp-site',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <nav class="nav qp-landing-nav">
        <span class="nav-brand qp-brand-host">
          <svg class="qp-brand-road" viewBox="0 0 200 50" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,38 C40,6 70,6 100,24 C130,42 160,42 200,14" />
          </svg>
          QuickPass
        </span>
        <a routerLink="/buscar">Buscar carros</a>
        <a routerLink="/proprietario">Anunciar meu carro</a>
        <a routerLink="/entrar">Entrar</a>
        <a class="btn btn-primary" routerLink="/cadastro">Criar conta</a>
      </nav>

      <!-- Hero -->
      <section class="qp-hero">
        <div class="qp-hero-left">
          <div class="qp-screen-kicker">Aluguel de carros entre pessoas</div>
          <h1>Alugue o carro <span class="qp-hero-highlight">certo</span>, do jeito mais simples.</h1>
          <p style="font-size: 16px; max-width: 460px;">
            Proprietários anunciam veículos ociosos, locatários reservam por período — com
            proteção, caução e avaliação em cada locação.
          </p>
        </div>
        <div class="qp-hero-divider" aria-hidden="true">
          <span class="qp-hero-divider-line"></span>
          <span class="qp-hero-divider-dot"></span>
          <span class="qp-hero-divider-line"></span>
        </div>
        <div class="qp-hero-right">
          <div class="qp-hero-search-card">
            <form class="qp-hero-form" (ngSubmit)="buscar()">
              <div class="field qp-hero-field-local">
                <label>Local</label>
                <div class="qp-input-icon">
                  <lucide-icon [img]="MapPinIcon" [size]="16" />
                  <input class="input" [(ngModel)]="local" name="local" placeholder="Cidade ou endereço" />
                </div>
              </div>
              <div class="field">
                <label>Retirada</label>
                <input class="input" type="date" [(ngModel)]="inicio" name="inicio" />
              </div>
              <div class="field">
                <label>Devolução</label>
                <input class="input" type="date" [(ngModel)]="fim" name="fim" />
              </div>
              <button class="btn btn-primary btn-block" type="submit">Buscar carros</button>
            </form>
          </div>
        </div>
      </section>

      <div class="qp-container qp-landing-stack">
        <!-- Como funciona -->
        <section>
          <h6 class="qp-eyebrow">Como funciona</h6>
          <div class="qp-steps">
            @for (passo of comoFunciona; track passo.numero) {
              <div class="qp-step">
                <span class="qp-step-num">{{ passo.numero }}</span>
                <div class="card-title">{{ passo.titulo }}</div>
                <p class="text-muted" style="font-size: 13px; margin: 0;">{{ passo.texto }}</p>
              </div>
            }
          </div>
        </section>

        <!-- Ganhar com meu carro -->
        <section class="qp-two-col">
          <div class="qp-stack">
            <h6 class="qp-eyebrow">Ganhar com meu carro</h6>
            <ul class="qp-check-list">
              @for (b of beneficios; track b) {
                <li>{{ b }}</li>
              }
            </ul>
          </div>
          <div class="qp-stack qp-sim-panel">
            <div class="card-title">Simule sua renda</div>
            <label class="text-muted" style="font-size: 12px;">
              Diária: <span class="text-accent">{{ pricing.money(diariaSimuladaValor) }}</span>
            </label>
            <input
              type="range"
              min="60"
              max="320"
              step="5"
              [(ngModel)]="diariaSimuladaValor"
              (ngModelChange)="atualizarSimulacao()"
              name="diariaSim"
            />
            <div class="qp-row-between" style="font-size: 13px;">
              <span>8 diárias/mês</span>
              <span class="text-muted">taxa de {{ pricing.taxaPct }}% já descontada</span>
            </div>
            <div class="qp-screen-title" style="margin: 0;">
              Você recebe <span class="text-accent">{{ pricing.moneyRounded(receitaEstimada()) }}</span>/mês
            </div>
          </div>
        </section>

        <!-- Segurança -->
        <section>
          <span class="qp-security-divider" aria-hidden="true"></span>
          <h6 class="qp-eyebrow">Segurança em cada etapa</h6>
          <div class="qp-security-grid">
            @for (camada of seguranca; track camada) {
              <div class="qp-security-item">{{ camada }}</div>
            }
          </div>
        </section>

        <!-- Taxas -->
        <section class="qp-two-col">
          <div class="qp-stack">
            <h6 class="qp-eyebrow">Taxas transparentes</h6>
            <p>
              A QuickPass retém {{ pricing.taxaPct }}% do valor da locação — não incide sobre a
              proteção nem sobre a caução, que é apenas pré-autorizada e devolvida no check-out.
            </p>
          </div>
          <div class="qp-panel qp-stack">
            <div class="card-title">Exemplo com uma diária de R$ 100</div>
            <div class="qp-row-between"><span>Subtotal</span><span>{{ pricing.money(100) }}</span></div>
            <div class="qp-row-between">
              <span>Taxa da plataforma ({{ pricing.taxaPct }}%)</span>
              <span>{{ pricing.money(100 * pricing.taxaPct / 100) }}</span>
            </div>
            <div class="qp-row-between" style="font-weight: 600;">
              <span>Proprietário recebe</span>
              <span>{{ pricing.money(100 - 100 * pricing.taxaPct / 100) }}</span>
            </div>
          </div>
        </section>

        <!-- CTA final -->
        <section class="qp-cta-final">
          <h3 style="margin-bottom: var(--space-2);">Pronto para começar?</h3>
          <p class="text-muted">Crie sua conta gratuitamente e escolha se quer alugar ou anunciar um carro.</p>
          <a class="btn btn-primary" routerLink="/cadastro">Criar conta</a>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .qp-landing-nav { max-width: 1100px; margin: 0 auto; padding-top: var(--space-6); padding-bottom: var(--space-6); }

      .qp-brand-host { position: relative; z-index: 0; display: inline-block; }
      .qp-brand-road {
        position: absolute; z-index: -1; overflow: visible; pointer-events: none;
        top: -10px; left: -14px; width: calc(100% + 28px); height: calc(100% + 20px);
      }
      .qp-brand-road path {
        fill: none; stroke: var(--color-accent); stroke-width: 2.5;
        stroke-linecap: round; stroke-dasharray: 7 7; opacity: 0.4;
        animation: qp-brand-road-move 1.8s linear infinite;
      }
      @keyframes qp-brand-road-move {
        to { stroke-dashoffset: -28; }
      }
      @media (prefers-reduced-motion: reduce) {
        .qp-brand-road path { animation: none; }
      }
      .qp-hero {
        display: grid; grid-template-columns: 1.3fr auto 0.9fr; align-items: center;
        max-width: 1100px; margin: 0 auto; gap: var(--space-8);
      }
      .qp-hero-left { padding: var(--space-4) 0 var(--space-8); display: flex; flex-direction: column; gap: var(--space-4); }
      .qp-hero-left h1 { font-size: 46px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; max-width: 480px; }
      .qp-hero-highlight { color: var(--color-accent); }

      .qp-hero-divider {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: var(--space-2); align-self: stretch; min-height: 220px;
      }
      .qp-hero-divider-line {
        width: 1px; flex: 1;
        background: linear-gradient(to bottom, transparent, var(--color-accent-300) 20%, var(--color-accent-300) 80%, transparent);
      }
      .qp-hero-divider-dot {
        flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%;
        border: 1px solid var(--color-accent); background: var(--color-bg);
      }

      .qp-hero-search-card {
        background: var(--color-bg); border: 2px solid var(--color-accent);
        border-radius: var(--radius-xl); padding: var(--space-8); box-shadow: var(--shadow-lg);
      }
      .qp-hero-form { display: flex; flex-direction: column; align-items: stretch; gap: var(--space-4); }
      .qp-hero-form .field { width: 100%; }
      .qp-hero-form .input { background: var(--color-bg); border-radius: var(--radius-lg); }
      .qp-input-icon { position: relative; display: flex; align-items: center; }
      .qp-input-icon lucide-icon { position: absolute; left: 11px; color: var(--color-accent); pointer-events: none; }
      .qp-input-icon .input { padding-left: 34px; }

      .qp-hero-right { max-width: 400px; width: 100%; justify-self: center; }

      .qp-landing-stack { display: flex; flex-direction: column; gap: 56px; padding: 56px var(--space-4); }

      .qp-eyebrow { color: var(--color-neutral-600); margin: 0 0 var(--space-4); }

      .qp-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-6); }
      .qp-step { display: flex; flex-direction: column; gap: var(--space-1); padding-top: var(--space-3); border-top: 2px solid var(--color-accent-300); }
      .qp-step-num { font-family: var(--font-heading); font-weight: 300; font-size: 22px; color: var(--color-accent); }

      .qp-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); align-items: start; }
      .qp-check-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); font-size: 14px; }
      .qp-check-list li { padding-left: var(--space-4); position: relative; }
      .qp-check-list li::before {
        content: ''; position: absolute; left: 0; top: 7px; width: 7px; height: 7px;
        border-radius: 50%; background: var(--color-accent);
      }

      .qp-panel { background: var(--color-surface); border-radius: var(--radius-xl); padding: var(--space-5); }
      .qp-sim-panel { padding: var(--space-5); }

      .qp-security-divider {
        display: block; width: 48px; height: 4px; border-radius: var(--radius-sm);
        background: var(--color-accent-900); margin-bottom: var(--space-4);
      }
      .qp-security-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4); }
      .qp-security-item {
        color: var(--color-text); font-size: 14px;
        padding-top: var(--space-2); border-top: 2px solid var(--color-accent-300);
      }

      .qp-cta-final { text-align: center; padding: var(--space-8) 0; }

      @media (max-width: 900px) {
        .qp-hero, .qp-two-col { grid-template-columns: 1fr; }
        .qp-hero-divider { display: none; }
        .qp-hero-right { max-width: 100%; justify-self: stretch; margin-left: 0; }
        .qp-steps { grid-template-columns: repeat(2, 1fr); }
        .qp-security-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class SiteComponent {
  readonly MapPinIcon = MapPin;

  local = 'São Paulo, SP';
  inicio = '';
  fim = '';

  diariaSimuladaValor = 180;

  comoFunciona = [
    { numero: '01', titulo: 'Anuncie', texto: 'Cadastre seu veículo com fotos, documentos e disponibilidade.' },
    { numero: '02', titulo: 'Receba pedidos', texto: 'Locatários verificados solicitam datas; você aceita ou recusa.' },
    { numero: '03', titulo: 'Entregue com vistoria', texto: 'Fotos e quilometragem registradas na retirada e na devolução.' },
    { numero: '04', titulo: 'Receba o repasse', texto: 'Valor líquido depositado em D+2 após a devolução.' },
  ];

  beneficios = [
    'Proteção contra danos em cada locação',
    'Locatários com identidade e CNH verificadas',
    'Caução pré-autorizada, sem burocracia',
    'Repasse automático em D+2',
  ];

  seguranca = [
    'Verificação de identidade e CNH',
    'Selfie com prova de vida',
    'Reputação bilateral por avaliação',
    'Vistoria fotográfica obrigatória',
    'Caução pré-autorizada',
    'Proteção contra danos',
  ];

  receitaEstimada = signal(0);

  constructor(public pricing: PricingService, private router: Router) {
    this.atualizarSimulacao();
  }

  atualizarSimulacao(): void {
    const bruto = this.diariaSimuladaValor * 8;
    this.receitaEstimada.set(bruto - bruto * (this.pricing.taxaPct / 100));
  }

  buscar(): void {
    this.router.navigate(['/buscar']);
  }
}
