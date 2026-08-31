import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'qp-depoimentos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-stack">
      <h3 style="text-align: center; margin-bottom: var(--space-6);">Quem usa, aprova</h3>

      <div class="qp-grid-2">
        @for (item of depoimentos; track item.nome) {
          <div class="card qp-stack" style="padding: var(--space-4); background: #ffffff;">
            <div class="qp-row" style="gap: var(--space-3);">
              <div class="qp-avatar" style="width: 44px; height: 44px; border-radius: 50%;">
                @if (item.genero === 'f') {
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M12 14c-5 0-8 2.5-8 5v1h16v-1c0-2.5-3-5-8-5Z" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <circle cx="12" cy="7" r="4" />
                    <path d="M12 13c-4.5 0-7 2.2-7 4.5V19h14v-1.5c0-2.3-2.5-4.5-7-4.5Z" />
                  </svg>
                }
              </div>

              <div>
                <div style="font-weight: 600; font-size: 15px;">{{ item.nome }}, {{ item.idade }} anos</div>
                <span class="tag tag-accent" style="margin-top: 2px;">{{ item.papel }}</span>
              </div>
            </div>

            <p class="card-body" style="font-size: 14px; margin-top: var(--space-2); line-height: 1.6;">
              "{{ item.texto }}"
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class DepoimentosComponent {
  depoimentos = [
    {
      nome: 'Mariana',
      idade: 24,
      papel: 'Locatária',
      texto: 'Precisava viajar no feriado e a locadora mais próxima ficava a 40 minutos. Pela QuickPass, aluguei o carro do meu vizinho em 5 minutos. Muito prático!',
      genero: 'f',
    },
    {
      nome: 'Lucas',
      idade: 32,
      papel: 'Proprietário',
      texto: 'Meu carro ficava parado 5 dias na semana dando prejuízo. O sistema de vistoria fotográfica e a segurança na validação me deram coragem para anunciar. Hoje ele paga o próprio IPVA.',
      genero: 'm',
    },
  ];
}
