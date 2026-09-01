/**
 * Conversão entre string ISO 'yyyy-mm-dd' (formato usado pelos services do
 * app) e Date (formato que o p-datepicker do PrimeNG espera).
 */
export function parseIsoDate(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function formatIsoDate(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
