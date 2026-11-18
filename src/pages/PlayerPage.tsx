import { CountryFlag } from '../components/common/CountryFlag';
import { useLayoutEffect } from 'react';
import { ScoringMethodBar } from '../components/layout/ScoringMethodBar';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, UserRound } from 'lucide-react';
import { useData } from '../data/DataProvider';
import { useHistory } from '../data/useHistory';
import { useMethod, useRole, useBack, playerURL } from '../routes';
import type { Role, Identity, RoleRecord, Method } from '../data/types';
import { PlayerSearch } from '../components/common/PlayerSearch';
import { RoleSelector } from '../components/common/Selectors';
import { ScoreCard, MetricBar } from '../components/profile/Metrics';
import { MoreDetails } from '../components/profile/MoreDetails';
import { DualRolePanel } from '../components/profile/DualRolePanel';
import { PressureTrendChart } from '../components/profile/PressureTrendChart';
import { ErrorPanel } from '../components/common/States';
import { formIndicator } from '../domain/trend';
import { displayName, formatScore, roleLabel } from '../domain/format';
import { LIMITED_SAMPLE_MATCHES, TOOLTIPS } from '../config/constants';
function PlayerProfile({
  identity,
  record,
  method,
  onRoleChange,
}: {
  identity: Identity;
  record: RoleRecord;
  method: Method;
  onRoleChange: (role: Role) => void;
}) {
  const { meta, records } = useData(),
    { data, error, retry } = useHistory(record.role),
    observations = data?.[record.playerId] ?? [],
    form = data ? formIndicator(observations) : null;
  const dual =
    identity.roles.filter((r) => {
      const value = records.get(`${r}:${identity.playerId}`)?.methods[method].master;
      return value !== null && value !== undefined;
    }).length === 2;
  return (
    <div className={`profile ${record.role}`}>
      <header className="profile-heading">
        <div className="profile-avatar" aria-hidden="true">
          <UserRound size={28} />
        </div>
        <div>
          <span className="eyebrow">KNOW YOUR PLAYER</span>
          <h1
            title={
              identity.nameSource === 'id_fallback'
                ? 'Name not available in source data'
                : undefined
            }
          >
            {displayName(identity)}
          </h1>
          <div className="profile-meta">
            <span>
              <CountryFlag country={identity.nationality} />
            </span>
            <span className={`chip ${record.role}`}>{roleLabel(record.role)}</span>
            {dual && <span className="chip dual">Dual-role Player</span>}
            {record.matches !== null && record.matches < LIMITED_SAMPLE_MATCHES && (
              <span className="chip limited" title={TOOLTIPS.limited}>
                Limited sample
              </span>
            )}
            {identity.activeLast2Years && <span className="chip">Active in last 2 years</span>}
          </div>
        </div>
        <Link
          className="button compare-profile"
          to={`/compare?role=${record.role}&ids=${record.playerId}&m=${method}`}
        >
          Compare player <ArrowUpRight size={16} />
        </Link>
      </header>
      <ScoreCard
        record={record}
        method={method}
        population={meta.population[method][record.role]}
      />
      <section className="card supporting-card">
        <MetricBar
          label="Realtime Performance"
          value={record.supporting.realtimeAvg}
          role={record.role}
          tooltip={TOOLTIPS.realtime}
          subtitle="Supporting metric · Handling the live situation"
        />
        <MetricBar
          label="Individual Player Score"
          value={record.supporting.individualAvg}
          role={record.role}
          tooltip={TOOLTIPS.individual}
          subtitle="Supporting metric · Class/Form"
        />
      </section>
      {form && <div className={`form-indicator ${form.tone}`}>{form.text}</div>}
      {error ? (
        <ErrorPanel inline onRetry={retry} />
      ) : data ? (
        <PressureTrendChart
          key={`${record.playerId}:${record.role}`}
          series={[
            {
              id: record.playerId,
              name: displayName(identity),
              color: record.role === 'batter' ? 'var(--bat-600)' : 'var(--bowl-600)',
              observations,
              matches: record.matches,
            },
          ]}
          reference={record.recencyWeightedAvg}
        />
      ) : (
        <div className="card chart-loading" aria-busy="true">
          <div className="skeleton" />
          Loading match history…
        </div>
      )}
      <DualRolePanel
        identity={identity}
        role={record.role}
        method={method}
        onChange={onRoleChange}
      />
      <MoreDetails record={record} method={method} />
    </div>
  );
}
export default function PlayerPage() {
  const { identities, records, ranked } = useData(),
    [params, setParams] = useSearchParams(),
    [method] = useMethod(),
    role = useRole(),
    navigate = useNavigate(),
    back = useBack();
  const rawId = params.get('id'),
    id = Number(rawId),
    identity = rawId ? identities.get(id) : undefined,
    record = identity ? records.get(`${role}:${id}`) : undefined;
  useLayoutEffect(() => {
    if (rawId) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [rawId]);
  const changeRole = (r: Role) => {
    const next = new URLSearchParams(params);
    next.set('role', r);
    setParams(next);
  };
  return (
    <>
      <button className="back-button" onClick={back}>
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="player-input-bar">
        <PlayerSearch onSelect={(playerId, r) => navigate(playerURL(playerId, r, method))} />
        <RoleSelector
          role={role}
          onChange={changeRole}
          available={identity?.roles.filter((r) => {
            const s = records.get(`${r}:${identity.playerId}`)?.methods[method].master;
            return s !== null && s !== undefined;
          })}
        />
      </div>
      <ScoringMethodBar />
      {rawId && (!identity || !record) ? (
        <section className="card empty-state">
          <UserRound size={32} />
          <h1>{identity ? 'No eligible score for this role' : 'Player not found'}</h1>
          <p>
            {identity
              ? `${identity.name} has no eligible ${roleLabel(role).toLowerCase()} score under the current filters. Select an available role above.`
              : 'Search for a player by name or player ID.'}
          </p>
          <Link className="button" to={`/player?m=${method}`}>
            Search players
          </Link>
        </section>
      ) : identity && record ? (
        <PlayerProfile
          identity={identity}
          record={record}
          method={method}
          onRoleChange={changeRole}
        />
      ) : (
        <section className="player-empty">
          <div className="page-intro">
            <span className="eyebrow">A CLOSER LOOK AT THE EVIDENCE</span>
            <h1>Know Your Player</h1>
            <p>
              Search above to explore a player's performance under pressure, or start with a leading
              performer.
            </p>
          </div>
          <div className="quick-pick-columns">
            {(['batter', 'bowler'] as const).map((r) => (
              <section key={r} className={`card quick-picks ${r}`}>
                <h2>Leading {r === 'batter' ? 'batters' : 'bowlers'}</h2>
                {ranked[method][r].slice(0, 5).map(({ identity: p, record: rRecord }) => (
                  <Link to={playerURL(p.playerId, r, method)} key={p.playerId}>
                    <span>
                      <strong>{displayName(p)}</strong>
                      <small>
                        <CountryFlag country={p.nationality} />
                      </small>
                    </span>
                    <b>{formatScore(rRecord.methods[method].master)}</b>
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
              </section>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
