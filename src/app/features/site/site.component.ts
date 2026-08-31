import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PricingService } from '../../core/services/pricing.service';
import { BlueprintFrameComponent } from '../../shared/components/blueprint-frame.component';
import { VideoDemoComponent } from './video-demo.component';
import { ComparativoComponent } from './comparativo.component';
import { DepoimentosComponent } from './depoimentos.component';

@Component({
  selector: 'qp-site',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    BlueprintFrameComponent,
    VideoDemoComponent,
    ComparativoComponent,
    DepoimentosComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <nav class="nav" style="max-width: 1100px; margin: 0 auto;">
        <span class="nav-brand">QuickPass</span>
        <a routerLink="/buscar">Buscar carros</a>
        <a routerLink="/proprietario">Anunciar meu carro</a>
        <a routerLink="/entrar">Entrar</a>
        <a class="btn btn-primary" routerLink="/cadastro">Criar conta</a>
      </nav>

      <section class="qp-hero">
        <div class="qp-hero-left">
          <div class="qp-screen-kicker">Aluguel de carros entre pessoas</div>
          <h1>
            Alugue<br />
            o carro certo,<br />
            do jeito mais<br />
            simples.
          </h1>
          <p style="font-size: 16px;">
            Proprietários anunciam veículos ociosos, locatários reservam por período — com
            proteção, caução e avaliação em cada locação.
          </p>
          <form class="qp-hero-form" (ngSubmit)="buscar()">
            <div class="field">
              <label>Local</label>
              <input class="input" [(ngModel)]="local" name="local" />
            </div>
            <div class="field">
              <label>Retirada</label>
              <input class="input" type="date" [(ngModel)]="inicio" name="inicio" />
            </div>
            <div class="field">
              <label>Devolução</label>
              <input class="input" type="date" [(ngModel)]="fim" name="fim" />
            </div>
            <button class="btn btn-primary" type="submit">Buscar carros</button>
          </form>
        </div>
        <div class="qp-hero-right">
          <img src="assets/foto-b.jpeg" alt="Aperto de mão com a chave do carro" />
        </div>
      </section>

      <div class="qp-container qp-stack" style="padding: var(--space-8) var(--space-4); gap: clamp(3.5rem, 6vw, 5.5rem);">
        <qp-video-demo />

        <qp-comparativo />

        <section class="qp-stack" style="gap: var(--space-8);">
          <section>
            <h3>Como funciona para anunciar</h3>
            <div class="qp-grid-4">
              @for (passo of comoFunciona; track passo.numero) {
                <div class="card">
                  <span class="card-kicker">{{ passo.numero }}</span>
                  <div class="card-title">{{ passo.titulo }}</div>
                  <p class="card-body">{{ passo.texto }}</p>
                </div>
              }
            </div>
          </section>

          <section class="qp-two-col">
            <div class="qp-stack">
              <h3>Ganhar com meu carro</h3>
              <ul class="qp-check-list">
                @for (b of beneficios; track b) {
                  <li>✓ {{ b }}</li>
                }
              </ul>
            </div>
            <div class="card qp-stack">
              <div class="card-title">Simule sua renda</div>
              <label class="text-muted" style="font-size: 12px;">
                Diária: {{ pricing.money(diariaSimuladaValor) }}
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
                Você recebe {{ pricing.moneyRounded(receitaEstimada()) }}/mês
              </div>
            </div>
          </section>

          <section class="qp-two-col">
            <div class="qp-stack">
              <h3>Taxas transparentes</h3>
              <p>
                A QuickPass retém {{ pricing.taxaPct }}% do valor da locação — não incide sobre a
                proteção nem sobre a caução, que é apenas pré-autorizada e devolvida no check-out.
              </p>
            </div>
            <div class="card qp-stack">
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
        </section>

        <qp-blueprint [preenchido]="true">
          <h3 style="color: var(--color-bg);">Segurança em cada etapa</h3>
          <div class="qp-grid-3">
            @for (camada of seguranca; track camada) {
              <div class="qp-camada">{{ camada }}</div>
            }
          </div>
        </qp-blueprint>

        <qp-depoimentos />

        <section class="card" style="text-align: center; padding: calc(var(--space-8) * 1.5) var(--space-6); background: #ffffff;">
          <h2 style="font-size: 34px; margin-bottom: var(--space-2);">Pronto para começar?</h2>
          <p class="text-muted" style="font-size: 15px; margin-bottom: var(--space-4);">
            Crie sua conta gratuitamente e escolha se quer alugar ou anunciar um carro.
          </p>
          <div class="qp-row" style="justify-content: center; gap: var(--space-2); flex-wrap: wrap;">
            <a class="btn btn-primary" routerLink="/cadastro">Criar conta</a>
            <a class="btn btn-secondary" routerLink="/buscar">Ver carros disponíveis</a>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .qp-hero {
        display: grid;
        grid-template-columns: 1.05fr 1fr;
        align-items: stretch;
        max-width: 1100px;
        margin: 0 auto;
        gap: var(--space-6);
      }
      .qp-hero-left {
        padding: var(--space-8) var(--space-4);
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: var(--space-3);
      }
      .qp-hero-left h1 {
        font-size: 60px;
        line-height: 0.98;
      }
      .qp-hero-form {
        display: flex;
        gap: var(--space-2);
        align-items: flex-end;
        flex-wrap: wrap;
      }
      .qp-hero-right {
        border-left: 1px solid var(--color-divider);
        min-width: 420px;
        display: flex;
      }
      .qp-hero-right img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .qp-grid-4 {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: var(--space-3);
      }
      .qp-grid-3 {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0;
        margin-top: var(--space-4);
      }
      .qp-camada {
        padding: var(--space-3);
        border-top: 1px solid color-mix(in srgb, var(--color-bg) 25%, transparent);
        border-right: 1px solid color-mix(in srgb, var(--color-bg) 25%, transparent);
        color: var(--color-bg);
        font-size: 14px;
      }
      .qp-two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-6);
        align-items: start;
      }
      .qp-check-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      @media (max-width: 900px) {
        .qp-hero,
        .qp-two-col {
          grid-template-columns: 1fr;
        }
        .qp-grid-4 {
          grid-template-columns: repeat(2, 1fr);
        }
        .qp-grid-3 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SiteComponent {
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
