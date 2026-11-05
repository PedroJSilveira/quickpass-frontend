/**
 * Localização em eventos analíticos é SEMPRE aproximada (RNF02/correção 17).
 * Coordenadas exatas nunca devem sair daqui: reduzimos para uma célula grosseira
 * (~11 km) ou usamos o nome do bairro.
 */
export function aproximarCoordenada(lat: number, lng: number): string {
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

/** Remove qualquer propriedade que pareça lat/long exata antes de emitir um evento. */
export function sanitizarGeo<T extends Record<string, unknown>>(props: T): T {
  const proibidas = ['lat', 'lng', 'lon', 'latitude', 'longitude', 'lat_long', 'lat_long_centro'];
  const limpo: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!proibidas.includes(k.toLowerCase())) limpo[k] = v;
  }
  return limpo as T;
}
