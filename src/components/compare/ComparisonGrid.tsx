import { CountryFlag } from '../common/CountryFlag';
import { Link } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';
import type { RankedPlayer, Role, Method } from '../../data/types';
import { formatScore, formatCount, displayName, ordinal } from '../../domain/format';
import { playerURL } from '../../routes';
import { leaders } from '../../domain/leaders';
import { ScoreBar } from '../profile/Metrics';
import { InfoTooltip } from '../common/InfoTooltip';
import { TOOLTIPS } from '../../config/constants';
interface Metric {
  label: string;
  tooltip: string;
  values: (number | null)[];
  bar?: boolean;
  neutral?: boolean;
  lower?: boolean;
  precision?: number;
  render?: (p: RankedPlayer) => ReactNode;
}
export function ComparisonGrid({
  players,
  role,
  method,
}: {
  players: RankedPlayer[];
  role: Role;
  method: Method;
}) {
  const metrics: Metric[] = [
    {
      label: 'Master Pressure Score',
      tooltip: TOOLTIPS.master,
      values: players.map((p) => p.record.methods[method].master),
      bar: true,
    },
    {
      label: 'Rank & Percentile',
      tooltip: TOOLTIPS.rank,
      values: players.map((p) =>
        p.record.methods[method].rank === null
          ? null
          : p.record.methods[method].isTied
            ? Number(p.record.methods[method].rankDisplay.replace('T-', ''))
            : p.record.methods[method].rank,
      ),
      lower: true,
      precision: 0,
      render: (p) => (
        <>
          <strong title={p.record.methods[method].isTied ? 'Tied' : undefined}>
            {p.record.methods[method].rankDisplay}
          </strong>
          <small>
            {p.record.methods[method].percentile === null
              ? '—'
              : `${ordinal(p.record.methods[method].percentile!)} percentile`}
          </small>
        </>
      ),
    },
    {
      label: 'Realtime Performance',
      tooltip: TOOLTIPS.realtime,
      values: players.map((p) => p.record.supporting.realtimeAvg),
      bar: true,
    },
    {
      label: 'Individual Player Score',
      tooltip: TOOLTIPS.individual,
      values: players.map((p) => p.record.supporting.individualAvg),
      bar: true,
    },
    {
      label: 'Matches Analysed',
      tooltip: TOOLTIPS.matches,
      values: players.map((p) => p.record.matches),
      neutral: true,
      precision: 0,
    },
    {
      label: 'Effective Sample Size',
      tooltip: TOOLTIPS.ess,
      values: players.map((p) => p.record.effectiveSampleSize),
      neutral: true,
    },
  ];
  const header = (p: RankedPlayer, i: number) => (
    <>
      <span className="series-dot" style={{ background: `var(--series-${i + 1})` }} />
      <Link to={playerURL(p.identity.playerId, role, method)}>{displayName(p.identity)}</Link>
      <span className="compare-country">
        <CountryFlag country={p.identity.nationality} />
      </span>
    </>
  );
  const cell = (metric: Metric, i: number, best: Set<number>) => (
    <>
      <span
        className="comparison-number"
        title={metric.values[i] === null ? TOOLTIPS.missing : undefined}
      >
        {metric.render ? (
          metric.render(players[i])
        ) : (
          <strong>
            {metric.precision === 0 ? formatCount(metric.values[i]) : formatScore(metric.values[i])}
          </strong>
        )}
        {best.has(i) && (
          <span className={metric.neutral ? 'sample-badge' : 'leader-badge'}>
            {metric.neutral ? 'Largest sample' : 'Leader'}
          </span>
        )}
      </span>
      {metric.bar && <ScoreBar value={metric.values[i]} role={role} />}
    </>
  );
  return (
    <>
      <div className={`card comparison-desktop ${players.length === 5 ? 'five-players' : ''}`}>
        <table className="comparison-grid">
          <caption className="sr-only">
            Pressure performance comparison for {players.length} {role}s
          </caption>
          <thead>
            <tr>
              <th scope="col">
                PERFORMANCE SNAPSHOT<small>Same role. Same score scale.</small>
              </th>
              {players.map((p, i) => (
                <th
                  scope="col"
                  key={p.identity.playerId}
                  style={{ '--player-color': `var(--series-${i + 1})` } as CSSProperties}
                >
                  {header(p, i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const best = leaders(metric.values, metric.precision ?? 1, metric.lower);
              return (
                <tr key={metric.label}>
                  <th scope="row">
                    {metric.label}{' '}
                    <InfoTooltip floating text={metric.tooltip} label={`About ${metric.label}`} />
                    {metric.label === 'Individual Player Score' && <small>Class/Form</small>}
                  </th>
                  {players.map((p, i) => (
                    <td key={p.identity.playerId}>{cell(metric, i, best)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="comparison-mobile">
        {metrics.map((metric) => {
          const best = leaders(metric.values, metric.precision ?? 1, metric.lower);
          return (
            <section key={metric.label} className="card comparison-mobile-metric">
              <h2>
                {metric.label}{' '}
                <InfoTooltip floating text={metric.tooltip} label={`About ${metric.label}`} />
              </h2>
              {players.map((p, i) => (
                <div key={p.identity.playerId} className="mobile-metric-player">
                  <div className="mobile-compare-name">{header(p, i)}</div>
                  {cell(metric, i, best)}
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
