import { Injectable } from '@angular/core';
import { AcquisitionAttribution, CanalOrigem } from '../models/domain.models';

const STORAGE_KEY = 'qp.attribution';

/**
 * Captura UTMs / código de indicação na PRIMEIRA visita e persiste até o
 * cadastro (RF08). A atribuição é first-touch: uma vez gravada, nunca muda.
 */
@Injectable({ providedIn: 'root' })
export class AttributionService {
  /** Lê a query string da primeira visita; ignora chamadas posteriores. */
  capturar(search: string = globalThis.location?.search ?? '', referrer: string = globalThis.document?.referrer ?? ''): AcquisitionAttribution {
    const existente = this.ler();
    if (existente) return existente;

    const q = new URLSearchParams(search);
    const medium = q.get('utm_medium');
    const ref = q.get('ref');
    const attr: AcquisitionAttribution = Object.freeze({
      canal: this.classificar(medium, ref, referrer, q.get('utm_source')),
      utm_source: q.get('utm_source'),
      utm_medium: medium,
      utm_campaign: q.get('utm_campaign'),
      utm_term: q.get('utm_term'),
      utm_content: q.get('utm_content'),
      referral_code: ref,
      capturadaEm: new Date().toISOString(),
    });
    this.gravar(attr);
    return attr;
  }

  /** Atribuição a ser gravada no cadastro. Sempre retorna canal (mesmo `desconhecido`). */
  paraCadastro(): AcquisitionAttribution {
    return this.ler() ?? this.capturar('', '');
  }

  private classificar(medium: string | null, ref: string | null, referrer: string, source: string | null): CanalOrigem {
    if (ref) return 'referral';
    const m = (medium ?? '').toLowerCase();
    if (['cpc', 'ppc', 'paid', 'paidsocial', 'display'].includes(m)) return 'midia_paga';
    if (m === 'hiperlocal' || m === 'local') return 'hiperlocal';
    if (m === 'organic' || /google|bing|duckduckgo/i.test(referrer)) return 'busca_organica';
    if (!source && !medium && !referrer) return 'direto';
    return 'desconhecido';
  }

  private ler(): AcquisitionAttribution | null {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      return raw ? (Object.freeze(JSON.parse(raw)) as AcquisitionAttribution) : null;
    } catch {
      return null;
    }
  }

  private gravar(attr: AcquisitionAttribution): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(attr));
    } catch {
      /* sem storage: a atribuição vale só nesta carga */
    }
  }
}
