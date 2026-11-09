import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import {
  LucideAngularModule,
  Upload,
  Inbox,
  Camera,
  Wallet,
  IdCard,
  ScanFace,
  Star,
  Lock,
  ShieldCheck,
} from 'lucide-angular';
import { PricingService } from '../../core/services/pricing.service';
import { CatalogService } from '../../core/services/catalog.service';
import { urlImagem } from '../../core/api/api.config';
import { formatIsoDate, parseIsoDate } from '../../shared/utils/date.util';

@Component({
  selector: 'qp-site',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InputTextModule, DatePickerModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <nav class="nav qp-landing-nav">
        <span class="nav-brand">QuickPass</span>
        <a routerLink="/buscar">Buscar carros</a>
        <a routerLink="/proprietario">Anunciar meu carro</a>
        <a routerLink="/entrar">Entrar</a>
        <a class="btn btn-primary" routerLink="/cadastro">Criar conta</a>
      </nav>

      <!-- Hero -->
      <section class="qp-hero">
        <div class="qp-hero-left">
          <div class="qp-screen-kicker">Aluguel de carros entre pessoas</div>
          <h1>Alugue o carro certo, do jeito mais simples.</h1>
          <p style="font-size: 16px; max-width: 460px;">
            Proprietários anunciam veículos ociosos, locatários reservam por período — com
            proteção, caução e avaliação em cada locação.
          </p>
          <form class="qp-hero-form" (ngSubmit)="buscar()">
            <div class="field">
              <label>Local</label>
              <input pInputText [ngModel]="local()" (ngModelChange)="local.set($event)" name="local" />
            </div>
            <div class="field">
              <label>Retirada</label>
              <p-datepicker [ngModel]="inicioDate()" (ngModelChange)="inicio.set(formatIsoDate($event))" dateFormat="dd/mm/yy" name="inicio" />
            </div>
            <div class="field">
              <label>Devolução</label>
              <p-datepicker [ngModel]="fimDate()" (ngModelChange)="fim.set(formatIsoDate($event))" dateFormat="dd/mm/yy" name="fim" />
            </div>
            <button class="btn btn-primary" type="submit">Buscar carros</button>
          </form>
        </div>
        <div class="qp-hero-right">
          <img src="assets/foto-b.jpeg" alt="Aperto de mão com a chave do carro" />
          <div class="qp-hero-badge">
            <lucide-icon [img]="StarIcon" [size]="16" />
            <div>
              <strong>4.9</strong>
              <span>· 12.400+ locações</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Carros em destaque -->
      <section class="qp-band qp-band-tint">
        <div class="qp-container qp-stack">
          <h6 class="qp-eyebrow">Frota disponível agora</h6>
          <div class="qp-featured-grid">
            @for (v of carrosDestaque(); track v.id) {
              <article class="card qp-car-card" (click)="abrir(v.id)">
                <div class="qp-car-card-photo-wrap">
                  <div class="qp-photo qp-car-card-photo" [style.background-image]="'url(' + img(v.foto) + ')'"></div>
                </div>
                <div class="qp-stack qp-car-card-body">
                  <div class="qp-row-between">
                    <span class="card-title">{{ v.titulo }}</span>
                    <span class="qp-car-card-price">{{ pricing.moneyRounded(v.diaria) }}<small>/dia</small></span>
                  </div>
                  <div class="card-meta">★ {{ v.nota ?? 'novo' }} · {{ v.locacoes }} viagens · {{ v.local }}</div>
                </div>
              </article>
            }
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
                <span class="qp-step-icon"><lucide-icon [img]="passo.icon" [size]="18" /></span>
                <div class="card-title">{{ passo.titulo }}</div>
                <p class="text-muted" style="font-size: 13px; margin: 0;">{{ passo.texto }}</p>
              </div>
            }
          </div>
        </section>
      </div>

      <!-- Ganhar com meu carro -->
      <section class="qp-band qp-band-tint">
        <div class="qp-container qp-two-col">
          <div class="qp-stack">
            <h6 class="qp-eyebrow">Ganhar com meu carro</h6>
            <ul class="qp-check-list">
              @for (b of beneficios; track b) {
                <li>{{ b }}</li>
              }
            </ul>
          </div>
          <div class="qp-panel qp-stack">
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
        </div>
      </section>

      <div class="qp-container qp-landing-stack">
        <!-- Segurança -->
        <section class="qp-security">
          <h6 class="qp-eyebrow qp-eyebrow-light">Segurança em cada etapa</h6>
          <div class="qp-security-grid">
            @for (camada of seguranca; track camada.texto) {
              <div class="qp-security-item">
                <lucide-icon [img]="camada.icon" [size]="16" />
                {{ camada.texto }}
              </div>
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
      </div>

      <!-- CTA final -->
      <section class="qp-band qp-band-tint">
        <div class="qp-container qp-cta-final">
          <h3 style="margin-bottom: var(--space-2);">Pronto para começar?</h3>
          <p class="text-muted">Crie sua conta gratuitamente e escolha se quer alugar ou anunciar um carro.</p>
          <a class="btn btn-primary" routerLink="/cadastro">Criar conta</a>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .qp-landing-nav { max-width: 1100px; margin: 0 auto; padding-top: var(--space-6); padding-bottom: var(--space-6); }
      .qp-hero {
        display: grid; grid-template-columns: 1.05fr 1fr; align-items: center;
        max-width: 1100px; margin: 0 auto; gap: var(--space-8);
      }
      .qp-hero-left { padding: var(--space-4) 0 var(--space-8); display: flex; flex-direction: column; gap: var(--space-4); }
      .qp-hero-left h1 { font-size: 46px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; max-width: 480px; }
      .qp-hero-form { display: flex; gap: var(--space-2); align-items: flex-end; flex-wrap: wrap; }
      .qp-hero-form .p-inputtext, .qp-hero-form p-datepicker { background: var(--color-surface-light); }
      .qp-hero-right { min-width: 380px; position: relative; }
      .qp-hero-right img { width: 100%; height: 100%; max-height: 420px; object-fit: cover; border-radius: var(--radius-xl); display: block; }
      .qp-hero-badge {
        position: absolute; left: var(--space-4); bottom: var(--space-4);
        display: flex; align-items: center; gap: var(--space-2);
        background: var(--color-bg); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
        padding: var(--space-2) var(--space-3); color: var(--color-accent-700);
      }
      .qp-hero-badge div { display: flex; flex-direction: column; line-height: 1.1; color: var(--color-text); font-size: 12px; }
      .qp-hero-badge strong { font-family: var(--font-heading); font-size: 14px; }

      .qp-band { padding: 56px var(--space-4); }
      .qp-band-tint { background: var(--color-surface-light); }

      .qp-landing-stack { display: flex; flex-direction: column; gap: 56px; padding: 56px var(--space-4); }

      .qp-eyebrow { color: var(--color-neutral-600); margin: 0 0 var(--space-4); }
      .qp-eyebrow-light { color: color-mix(in srgb, var(--color-bg) 65%, transparent); }

      .qp-featured-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--space-4); }
      .qp-car-card {
        padding: 0; cursor: pointer; background: var(--color-bg);
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
      }
      .qp-car-card:hover { transform: translateY(-4px); border-color: var(--color-accent); box-shadow: var(--shadow-md); }
      .qp-car-card-photo-wrap { overflow: hidden; }
      .qp-car-card-photo { transition: transform .35s ease; }
      .qp-car-card:hover .qp-car-card-photo { transform: scale(1.06); }
      .qp-car-card-body { padding: var(--space-3); gap: 4px; }
      .qp-car-card-body .card-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .qp-car-card-price { font-family: var(--font-heading); font-weight: 600; color: var(--color-accent-700); white-space: nowrap; flex: none; }
      .qp-car-card-price small { font-weight: 400; color: var(--color-neutral-600); font-size: 11px; }

      .qp-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-6); }
      .qp-step { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-3); border-top: 1px solid var(--color-divider); }
      .qp-step-icon {
        width: 36px; height: 36px; display: grid; place-items: center; margin-bottom: var(--space-1);
        background: var(--color-accent-100); color: var(--color-accent-700); border: 1px solid var(--color-divider);
      }

      .qp-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); align-items: start; }
      .qp-check-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); font-size: 14px; }
      .qp-check-list li { padding-left: var(--space-4); position: relative; }
      .qp-check-list li::before {
        content: ''; position: absolute; left: 0; top: 7px; width: 7px; height: 7px;
        border-radius: 50%; background: var(--color-accent);
      }

      .qp-panel { background: var(--color-surface); border-radius: var(--radius-xl); padding: var(--space-6); }

      .qp-security { background: var(--color-accent-900); border-radius: var(--radius-xl); padding: var(--space-8) var(--space-6); }
      .qp-security-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4); }
      .qp-security-item {
        display: flex; align-items: center; gap: var(--space-2);
        color: color-mix(in srgb, var(--color-bg) 90%, transparent); font-size: 14px;
        padding-top: var(--space-2); border-top: 1px solid color-mix(in srgb, var(--color-bg) 20%, transparent);
      }
      .qp-security-item lucide-icon { flex: none; color: var(--color-accent-300); }

      .qp-cta-final { text-align: center; padding: var(--space-8) 0; }

      @media (max-width: 900px) {
        .qp-hero, .qp-two-col { grid-template-columns: 1fr; }
        .qp-steps { grid-template-columns: repeat(2, 1fr); }
        .qp-security-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class SiteComponent implements OnInit {
  readonly StarIcon = Star;

  public catalog = inject(CatalogService);

  local = signal('São Paulo, SP');
  inicio = signal(this.catalog.filtros().inicio);
  fim = signal(this.catalog.filtros().fim);
  inicioDate = computed(() => parseIsoDate(this.inicio()));
  fimDate = computed(() => parseIsoDate(this.fim()));

  diariaSimuladaValor = 180;

  comoFunciona = [
    { numero: '01', icon: Upload, titulo: 'Anuncie', texto: 'Cadastre seu veículo com fotos, documentos e disponibilidade.' },
    { numero: '02', icon: Inbox, titulo: 'Receba pedidos', texto: 'Locatários verificados solicitam datas; você aceita ou recusa.' },
    { numero: '03', icon: Camera, titulo: 'Entregue com vistoria', texto: 'Fotos e quilometragem registradas na retirada e na devolução.' },
    { numero: '04', icon: Wallet, titulo: 'Receba o repasse', texto: 'Valor líquido depositado em D+2 após a devolução.' },
  ];

  beneficios = [
    'Proteção contra danos em cada locação',
    'Locatários com identidade e CNH verificadas',
    'Caução pré-autorizada, sem burocracia',
    'Repasse automático em D+2',
  ];

  seguranca = [
    { texto: 'Verificação de identidade e CNH', icon: IdCard },
    { texto: 'Selfie com prova de vida', icon: ScanFace },
    { texto: 'Reputação bilateral por avaliação', icon: Star },
    { texto: 'Vistoria fotográfica obrigatória', icon: Camera },
    { texto: 'Caução pré-autorizada', icon: Lock },
    { texto: 'Proteção contra danos', icon: ShieldCheck },
  ];

  receitaEstimada = signal(0);

  img = urlImagem;

  /** Vitrine: os mais alugados dentre os disponíveis, vindos da API. */
  carrosDestaque = computed(() => [...this.catalog.resultados()].sort((a, b) => b.locacoes - a.locacoes).slice(0, 4));

  ngOnInit(): void {
    void this.catalog.pesquisar(false);
  }

  constructor(public pricing: PricingService, private router: Router) {
    this.atualizarSimulacao();
  }

  atualizarSimulacao(): void {
    const bruto = this.diariaSimuladaValor * 8;
    this.receitaEstimada.set(bruto - bruto * (this.pricing.taxaPct / 100));
  }

  abrir(id: string): void {
    this.router.navigate(['/carros', id]);
  }

  buscar(): void {
    this.catalog.buscar({ local: this.local(), inicio: this.inicio(), fim: this.fim() });
    this.router.navigate(['/buscar']);
  }

  formatIsoDate = formatIsoDate;
}
