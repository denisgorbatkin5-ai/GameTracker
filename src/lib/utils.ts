export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function steamHeader(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export function steamCapsule(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_616x353.jpg`;
}

export function steamLibrary(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
}

export function steamBackground(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/page_bg.jpg`;
}

export function yearOf(date: string | null): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatMonthYear(value: string | null): string {
  if (!value) return 'неизвестно';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'неизвестно';
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function formatHours(value: number | null): string {
  if (value === null || value === undefined) return '—';
  if (value === 0) return '0 ч';
  return `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч`;
}

export function relativeTime(value: string): string {
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return '';
  const diff = Date.now() - date;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'только что';
  if (diff < hour) return `${Math.floor(diff / minute)} мин назад`;
  if (diff < day) return `${Math.floor(diff / hour)} ч назад`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} дн назад`;
  return formatDate(value);
}

export function initials(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9а-яА-Я]/g, '');
  return (clean.slice(0, 2) || 'GT').toUpperCase();
}

export function pluralize(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export const TIER_PRESETS: { key: string; label: string; color: string }[] = [
  { key: 's', label: 'S', color: '#f43f5e' },
  { key: 'a', label: 'A', color: '#fb923c' },
  { key: 'b', label: 'B', color: '#facc15' },
  { key: 'c', label: 'C', color: '#38bdf8' },
];

export const TIER_PALETTE = [
  '#f43f5e',
  '#fb923c',
  '#facc15',
  '#38bdf8',
  '#34d399',
  '#a78bfa',
  '#f472b6',
  '#64748b',
];
