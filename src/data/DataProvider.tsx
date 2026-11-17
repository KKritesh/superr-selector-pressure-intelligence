import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Meta, Players, RankedPlayer, Role, Method } from './types';
import { createSearchIndex } from '../domain/search';
import { playersForConsideration } from '../domain/eligibility';
import { loadCore } from './loader';
import { ErrorPanel, Skeleton } from '../components/common/States';
function indexData(meta: Meta, sourcePlayers: Players) {
  const players = playersForConsideration(sourcePlayers);
  const identities = new Map(players.identities.map((p) => [p.playerId, p]));
  const records = new Map(players.records.map((r) => [`${r.role}:${r.playerId}`, r]));
  const ranked = {} as Record<Method, Record<Role, RankedPlayer[]>>;
  for (const m of ['B', 'C'] as const) {
    ranked[m] = { batter: [], bowler: [] };
    for (const role of ['batter', 'bowler'] as const)
      ranked[m][role] = players.records
        .filter((r) => r.role === role && r.methods[m].master !== null)
        .sort(
          (a, b) =>
            (a.methods[m].rank ?? Infinity) - (b.methods[m].rank ?? Infinity) ||
            identities.get(a.playerId)!.name.localeCompare(identities.get(b.playerId)!.name),
        )
        .map((record) => ({ record, identity: identities.get(record.playerId)! }));
  }
  return {
    meta,
    players,
    identities,
    records,
    ranked,
    searchIndex: createSearchIndex(players.identities, players.records),
  };
}
type DashboardData = ReturnType<typeof indexData>;
const Context = createContext<DashboardData | null>(null);
export function DataProvider({ children }: { children: ReactNode }) {
  const [core, setCore] = useState<Awaited<ReturnType<typeof loadCore>> | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setError(false);
    loadCore()
      .then((result) => {
        if (live) setCore(result);
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  const data = useMemo(() => (core ? indexData(core.meta, core.players) : null), [core]);
  if (error)
    return (
      <main className="standalone">
        <ErrorPanel onRetry={() => setAttempt((v) => v + 1)} />
      </main>
    );
  if (!data) return <Skeleton />;
  return <Context.Provider value={data}>{children}</Context.Provider>;
}
export function useData(): DashboardData {
  const data = useContext(Context);
  if (!data) throw new Error('Dashboard data not ready');
  return data;
}
