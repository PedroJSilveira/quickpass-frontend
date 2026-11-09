import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, input, signal } from '@angular/core';
import { ApiService } from '../../core/api/api.service';

/**
 * Miniatura de um arquivo protegido (evidência, foto de vistoria…): baixa com o token da sessão
 * e exibe via object URL, já que `<img src>` não envia o cabeçalho Authorization.
 */
@Component({
  selector: 'qp-arquivo-img',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src(); as s) {
      <a [href]="s" target="_blank" rel="noopener"><img [src]="s" [alt]="nome()" class="qp-arq-img" /></a>
    } @else if (erro()) {
      <span class="text-muted" style="font-size: 12px;">{{ nome() }} (indisponível)</span>
    } @else {
      <span class="text-muted" style="font-size: 12px;">carregando…</span>
    }
  `,
  styles: ['.qp-arq-img { width: 96px; height: 72px; object-fit: cover; border: 1px solid var(--color-divider); }'],
})
export class ArquivoImgComponent implements OnDestroy {
  url = input.required<string>();
  nome = input<string>('arquivo');
  src = signal<string | null>(null);
  erro = signal(false);
  private api = inject(ApiService);
  private objeto: string | null = null;

  constructor() {
    effect(() => {
      const u = this.url();
      void this.api
        .blob(u)
        .then((b) => {
          if (this.objeto) URL.revokeObjectURL(this.objeto);
          this.objeto = URL.createObjectURL(b);
          this.src.set(this.objeto);
        })
        .catch(() => this.erro.set(true));
    });
  }

  ngOnDestroy(): void {
    if (this.objeto) URL.revokeObjectURL(this.objeto);
  }
}
