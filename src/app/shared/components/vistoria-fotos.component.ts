import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FotoChave, FotosVistoria } from '../../core/models/domain.models';
import { FOTOS_OBRIGATORIAS } from '../../core/services/booking.service';

export interface FotoEscolhida {
  chave: FotoChave;
  arquivo: File;
}

/**
 * Grade das 7 fotos obrigatórias da vistoria (RF03). O arquivo escolhido sobe em multipart pela
 * fila de upload (compressão, progresso, retentativa); o pai guarda o estado e só libera a
 * confirmação quando todas estiverem `enviada` (confirmadas pelo servidor).
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
          <input type="file" accept="image/*" capture="environment" hidden [disabled]="desabilitado()" (change)="escolher(item.chave, $event)" />
          <span>[ {{ item.rotulo }} ]</span>
          <small>
            @switch (f.status) {
              @case ('pendente') { toque para capturar }
              @case ('na_fila') { na fila… }
              @case ('enviando') { enviando {{ f.progresso }}% }
              @case ('enviada') { enviada ✓ (toque para trocar) }
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
})
export class VistoriaFotosComponent {
  fotos = input.required<FotosVistoria>();
  desabilitado = input(false);
  escolhida = output<FotoEscolhida>();

  slots = FOTOS_OBRIGATORIAS;

  escolher(chave: FotoChave, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (arquivo) this.escolhida.emit({ chave, arquivo });
  }
}
