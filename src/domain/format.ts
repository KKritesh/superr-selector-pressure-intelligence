import type { Identity, Role } from '../data/types';
export const formatScore = (n: number | null | undefined): string =>
  n === null || n === undefined ? '—' : n.toFixed(1);
export const formatCount = (n: number | null): string =>
  n === null ? '—' : n.toLocaleString('en-IN');
export function ordinal(n: number): string {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th')}`;
}
export function formatDate(s: string | null, short = false): string {
  if (!s) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    ...(short ? {} : { day: 'numeric' }),
    month: 'short',
    year: short ? '2-digit' : 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${s}T00:00:00Z`));
}
export const roleLabel = (r: Role): string => (r === 'batter' ? 'Batter' : 'Bowler');
export const rolePlural = (r: Role): string => (r === 'batter' ? 'batters' : 'bowlers');
export function displayName(p: Identity): string {
  return p.hasNameCollision
    ? `${p.name} · ${p.nationality ?? 'Country unavailable'} · ID ${p.playerId}`
    : p.name;
}
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
