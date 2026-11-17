import { addRanks, weightedMean } from '../../scripts/lib/derive';
import type { MethodScore } from '../../src/data/types';
const score = (master: number | null, rank: number): MethodScore => ({
  master,
  rank,
  percentile: null,
  isTied: false,
  rankDisplay: '',
});
describe('display-only derivations', () => {
  it('uses strictly lower values, half-up rounding, shared ties and source ranks', () => {
    const scores = [score(40, 1), score(30, 2), score(30, 3), score(0, 4)];
    addRanks(scores);
    expect(scores.map((s) => s.percentile)).toEqual([100, 33, 33, 0]);
    expect(scores.map((s) => s.rankDisplay)).toEqual(['#1', 'T-2', 'T-2', '#4']);
    expect(scores.map((s) => s.master)).toEqual([40, 30, 30, 0]);
  });
  it('has no percentile for a single player and preserves missing values', () => {
    const scores = [score(0, 1)];
    addRanks(scores);
    expect(scores[0].percentile).toBeNull();
    const blank = [score(null, 1)];
    addRanks(blank);
    expect(blank[0].master).toBeNull();
  });
  it('excludes null metrics from both weight sums and keeps zero', () => {
    expect(
      weightedMean([
        { weight: 1, value: 0 },
        { weight: 3, value: 40 },
        { weight: 9, value: null },
      ]),
    ).toEqual({ average: 30, count: 2 });
    expect(weightedMean([{ weight: 1, value: null }])).toEqual({ average: null, count: 0 });
  });
});
