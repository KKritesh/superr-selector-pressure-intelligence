import fs from 'node:fs';
import { isPlayerConsidered, playersForConsideration } from '../../src/domain/eligibility';
import { createSearchIndex, searchPlayers } from '../../src/domain/search';
import type { Identity, Players } from '../../src/data/types';

const source = JSON.parse(fs.readFileSync('public/data/players.json', 'utf8')) as Players;
const fixture = (nationality: string | null, name = 'Example'): Identity => ({
  playerId: 1,
  name,
  nationality,
  nameSource: 'test',
  activeLast2Years: null,
  hasNameCollision: false,
  roles: ['batter'],
});

describe('dashboard nationality exclusion', () => {
  it.each(['Pakistan', ' pakistan ', 'PAKISTAN'])(
    'excludes the source nationality %s',
    (nationality) => {
      expect(isPlayerConsidered(fixture(nationality))).toBe(false);
    },
  );
  it('uses nationality only and retains other and missing nationalities', () => {
    for (const country of ['India', 'Afghanistan', 'United Arab Emirates', null, '']) {
      expect(isPlayerConsidered(fixture(country, 'Babar Azam'))).toBe(true);
    }
  });
  it('removes every Pakistan identity and both role records without changing any source values', () => {
    const before = JSON.stringify(source);
    const considered = playersForConsideration(source);
    const excluded = new Set(
      source.identities.filter((p) => p.nationality === 'Pakistan').map((p) => p.playerId),
    );
    expect(excluded.size).toBeGreaterThan(0);
    expect(considered.identities).toHaveLength(source.identities.length - excluded.size);
    expect(considered.identities.every((p) => p.nationality !== 'Pakistan')).toBe(true);
    expect(considered.records.every((r) => !excluded.has(r.playerId))).toBe(true);
    const retainedSource = source.records.filter((r) => !excluded.has(r.playerId));
    expect(considered.records).toEqual(retainedSource);
    for (let i = 0; i < retainedSource.length; i++)
      expect(considered.records[i]).toBe(retainedSource[i]);
    expect(JSON.stringify(source)).toBe(before);
  });
  it('does not offer excluded names or IDs in searches under either method or role', () => {
    const considered = playersForConsideration(source);
    const index = createSearchIndex(considered.identities, considered.records);
    for (const method of ['B', 'C'] as const)
      for (const role of ['batter', 'bowler'] as const) {
        for (const id of [2485, 2490, 5979]) {
          expect(searchPlayers(index, String(id), method, role)).toEqual([]);
        }
        expect(searchPlayers(index, 'Babar Azam', method, role)).toEqual([]);
      }
  });
});
