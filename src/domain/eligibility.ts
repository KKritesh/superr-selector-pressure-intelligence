import type { Identity, Players } from '../data/types';
import { EXCLUDED_NATIONALITIES } from '../config/constants';

const excludedNationalities = new Set<string>(
  EXCLUDED_NATIONALITIES.map((nationality) => nationality.trim().toLowerCase()),
);

export function isPlayerConsidered(identity: Identity): boolean {
  return !excludedNationalities.has((identity.nationality ?? '').trim().toLowerCase());
}

// Apply the rule once, before any feature receives player lookup/search/ranking data.
// Source objects and their approved scores, ranks and percentiles remain untouched.
export function playersForConsideration(source: Players): Players {
  const identities = source.identities.filter(isPlayerConsidered);
  const allowedIds = new Set(identities.map((identity) => identity.playerId));
  return {
    identities,
    records: source.records.filter((record) => allowedIds.has(record.playerId)),
  };
}
