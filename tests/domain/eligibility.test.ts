import fs from 'node:fs';
import {
  isPlayerConsidered,
  isRoleConsidered,
  playersForConsideration,
} from '../../src/domain/eligibility';
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
  it('filters nationality and sample size without changing any source records', () => {
    const before = JSON.stringify(source);
    const considered = playersForConsideration(source);
    const excluded = new Set(
      source.identities.filter((p) => p.nationality === 'Pakistan').map((p) => p.playerId),
    );
    expect(excluded.size).toBeGreaterThan(0);
    expect(considered.identities.every((p) => p.nationality !== 'Pakistan')).toBe(true);
    expect(considered.records.every((r) => !excluded.has(r.playerId))).toBe(true);
    const retainedSource = source.records.filter(
      (r) => !excluded.has(r.playerId) && r.matches !== null && r.matches >= 10,
    );
    const retainedIds = new Set(retainedSource.map((r) => r.playerId));
    expect(considered.identities).toHaveLength(retainedIds.size);
    for (const identity of considered.identities) {
      expect(identity.roles).toEqual(
        (['batter', 'bowler'] as const).filter((role) =>
          retainedSource.some((r) => r.playerId === identity.playerId && r.role === role),
        ),
      );
    }
    expect(considered.records).toEqual(retainedSource);
    for (let i = 0; i < retainedSource.length; i++)
      expect(considered.records[i]).toBe(retainedSource[i]);
    expect(JSON.stringify(source)).toBe(before);
  });
  it.each([
    [9, false],
    [10, true],
    [11, true],
    [0, false],
    [null, false],
  ] as const)('applies the sample boundary to %s analysed matches', (matches, expected) => {
    expect(isRoleConsidered({ ...source.records[0], matches })).toBe(expected);
  });
  it('keeps a qualifying role, removes an insufficient role, and drops identities with no qualifying roles', () => {
    const data: Players = {
      identities: [1, 2, 3].map((playerId) => ({
        ...fixture('India'),
        playerId,
        roles: ['batter', 'bowler'],
      })),
      records: [
        { ...source.records[0], playerId: 1, role: 'batter', matches: 10 },
        { ...source.records[0], playerId: 1, role: 'bowler', matches: 9 },
        { ...source.records[0], playerId: 2, role: 'batter', matches: 9 },
        { ...source.records[0], playerId: 2, role: 'bowler', matches: 10 },
        { ...source.records[0], playerId: 3, role: 'batter', matches: 9 },
        { ...source.records[0], playerId: 3, role: 'bowler', matches: null },
      ],
    };
    const before = JSON.stringify(data);
    const considered = playersForConsideration(data);
    expect(considered.identities.map((p) => [p.playerId, p.roles])).toEqual([
      [1, ['batter']],
      [2, ['bowler']],
    ]);
    expect(considered.records.map((r) => [r.playerId, r.role])).toEqual([
      [1, 'batter'],
      [2, 'bowler'],
    ]);
    expect(JSON.stringify(data)).toBe(before);
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
