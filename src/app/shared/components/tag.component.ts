import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type TagVariant = 'accent' | 'accent-2' | 'neutral' | 'outline';

@Component({
  selector: 'qp-tag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="tag" [class]="'tag-' + variant()"><ng-content /></span>`,
})
export class TagComponent {
  variant = input<TagVariant>('neutral');
}
