import { useData } from '../../data/DataProvider';
import type { Identity, Role, Method } from '../../data/types';
import { formatCount, formatScore, ordinal, roleLabel } from '../../domain/format';
import { DUAL_FOOTNOTE } from '../../config/constants';
export function DualRolePanel({
  identity,
  role,
  method,
  onChange,
}: {
  identity: Identity;
  role: Role;
  method: Method;
  onChange: (role: Role) => void;
}) {
  const { records } = useData();
  const available = identity.roles.filter((r) => {
    const v = records.get(`${r}:${identity.playerId}`)?.methods[method].master;
    return v !== null && v !== undefined;
  });
  if (available.length < 2) return null;
  return (
    <section className="card dual-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TWO ROLES. TWO PERSPECTIVES.</span>
          <h2>Batting & Bowling view</h2>
        </div>
      </div>
      <div className="dual-cards">
        {available.map((r) => {
          const record = records.get(`${r}:${identity.playerId}`)!,
            score = record.methods[method];
          return (
            <button
              key={r}
              className={`dual-card ${r} ${r === role ? 'active' : ''}`}
              aria-pressed={r === role}
              onClick={() => onChange(r)}
            >
              <span>{roleLabel(r)}</span>
              <strong>
                {formatScore(score.master)}
                <small>/100</small>
              </strong>
              <span>
                {score.rankDisplay} ·{' '}
                {score.percentile === null ? '—' : `${ordinal(score.percentile)} percentile`}
              </span>
              <small>{formatCount(record.matches)} matches analysed</small>
            </button>
          );
        })}
      </div>
      <p className="panel-footnote">{DUAL_FOOTNOTE}</p>
    </section>
  );
}
