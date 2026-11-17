import { X, Plus } from 'lucide-react';
import type { RefObject } from 'react';
import { useData } from '../../data/DataProvider';
import type { RankedPlayer, Role, Method } from '../../data/types';
import { RoleSelector } from '../common/Selectors';
import { PlayerSearch } from '../common/PlayerSearch';
import { displayName, formatScore } from '../../domain/format';
import { MAX_COMPARE } from '../../config/constants';
export function ComparisonSelector({
  players,
  role,
  method,
  onRole,
  onAdd,
  onRemove,
  onClear,
  inputRef,
}: {
  players: RankedPlayer[];
  role: Role;
  method: Method;
  onRole: (r: Role) => void;
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  inputRef: RefObject<HTMLInputElement>;
}) {
  const { ranked } = useData();
  return (
    <section className="card comparison-selector">
      <div className="comparison-selector-top">
        <div>
          <h2>Your shortlist</h2>
          <p>Compare 2–5 players within one role.</p>
        </div>
        <RoleSelector role={role} onChange={onRole} />
      </div>
      <PlayerSearch
        roleFilter={role}
        excludeIds={players.map((p) => p.identity.playerId)}
        onSelect={onAdd}
        disabled={players.length === MAX_COMPARE}
        onRoleHint={onRole}
        inputRef={inputRef}
      />
      <div className="selected-topline">
        <span>
          Selected {players.length} of {MAX_COMPARE}
        </span>
        {players.length > 0 && (
          <button className="text-button" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>
      <div className="selection-chips">
        {players.map((p, i) => (
          <span className="selection-chip" key={p.identity.playerId}>
            <span className="series-dot" style={{ background: `var(--series-${i + 1})` }} />
            {displayName(p.identity)}
            <button
              aria-label={`Remove ${displayName(p.identity)}`}
              onClick={() => onRemove(p.identity.playerId)}
            >
              <X size={15} />
            </button>
          </span>
        ))}
      </div>
      {players.length < 2 && (
        <div className="suggested-players">
          <span>Start with a leading {role}:</span>
          {ranked[method][role]
            .filter((p) => !players.some((v) => v.identity.playerId === p.identity.playerId))
            .slice(0, 3)
            .map((p) => (
              <button key={p.identity.playerId} onClick={() => onAdd(p.identity.playerId)}>
                <Plus size={14} />
                {displayName(p.identity)}
                <strong>{formatScore(p.record.methods[method].master)}</strong>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
