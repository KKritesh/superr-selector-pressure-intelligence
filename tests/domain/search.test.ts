import fs from 'node:fs';
import { createSearchIndex, searchPlayers, bestRole } from '../../src/domain/search';
import type { Players } from '../../src/data/types';
const players = JSON.parse(fs.readFileSync('public/data/players.json', 'utf8')) as Players;
const index = createSearchIndex(players.identities, players.records);
describe('real-data player search', () => {
  it('matches partial names and exact IDs and chooses the better role percentile', () => {
    const p = searchPlayers(index, 'kohli', 'B')[0];
    expect(p.identity.name).toBe('Virat Kohli');
    expect(searchPlayers(index, String(p.identity.playerId), 'C')[0].identity.playerId).toBe(
      p.identity.playerId,
    );
    const role = bestRole(p, 'B');
    expect(p.records[role]).toBeDefined();
  });
  it('disambiguates same-name IDs and filters to the selected role', () => {
    expect(
      searchPlayers(index, 'Basil Hameed', 'B')
        .map((p) => p.identity.playerId)
        .sort((a, b) => a - b),
    ).toEqual([8638, 39444]);
    expect(
      searchPlayers(index, 'Basil Hameed', 'B').every((p) => p.identity.hasNameCollision),
    ).toBe(true);
    expect(
      searchPlayers(index, 'ali', 'B', 'bowler').every((p) => p.records.bowler !== undefined),
    ).toBe(true);
    expect(searchPlayers(index, 'no such player', 'B')).toEqual([]);
  });
  it('responds within the 100ms target with a full in-memory index', () => {
    const start = performance.now();
    for (let i = 0; i < 20; i++) searchPlayers(index, 'sh', 'C');
    expect((performance.now() - start) / 20).toBeLessThan(100);
  });
});
