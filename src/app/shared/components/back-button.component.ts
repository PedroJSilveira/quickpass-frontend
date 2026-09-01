import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Location } from '@angular/common';
import { ArrowLeft, LucideAngularModule } from 'lucide-angular';

/**
 * Link "Voltar" para telas de detalhe/fluxo (fora dos destinos diretos da
 * sidebar). Usa o histórico do navegador (Location.back()) em vez de uma
 * rota fixa, então volta para a tela real de onde o usuário veio.
 */
@Component({
  selector: 'qp-back-button',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="qp-back-link" (click)="voltar()">
      <lucide-icon [img]="ArrowLeftIcon" [size]="16" />
      Voltar
    </button>
  `,
})
export class BackButtonComponent {
  readonly ArrowLeftIcon = ArrowLeft;

  constructor(private location: Location) {}

  voltar(): void {
    this.location.back();
  }
}
