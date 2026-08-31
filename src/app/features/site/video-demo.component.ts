import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'qp-video-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-stack" style="text-align: center; max-width: 900px; margin: 0 auto;">
      <h3>Veja como é rápido e seguro</h3>

      <div style="position: relative; aspect-ratio: 16 / 9; width: 100%; overflow: hidden; background: #000; cursor: pointer;">
        <img [src]="capa" alt="Demonstração QuickPass" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" />
        <button class="qp-video-play" aria-label="Reproduzir vídeo">
          <svg viewBox="0 0 80 80" fill="none" width="80" height="80">
            <circle cx="40" cy="40" r="40" fill="rgba(0, 0, 0, 0.55)" />
            <polygon points="32,24 32,56 58,40" fill="#ffffff" />
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .qp-video-play {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
      }
      .qp-video-play svg {
        transition: transform 0.25s ease;
      }
      .qp-video-play:hover svg {
        transform: scale(1.12);
      }
    `,
  ],
})
export class VideoDemoComponent {
  @Input() capa = 'assets/video-demo.png';
}
