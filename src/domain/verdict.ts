import type { RankedPlayer, Method } from '../data/types';
import {
  TIE_EPS,
  NARROW_LEAD,
  CLEAR_LEAD,
  LIMITED_SAMPLE_MATCHES,
  METHOD_NAMES,
} from '../config/constants';
import { displayName, formatScore, formatCount } from './format';
const joinNames = (names: string[]): string =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
export function comparisonVerdict(
  players: RankedPlayer[],
  method: Method,
): { headline: string; detail: string; methodNote: string } | null {
  const sorted = players
    .filter((p) => p.record.methods[method].master !== null)
    .slice()
    .sort(
      (a, b) =>
        b.record.methods[method].master! - a.record.methods[method].master! ||
        a.identity.playerId - b.identity.playerId,
    );
  if (sorted.length < 2) return null;
  const first = sorted[0],
    runner = sorted[1],
    top = first.record.methods[method].master!,
    gap = top - runner.record.methods[method].master!;
  const tied = sorted.filter((p) => top - p.record.methods[method].master! < TIE_EPS - 1e-12),
    name = (p: RankedPlayer) => displayName(p.identity),
    score = (p: RankedPlayer) => formatScore(p.record.methods[method].master);
  const leadSize =
    gap < NARROW_LEAD ? 'a narrow lead' : gap < CLEAR_LEAD ? 'a solid lead' : 'a clear lead';
  const remainder = sorted.slice(2);
  const headline =
    tied.length > 1
      ? `${joinNames(tied.map(name))} are level on overall pressure performance (${score(first)}); no single leader.`
      : `${name(first)} leads on overall pressure performance (${score(first)}), ahead of ${name(runner)} (${score(runner)}) — ${leadSize}${remainder.length ? `; followed by ${remainder.map((p) => `${name(p)} (${score(p)})`).join(', ')}` : ''}.`;
  const clauses: string[] = [];
  for (const metric of ['realtimeAvg', 'individualAvg'] as const) {
    const valid = sorted.filter((p) => p.record.supporting[metric] !== null);
    if (valid.length < 2) continue;
    const max = Math.max(...valid.map((p) => p.record.supporting[metric]!));
    const metricLeaders = valid.filter(
      (p) => p.record.supporting[metric]!.toFixed(1) === max.toFixed(1),
    );
    if (metric === 'realtimeAvg') {
      if (
        tied.length === 1 &&
        metricLeaders.some((p) => p.identity.playerId === first.identity.playerId)
      )
        clauses.push(
          `${name(first)} also has ${metricLeaders.length > 1 ? 'joint-strongest' : 'the strongest'} Realtime Performance.`,
        );
      else
        clauses.push(
          `${joinNames(metricLeaders.map(name))} ${metricLeaders.length > 1 ? 'share the strongest' : 'has the stronger'} Realtime Performance (${formatScore(max)}).`,
        );
    } else {
      if (
        tied.length === 1 &&
        metricLeaders.some((p) => p.identity.playerId === first.identity.playerId)
      )
        clauses.push(
          `${name(first)} also has ${metricLeaders.length > 1 ? 'joint-highest' : 'the highest'} Individual Player Score, indicating stronger underlying Class/Form.`,
        );
      else
        clauses.push(
          `${joinNames(metricLeaders.map(name))} ${metricLeaders.length > 1 ? 'share the highest' : 'has the higher'} Individual Player Score (${formatScore(max)}), indicating stronger underlying Class/Form.`,
        );
    }
  }
  if (first.record.matches !== null && runner.record.matches !== null) {
    const evidence = (p: RankedPlayer) =>
      `${formatCount(p.record.matches)} matches${p.record.effectiveSampleSize === null ? '' : ` (effective sample ${formatScore(p.record.effectiveSampleSize)})`}`;
    clauses.push(`Based on ${evidence(first)} versus ${evidence(runner)} for ${name(runner)}.`);
  }
  for (const p of sorted)
    if (p.record.matches !== null && p.record.matches < LIMITED_SAMPLE_MATCHES)
      clauses.push(
        `${name(p)} has only ${p.record.matches} ${p.record.matches === 1 ? 'match' : 'matches'}, so their score is less certain.`,
      );
  return { headline, detail: clauses.join(' '), methodNote: `(${METHOD_NAMES[method]})` };
}
