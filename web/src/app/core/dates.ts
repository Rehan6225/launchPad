/**
 * Local-calendar date helpers. Everything is a 'YYYY-MM-DD' string;
 * never use toISOString() for days — it converts to UTC and can shift the date.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toIso(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

/** Monday of the week containing `iso`. */
export function mondayOf(iso: string): string {
  const offset = (parseIso(iso).getDay() + 6) % 7; // Monday = 0
  return addDays(iso, -offset);
}

export function daysBetween(fromIso: string, toIsoDay: string): number {
  return Math.round((parseIso(toIsoDay).getTime() - parseIso(fromIso).getTime()) / 86_400_000);
}
