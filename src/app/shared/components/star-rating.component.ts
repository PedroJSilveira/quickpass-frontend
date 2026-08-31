import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'qp-star-rating',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-row" role="radiogroup" aria-label="Nota">
      @for (i of [1, 2, 3, 4, 5]; track i) {
        <button
          type="button"
          class="qp-star"
          [class.qp-star-on]="i <= value"
          (click)="escolher(i)"
          [attr.aria-label]="i + ' estrela(s)'"
        >
          ★
        </button>
      }
    </div>
  `,
  styles: [
    `
      .qp-star {
        font-size: 48px; line-height: 1; background: none; border: none; cursor: pointer;
        color: var(--color-neutral-300); padding: 0 2px;
      }
      .qp-star-on { color: var(--color-accent); }
    `,
  ],
})
export class StarRatingComponent {
  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>();

  escolher(v: number): void {
    this.value = v;
    this.valueChange.emit(v);
  }
}
