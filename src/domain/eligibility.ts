import type { Identity, Players, Role, RoleRecord } from '../data/types';
import { EXCLUDED_NATIONALITIES, MIN_ROLE_MATCHES } from '../config/constants';

const excludedNationalities = new Set<string>(
  EXCLUDED_NATIONALITIES.map((nationality) => nationality.trim().toLowerCase()),
);

export function isPlayerConsidered(identity: Identity): boolean {
  return !excludedNationalities.has((identity.nationality ?? '').trim().toLowerCase());
}

export function isRoleConsidered(record: RoleRecord): boolean {
  return record.matches !== null && record.matches >= MIN_ROLE_MATCHES;
}

// Apply the rule once, before any feature receives player lookup/search/ranking data.
// Source objects and their approved scores, ranks and percentiles remain untouched.
export function playersForConsideration(source: Players): Players {
  const nationalityEligible = source.identities.filter(isPlayerConsidered);
  const allowedIds = new Set(nationalityEligible.map((identity) => identity.playerId));
  const records = source.records.filter(
    (record) => allowedIds.has(record.playerId) && isRoleConsidered(record),
  );
  const rolesByPlayer = new Map<number, Set<Role>>();
  for (const record of records) {
    const roles = rolesByPlayer.get(record.playerId) ?? new Set<Role>();
    roles.add(record.role);
    rolesByPlayer.set(record.playerId, roles);
  }
  const identities = nationalityEligible.flatMap((identity) => {
    const available = rolesByPlayer.get(identity.playerId);
    if (!available) return [];
    const roles = (['batter', 'bowler'] as const).filter((role) => available.has(role));
    return [{ ...identity, roles }];
  });
  return {
    identities,
    records,
  };
}
