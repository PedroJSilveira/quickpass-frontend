import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FotoChave, FotoVistoria, FotosVistoria } from '../../core/models/domain.models';
import { FOTOS_OBRIGATORIAS } from '../../core/services/booking.service';
import { UploadQueueService } from '../../core/services/upload-queue.service';

export interface FotoAlterada {
  chave: FotoChave;
  patch: Partial<FotoVistoria>;
}

/**
 * Grade das 7 fotos obrigatórias da vistoria (RF03). Cada foto é comprimida
 * no cliente e enviada em segundo plano pela fila (RNF01), com progresso e
 * reenvio. O pai guarda o estado e só libera a confirmação quando todas
 * estiverem `enviada`.
 */
@Component({
  selector: 'qp-vistoria-fotos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-fotos-grid">
      @for (item of slots; track item.chave) {
        @let f = fotos()[item.chave];
        <label class="qp-foto-slot" [class.qp-foto-feita]="f.status === 'enviada'" [class.qp-foto-erro]="f.status === 'falhou'">
          <input type="file" accept="image/*" capture="environment" hidden (change)="escolher(item.chave, $event)" />
          <span>[ {{ item.rotulo }} ]</span>
          <small>
            @switch (f.status) {
              @case ('pendente') { toque para capturar }
              @case ('na_fila') { na fila… }
              @case ('enviando') { enviando {{ f.progresso }}% }
              @case ('enviada') { enviada ✓ }
              @case ('falhou') { falhou — toque para reenviar }
            }
          </small>
          @if (f.status === 'enviando') {
            <div class="qp-foto-barra"><div [style.width.%]="f.progresso"></div></div>
          }
        </label>
      }
    </div>
  `,
  styles: [
    `
      .qp-fotos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-2); }
      .qp-foto-slot {
        aspect-ratio: 1; border: 1px solid var(--color-divider); display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 4px; font-size: 12px; text-align: center; cursor: pointer; padding: 4px;
      }
      .qp-foto-feita { border-color: var(--color-accent); background: var(--color-accent-100); }
      .qp-foto-erro { border-color: var(--color-neutral-600); border-style: dashed; }
      .qp-foto-barra { width: 80%; height: 3px; background: var(--color-divider); }
      .qp-foto-barra > div { height: 100%; background: var(--color-accent); transition: width .2s ease-out; }
    `,
  ],
})
export class VistoriaFotosComponent {
  fotos = input.required<FotosVistoria>();
  alterada = output<FotoAlterada>();

  slots = FOTOS_OBRIGATORIAS;
  private queue = inject(UploadQueueService);

  escolher(chave: FotoChave, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) return;
    void this.queue.enfileirar(arquivo, (patch) => this.alterada.emit({ chave, patch }));
  }
}
