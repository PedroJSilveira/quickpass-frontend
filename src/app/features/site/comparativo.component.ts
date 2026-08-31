import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'qp-comparativo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qp-stack" style="max-width: 900px; margin: 0 auto; width: 100%;">
      <h3 style="text-align: center; margin-bottom: var(--space-4);">Por que escolher a QuickPass?</h3>

      <div style="overflow-x: auto; width: 100%;">
        <table class="table" style="table-layout: fixed; width: 100%;">
          <thead>
            <tr>
              <th style="width: 28%;">Característica</th>
              <th style="width: 38%; color: var(--color-accent-800); font-weight: 700;">QuickPass</th>
              <th style="width: 34%;">Locadoras Tradicionais</th>
            </tr>
          </thead>
          <tbody>
            @for (item of dados; track item.caracteristica) {
              <tr>
                <td style="font-weight: 600;">{{ item.caracteristica }}</td>
                <td style="background: var(--color-accent-100); color: var(--color-accent-900); font-weight: 700;">
                  <span style="color: #16a34a; font-weight: 700; margin-right: 4px;">✓</span>
                  {{ item.quickpass }}
                </td>
                <td class="text-muted">{{ item.tradicional }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ComparativoComponent {
  dados = [
    { caracteristica: 'Burocracia', quickpass: '100% via app, sem filas', tradicional: 'Alta (filas e papéis)' },
    { caracteristica: 'Localização', quickpass: 'No seu bairro, na esquina de casa', tradicional: 'Apenas em aeroportos e polos' },
    { caracteristica: 'Seguro e Proteção', quickpass: 'Proteção integrada e caução segura', tradicional: 'Taxas surpresas e pacotes engessados' },
  ];
}
