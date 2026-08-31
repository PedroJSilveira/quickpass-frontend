import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Envolve conteúdo com o padrão "blueprint" do design system Industry:
 * moldura hairline + quatro marcas de registro nos cantos. Nunca arredondar
 * nem preencher — ver industry.css / README ("Padrão blueprint").
 */
@Component({
  selector: 'qp-blueprint',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="blueprint" [class.qp-fill]="preenchido()">
      <i class="corner tl"></i><i class="corner tr"></i>
      <i class="corner bl"></i><i class="corner br"></i>
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .qp-fill { background: var(--color-accent-900); color: var(--color-bg); padding: var(--space-4); }
    `,
  ],
})
export class BlueprintFrameComponent {
  /** Uso raro: bloco "cheio" (ex. destaque de saldo/segurança), com fundo sólido escuro. */
  preenchido = input(false);
}
