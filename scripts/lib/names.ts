import type { Identity } from '../../src/data/types';
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
export function markCollisions(identities: Identity[]): { name: string; playerIds: number[] }[] {
  const groups = new Map<string, Identity[]>();
  for (const p of identities)
    groups.set(normalize(p.name), [...(groups.get(normalize(p.name)) ?? []), p]);
  return [...groups.entries()]
    .filter(([, ps]) => ps.length > 1)
    .map(([name, ps]) => {
      ps.forEach((p) => {
        p.hasNameCollision = true;
      });
      return { name, playerIds: ps.map((p) => p.playerId) };
    });
}
