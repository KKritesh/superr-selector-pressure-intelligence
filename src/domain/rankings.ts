import type { Meta, Players } from '../data/types';
import { SCORE_TIE_EPS } from '../config/constants';

// Re-rank a consideration pool without changing source records or pressure scores.
export function reviseRankings(considered: Players): {
  players: Players;
  population: Meta['population'];
} {
  const records = considered.records.map((record) => ({
    ...record,
    sourceMethods: record.sourceMethods ?? record.methods,
    methods: { B: { ...record.methods.B }, C: { ...record.methods.C } },
  }));
  const names = new Map(considered.identities.map((p) => [p.playerId, p.name]));
  const population: Meta['population'] = {
    B: { batter: 0, bowler: 0 },
    C: { batter: 0, bowler: 0 },
  };
  for (const method of ['B', 'C'] as const) {
    for (const role of ['batter', 'bowler'] as const) {
      const pool = records.filter((record) => record.role === role);
      for (const record of pool) {
        Object.assign(record.methods[method], {
          rank: null,
          rankDisplay: '—',
          percentile: null,
          isTied: false,
        });
      }
      const scored = pool
        .filter((record) => record.methods[method].master !== null)
        .sort((a, b) => {
          const difference = b.methods[method].master! - a.methods[method].master!;
          if (Math.abs(difference) > SCORE_TIE_EPS) return difference;
          return (
            (a.sourceMethods[method].rank ?? Infinity) -
              (b.sourceMethods[method].rank ?? Infinity) ||
            (names.get(a.playerId) ?? '').localeCompare(names.get(b.playerId) ?? '') ||
            a.playerId - b.playerId
          );
        });
      const count = scored.length;
      population[method][role] = count;
      for (let start = 0; start < count; ) {
        let end = start + 1;
        while (
          end < count &&
          Math.abs(scored[end].methods[method].master! - scored[start].methods[method].master!) <=
            SCORE_TIE_EPS
        )
          end++;
        const rank = start + 1;
        const isTied = end - start > 1;
        const percentile = count < 2 ? null : Math.floor((100 * (count - end)) / (count - 1) + 0.5);
        for (let i = start; i < end; i++) {
          Object.assign(scored[i].methods[method], {
            rank,
            rankDisplay: isTied ? `T-${rank}` : `#${rank}`,
            percentile,
            isTied,
          });
        }
        start = end;
      }
    }
  }
  for (const record of records) {
    const b = record.methods.B.rank,
      c = record.methods.C.rank;
    record.methods.C.rankDiffVsB = b === null || c === null ? null : b - c;
  }
  return { players: { identities: considered.identities, records }, population };
}
