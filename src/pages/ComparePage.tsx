import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, UsersRound, X } from 'lucide-react';
import { useData } from '../data/DataProvider';
import { useHistory } from '../data/useHistory';
import { useMethod, useRole, useBack } from '../routes';
import type { Role, RankedPlayer } from '../data/types';
import { MAX_COMPARE, VERDICT_DISCLAIMER } from '../config/constants';
import { normalizeComparison } from '../domain/comparison';
import { displayName } from '../domain/format';
import { ComparisonSelector } from '../components/compare/ComparisonSelector';
import { ComparisonGrid } from '../components/compare/ComparisonGrid';
import { ComparisonVerdict } from '../components/compare/ComparisonVerdict';
import { PressureTrendChart } from '../components/profile/PressureTrendChart';
import { ErrorPanel } from '../components/common/States';
export default function ComparePage() {
  const { records, identities } = useData(),
    [method] = useMethod(),
    role = useRole(),
    [params, setParams] = useSearchParams(),
    back = useBack(),
    inputRef = useRef<HTMLInputElement>(null),
    [toast, setToast] = useState('');
  const ids = normalizeComparison(params.get('ids'), role, method, records),
    idsKey = ids.join(',');
  const players: RankedPlayer[] = ids.map((id) => ({
    identity: identities.get(id)!,
    record: records.get(`${role}:${id}`)!,
  }));
  const { data, error, retry } = useHistory(role);
  useEffect(() => {
    const next = new URLSearchParams(params);
    let changed = false;
    if ((params.get('ids') ?? '') !== idsKey) {
      if (idsKey) next.set('ids', idsKey);
      else next.delete('ids');
      changed = true;
    }
    if (params.get('role') !== role) {
      next.set('role', role);
      changed = true;
    }
    if (changed) setParams(next, { replace: true });
  }, [idsKey, params, role, setParams]);
  const setIds = (nextIds: number[]) => {
    const next = new URLSearchParams(params);
    if (nextIds.length) next.set('ids', nextIds.join(','));
    else next.delete('ids');
    setParams(next, { replace: true });
  };
  const changeRole = (nextRole: Role) => {
    const retained = normalizeComparison(idsKey, nextRole, method, records),
      removed = ids.filter((id) => !retained.includes(id));
    if (removed.length)
      setToast(
        `Removed ${removed.length} players with no eligible ${nextRole === 'batter' ? 'batting' : 'bowling'} score: ${removed.map((id) => displayName(identities.get(id)!)).join(', ')}`,
      );
    else setToast('');
    const next = new URLSearchParams(params);
    next.set('role', nextRole);
    if (retained.length) next.set('ids', retained.join(','));
    else next.delete('ids');
    setParams(next, { replace: true });
  };
  return (
    <>
      <button className="back-button" onClick={back}>
        <ArrowLeft size={16} />
        Back
      </button>
      <div className="page-intro compare-intro">
        <span className="eyebrow">PUT YOUR SHORTLIST IN PERSPECTIVE</span>
        <h1>Compare Players</h1>
        <p>Look beyond one number. Compare pressure performance alongside the evidence.</p>
      </div>
      <ComparisonSelector
        players={players}
        role={role}
        method={method}
        inputRef={inputRef}
        onRole={changeRole}
        onAdd={(id) => {
          if (ids.length < MAX_COMPARE && !ids.includes(id)) setIds([...ids, id]);
        }}
        onRemove={(id) => {
          setIds(ids.filter((v) => v !== id));
          inputRef.current?.focus();
        }}
        onClear={() => {
          setIds([]);
          inputRef.current?.focus();
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {players.length < 2 ? (
        <div className="comparison-prompt">
          <UsersRound size={32} />
          <h2>Add at least two players to compare.</h2>
          <p>{VERDICT_DISCLAIMER}</p>
        </div>
      ) : (
        <>
          <ComparisonVerdict players={players} method={method} />
          <ComparisonGrid players={players} role={role} method={method} />
          {error ? (
            <ErrorPanel inline onRetry={retry} />
          ) : data ? (
            <PressureTrendChart
              key={`${role}:${idsKey}`}
              series={players.map((p, i) => ({
                id: p.identity.playerId,
                name: displayName(p.identity),
                color: `var(--series-${i + 1})`,
                observations: data[p.identity.playerId] ?? [],
                matches: p.record.matches,
              }))}
            />
          ) : (
            <div className="card chart-loading" aria-busy="true">
              <div className="skeleton" />
              Loading match history…
            </div>
          )}
        </>
      )}
    </>
  );
}
