import fs from 'node:fs';
import { playersForConsideration } from '../../src/domain/eligibility';
import { reviseRankings } from '../../src/domain/rankings';
import type { Players, RoleRecord } from '../../src/data/types';

const source = JSON.parse(fs.readFileSync('public/data/players.json', 'utf8')) as Players;

function fixture(values: (number | null)[]): Players {
  return {
    identities: values.map((_, i) => ({
      playerId: i + 1,
      name: `Player ${i + 1}`,
      nameSource: 'fixture',
      nationality: 'India',
      activeLast2Years: null,
      hasNameCollision: false,
      roles: ['batter'],
    })),
    records: values.map(
      (master, i): RoleRecord => ({
        playerId: i + 1,
        role: 'batter',
        matches: 10,
        firstMatchDate: null,
        lastMatchDate: null,
        effectiveSampleSize: 8,
        recencyWeightedAvg: master,
        benchmark: 25,
        methods: {
          B: {
            master,
            rank: 10 + i * 5,
            rankDisplay: `#${10 + i * 5}`,
            isTied: false,
            percentile: 75,
          },
          C: {
            master,
            rank: 10 + i * 5,
            rankDisplay: `#${10 + i * 5}`,
            isTied: false,
            percentile: 75,
            consistencyPenalty: 0,
            weightedSd: 0,
          },
        },
        supporting: { realtimeAvg: 30, individualAvg: 40, realtimeN: 10, individualN: 10 },
        source: { workbook: 'fixture', sheetB: 'B', sheetC: 'C', rowB: i + 2, rowC: i + 2 },
      }),
    ),
  };
}

describe('rankings for the remaining consideration pool', () => {
  it('independently verifies every remaining rank and percentile under both methods and roles', () => {
    const before = JSON.stringify(source);
    const considered = playersForConsideration(source);
    const { players, population } = reviseRankings(considered);
    for (const method of ['B', 'C'] as const)
      for (const role of ['batter', 'bowler'] as const) {
        const originalPool = considered.records.filter(
          (r) => r.role === role && r.methods[method].master !== null,
        );
        expect(population[method][role]).toBe(originalPool.length);
        const ranked = players.records.filter(
          (r) => r.role === role && r.methods[method].master !== null,
        );
        for (const record of ranked) {
          const score = record.methods[method].master!;
          const higher = originalPool.filter(
            (r) => r.methods[method].master! > score + 1e-9,
          ).length;
          const lower = originalPool.filter((r) => r.methods[method].master! < score - 1e-9).length;
          expect(record.methods[method].rank).toBe(higher + 1);
          expect(record.methods[method].percentile).toBe(
            Math.floor((100 * lower) / (originalPool.length - 1) + 0.5),
          );
          const raw = source.records.find(
            (r) => r.playerId === record.playerId && r.role === role,
          )!;
          expect(record.methods[method].master).toBe(raw.methods[method].master);
          expect(record.sourceMethods![method]).toEqual(raw.methods[method]);
          expect(record.supporting).toEqual(raw.supporting);
        }
      }
    expect(JSON.stringify(source)).toBe(before);
  });
  it('removes rank gaps: Jasprit Bumrah moves from source #4 to #2 among 605 bowlers', () => {
    const result = reviseRankings(playersForConsideration(source));
    const bumrah = result.players.records.find((r) => r.playerId === 2933 && r.role === 'bowler')!;
    expect(result.population.B.bowler).toBe(605);
    expect(result.population.B.batter).toBe(827);
    expect(bumrah.methods.B.rankDisplay).toBe('#2');
    expect(bumrah.sourceMethods!.B.rankDisplay).toBe('#4');
  });
  it('handles ties, zero scores and null scores using the scored pool only', () => {
    const result = reviseRankings(fixture([50, 50, 0, null]));
    expect(result.population.B.batter).toBe(3);
    expect(result.players.records.map((r) => r.methods.B.rankDisplay)).toEqual([
      'T-1',
      'T-1',
      '#3',
      '—',
    ]);
    expect(result.players.records.map((r) => r.methods.B.percentile)).toEqual([50, 50, 0, null]);
    expect(result.players.records[2].methods.B.master).toBe(0);
  });
  it('handles an empty or single-player pool', () => {
    expect(reviseRankings(fixture([])).population.B.batter).toBe(0);
    const only = reviseRankings(fixture([0])).players.records[0].methods.B;
    expect(only.rank).toBe(1);
    expect(only.percentile).toBeNull();
  });
  it('uses stable source order for score ties within tolerance', () => {
    const result = reviseRankings(fixture([30, 30 + 5e-10, 10]));
    expect(result.players.records.map((r) => r.methods.B.rankDisplay)).toEqual([
      'T-1',
      'T-1',
      '#3',
    ]);
    expect(result.players.records.map((r) => r.methods.B.percentile)).toEqual([50, 50, 0]);
  });
  it('updates method rank changes and preserves original source provenance on repeat derivation', () => {
    const data = fixture([30, 20, 10]);
    data.records[0].methods.C.master = 5;
    const revised = reviseRankings(data).players;
    const first = revised.records[0];
    expect(first.methods.B.rank).toBe(1);
    expect(first.methods.C.rank).toBe(3);
    expect(first.methods.C.rankDiffVsB).toBe(-2);
    expect(first.sourceMethods!.B.rank).toBe(10);
    expect(reviseRankings(revised).players).toEqual(revised);
  });
});
