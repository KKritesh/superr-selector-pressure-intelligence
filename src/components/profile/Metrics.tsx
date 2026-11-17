import type { Role, RoleRecord, Method } from '../../data/types';
import { formatCount, formatScore, ordinal, rolePlural } from '../../domain/format';
import { TOOLTIPS, LIMITED_SAMPLE_MATCHES } from '../../config/constants';
import { InfoTooltip } from '../common/InfoTooltip';
export function Value({ value, digits = true }: { value: number | null; digits?: boolean }) {
  return (
    <span title={value === null ? TOOLTIPS.missing : undefined}>
      {digits ? formatScore(value) : formatCount(value)}
    </span>
  );
}
export function ScoreBar({
  value,
  role,
  benchmark,
}: {
  value: number | null;
  role: Role;
  benchmark?: number | null;
}) {
  return (
    <div
      className={`score-bar ${role}`}
      role="img"
      aria-label={
        value === null ? 'Not available in source data' : `${formatScore(value)} out of 100`
      }
    >
      <div
        className="score-fill"
        style={{ width: `${value === null ? 0 : Math.max(0, Math.min(100, value))}%` }}
      />
      {benchmark !== undefined && benchmark !== null && (
        <span
          className="benchmark-marker"
          style={{ left: `${benchmark}%` }}
          title={`Role benchmark ${formatScore(benchmark)}`}
        />
      )}
    </div>
  );
}
export function MetricBar({
  label,
  value,
  role,
  tooltip,
  subtitle,
}: {
  label: string;
  value: number | null;
  role: Role;
  tooltip: string;
  subtitle?: string;
}) {
  return (
    <div className="metric-bar">
      <div className="metric-bar-heading">
        <div>
          <h3>
            {label} <InfoTooltip text={tooltip} label={`About ${label}`} />
          </h3>
          {subtitle && <span className="metric-caption">{subtitle}</span>}
        </div>
        <strong>
          <Value value={value} />
        </strong>
      </div>
      <ScoreBar value={value} role={role} />
      <div className="bar-scale">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}
export function RankPercentile({
  record,
  method,
  population,
}: {
  record: RoleRecord;
  method: Method;
  population: number;
}) {
  const score = record.methods[method];
  return (
    <>
      <div className="rank-line">
        <strong title={score.isTied ? 'Tied' : undefined}>{score.rankDisplay}</strong>
        <span>
          of {formatCount(population)} {rolePlural(record.role)}
        </span>
      </div>
      <p className="percentile-text">
        {score.percentile === null ? '—' : `${ordinal(score.percentile)} percentile`}
      </p>
      <ScoreBar value={score.percentile} role={record.role} />
      <small className="metric-caption">
        {score.percentile === null
          ? TOOLTIPS.missing
          : `Higher than ${score.percentile}% of ${rolePlural(record.role)}`}
      </small>
    </>
  );
}
export function ScoreCard({
  record,
  method,
  population,
}: {
  record: RoleRecord;
  method: Method;
  population: number;
}) {
  return (
    <div className={`profile-metrics ${record.role}`}>
      <section className="card metric-tile master-tile">
        <div className="metric-label">
          Master Pressure Score{' '}
          <InfoTooltip text={TOOLTIPS.master} label="About Master Pressure Score" />
        </div>
        <div className="master-numeral">
          <Value value={record.methods[method].master} />
          <span>/100</span>
        </div>
        <ScoreBar
          value={record.methods[method].master}
          role={record.role}
          benchmark={record.benchmark}
        />
        <small className="metric-caption benchmark-caption">
          <span /> Role benchmark {formatScore(record.benchmark)}
        </small>
      </section>
      <section className="card metric-tile">
        <div className="metric-label">
          Rank & Percentile <InfoTooltip text={TOOLTIPS.rank} label="About rank and percentile" />
        </div>
        <RankPercentile record={record} method={method} population={population} />
      </section>
      <section className="card metric-tile">
        <div className="metric-label">
          Matches Analysed <InfoTooltip text={TOOLTIPS.matches} label="About Matches Analysed" />
        </div>
        <div className="matches-numeral">
          <Value value={record.matches} digits={false} />
        </div>
        <p className="metric-caption">Qualifying T20 & T20I performances</p>
        {record.matches !== null && record.matches < LIMITED_SAMPLE_MATCHES && (
          <span className="chip limited" title={TOOLTIPS.limited}>
            Limited sample
          </span>
        )}
      </section>
    </div>
  );
}
