import type { MethodScore } from '../../src/data/types';
import { SCORE_TIE_EPS } from '../../src/config/constants';
export function weightedMean(rows: { weight: number; value: number | null }[]): {
  average: number | null;
  count: number;
} {
  const valid = rows.filter((r) => r.value !== null);
  const sum = valid.reduce((a, r) => a + r.weight, 0);
  return {
    average: sum > 0 ? valid.reduce((a, r) => a + r.weight * r.value!, 0) / sum : null,
    count: valid.length,
  };
}
export function addRanks(scores: MethodScore[]): void {
  const n = scores.length;
  for (const s of scores) {
    if (s.master === null) {
      s.percentile = null;
      s.rankDisplay = s.rank === null ? '—' : `#${s.rank}`;
      continue;
    }
    const lower = scores.filter(
      (o) => o.master !== null && o.master < s.master! - SCORE_TIE_EPS,
    ).length;
    const ties = scores.filter(
      (o) => o.master !== null && Math.abs(o.master - s.master!) <= SCORE_TIE_EPS,
    );
    s.percentile = n < 2 ? null : Math.floor((100 * lower) / (n - 1) + 0.5);
    s.isTied = ties.length > 1;
    const ranks = ties.map((o) => o.rank).filter((r): r is number => r !== null);
    s.rankDisplay = s.rank === null ? '—' : s.isTied ? `T-${Math.min(...ranks)}` : `#${s.rank}`;
  }
}
