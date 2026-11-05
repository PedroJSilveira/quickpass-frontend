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

/**
 * Dias de `inicio` (inclusive) até `fim` (exclusivo) como ISO 'yyyy-mm-dd'.
 * Cada dia representa uma diária; a data de devolução não ocupa a agenda.
 */
export function diasEntre(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  const cursor = new Date(inicio + 'T00:00:00Z');
  const limite = new Date(fim + 'T00:00:00Z');
  while (cursor < limite) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

/** Dois intervalos [inicio, fim) se sobrepõem? (devolução e retirada no mesmo dia não conflitam) */
export function intervalosSeSobrepoem(aIni: string, aFim: string, bIni: string, bFim: string): boolean {
  return aIni < bFim && bIni < aFim;
}

/** Semana ISO (seg–dom) de uma data/ISO, no formato 'YYYY-Www'. */
export function semanaIso(dataOuIso: string | Date): string {
  const d = typeof dataOuIso === 'string' ? new Date(dataOuIso) : new Date(dataOuIso.getTime());
  const alvo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dia = alvo.getUTCDay() || 7;
  alvo.setUTCDate(alvo.getUTCDate() + 4 - dia);
  const inicioAno = new Date(Date.UTC(alvo.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((alvo.getTime() - inicioAno.getTime()) / 86400000 + 1) / 7);
  return `${alvo.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

/** Dia seguinte (ISO). */
export function proximoDia(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
