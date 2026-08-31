import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface SegOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'qp-seg-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="seg" role="radiogroup">
      @for (opt of options; track opt.value) {
        <label class="seg-opt">
          <input
            type="radio"
            [name]="name"
            [checked]="opt.value === value"
            (change)="selecionar(opt.value)"
          />
          {{ opt.label }}
        </label>
      }
    </div>
  `,
})
export class SegControlComponent<T = string> {
  @Input() options: SegOption<T>[] = [];
  @Input() value: T | null = null;
  @Input() name = 'seg-' + Math.random().toString(36).slice(2);
  @Output() valueChange = new EventEmitter<T>();

  selecionar(v: T): void {
    this.value = v;
    this.valueChange.emit(v);
  }
}
