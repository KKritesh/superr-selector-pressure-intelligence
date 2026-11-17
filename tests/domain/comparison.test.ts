import { comparisonVerdict } from '../../src/domain/verdict';
import { leaders } from '../../src/domain/leaders';
import { normalizeComparison } from '../../src/domain/comparison';
import type { RankedPlayer } from '../../src/data/types';
const player = (
  id: number,
  master: number | null,
  matches: number | null = 12,
  ess: number | null = 8,
  realtime: number | null = 30,
  individual: number | null = 40,
): RankedPlayer => ({
  identity: {
    playerId: id,
    name: `Player ${id}`,
    nameSource: 'fixture',
    nationality: null,
    activeLast2Years: null,
    hasNameCollision: false,
    roles: ['batter'],
  },
  record: {
    playerId: id,
    role: 'batter',
    matches,
    effectiveSampleSize: ess,
    firstMatchDate: null,
    lastMatchDate: null,
    recencyWeightedAvg: null,
    benchmark: null,
    methods: {
      B: { master, rank: id, rankDisplay: `#${id}`, isTied: false, percentile: 80 },
      C: {
        master: master === null ? null : master - 2,
        rank: id,
        rankDisplay: `#${id}`,
        isTied: false,
        percentile: 80,
      },
    },
    supporting: {
      realtimeAvg: realtime,
      individualAvg: individual,
      realtimeN: 12,
      individualN: 12,
    },
    source: { workbook: 'fixture', sheetB: 'B', sheetC: 'C', rowB: 2, rowC: 2 },
  },
});
describe('leader badges at displayed precision', () => {
  it('handles a single max, ties, missing values and zero without changing arrays', () => {
    expect([...leaders([41.8, 39.3, 39.3])]).toEqual([0]);
    expect([...leaders([39.3, 39.3, 20])]).toEqual([0, 1]);
    expect([...leaders([39.31, 39.34])]).toEqual([0, 1]);
    expect([...leaders([null, 0])]).toEqual([]);
    expect([...leaders([null, 0, 0])]).toEqual([1, 2]);
    expect([...leaders([null, null])]).toEqual([]);
    expect([...leaders([2, 1, 3], 0, true)]).toEqual([1]);
  });
});
describe('deterministic comparison verdict', () => {
  it('names a single leader, a narrow gap, the separate supporting leaders and method', () => {
    const inputs = [player(1, 40, 12, 8, 50, 30), player(2, 39.5, 20, 10, 40, 60)];
    const before = JSON.stringify(inputs),
      v = comparisonVerdict(inputs, 'B')!;
    expect(v.headline).toBe(
      'Player 1 leads on overall pressure performance (40.0), ahead of Player 2 (39.5) — a narrow lead.',
    );
    expect(v.detail).toContain('Player 1 also has the strongest Realtime Performance.');
    expect(v.detail).toContain(
      'Player 2 has the higher Individual Player Score (60.0), indicating stronger underlying Class/Form.',
    );
    expect(v.detail).toContain(
      'Based on 12 matches (effective sample 8.0) versus 20 matches (effective sample 10.0) for Player 2.',
    );
    expect(v.methodNote).toBe('(Option B — Bayesian)');
    expect(JSON.stringify(inputs)).toBe(before);
    expect(comparisonVerdict(inputs, 'B')).toEqual(v);
  });
  it('uses solid and clear boundaries and includes the full five-player order', () => {
    expect(comparisonVerdict([player(1, 40), player(2, 39)], 'B')!.headline).toContain(
      'a solid lead',
    );
    const v = comparisonVerdict(
      [player(5, 20), player(4, 25), player(3, 30), player(2, 37), player(1, 40)],
      'C',
    )!;
    expect(v.headline).toContain(
      'a clear lead; followed by Player 3 (28.0), Player 4 (23.0), Player 5 (18.0)',
    );
    expect(v.methodNote).toContain('Option C');
  });
  it('treats gaps below 0.05 as a tie, including multiple co-leaders', () => {
    const v = comparisonVerdict([player(1, 40), player(2, 39.96), player(3, 39.97)], 'B')!;
    expect(v.headline).toContain(
      'are level on overall pressure performance (40.0); no single leader.',
    );
    expect(v.headline).toContain('Player 1, Player 3 and Player 2');
  });
  it('includes limited-sample cautions and omits missing metric / ESS clauses', () => {
    const v = comparisonVerdict(
      [player(1, 40, 1, null, null, null), player(2, 38, 3, null, null, null)],
      'B',
    )!;
    expect(v.detail).not.toContain('effective sample');
    expect(v.detail).not.toContain('Realtime');
    expect(v.detail).not.toContain('Class/Form');
    expect(v.detail).toContain('Player 1 has only 1 match, so their score is less certain.');
    expect(v.detail).toContain('Player 2 has only 3 matches, so their score is less certain.');
  });
  it('keeps zeros valid and returns no verdict below two valid scores', () => {
    expect(comparisonVerdict([player(1, 0), player(2, 0)], 'B')!.headline).toContain(
      '(0.0); no single leader',
    );
    expect(comparisonVerdict([player(1, 0), player(2, null)], 'B')).toBeNull();
  });
  it('does not classify an exact 0.05-point gap as a tie', () => {
    expect(comparisonVerdict([player(1, 41.8), player(2, 41.75)], 'B')!.headline).toContain(
      'leads on overall',
    );
  });
});
describe('comparison URL normalization', () => {
  it('drops invalid IDs, duplicates, ineligible roles and excess players', () => {
    const ps = Array.from({ length: 8 }, (_, i) => player(i + 1, 30)),
      records = new Map(ps.map((p) => [`batter:${p.identity.playerId}`, p.record]));
    expect(normalizeComparison('1,1,abc,-2,99,2,3,4,5,6,7,8', 'batter', 'B', records)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(normalizeComparison('1,2', 'bowler', 'B', records)).toEqual([]);
  });
});
