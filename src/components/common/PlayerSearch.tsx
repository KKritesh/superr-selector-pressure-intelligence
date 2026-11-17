import { useId, useRef, useState } from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import { useData } from '../../data/DataProvider';
import { useMethod } from '../../routes';
import { bestRole, searchPlayers, type SearchEntry } from '../../domain/search';
import { displayName, roleLabel } from '../../domain/format';
import type { Role } from '../../data/types';
export function PlayerSearch({
  onSelect,
  roleFilter,
  excludeIds = [],
  disabled = false,
  onRoleHint,
  inputRef,
}: {
  onSelect: (id: number, role: Role) => void;
  roleFilter?: Role;
  excludeIds?: number[];
  disabled?: boolean;
  onRoleHint?: (role: Role) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const { searchIndex } = useData(),
    [method] = useMethod();
  const [query, setQuery] = useState(''),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1),
    [roleChoice, setRoleChoice] = useState<Role | undefined>();
  const id = useId(),
    ownRef = useRef<HTMLInputElement>(null),
    ref = inputRef ?? ownRef;
  const suggestions = searchPlayers(searchIndex, query, method, roleFilter),
    visible = open && query.trim().length > 0;
  const incompatible =
    roleFilter && suggestions.length === 0
      ? searchPlayers(searchIndex, query, method)[0]
      : undefined;
  const select = (p: SearchEntry, role?: Role) => {
    if (excludeIds.includes(p.identity.playerId) || disabled) return;
    onSelect(p.identity.playerId, role ?? roleFilter ?? bestRole(p, method));
    setOpen(false);
    setQuery('');
    setActive(-1);
    setRoleChoice(undefined);
  };
  return (
    <div
      className="player-search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Search size={19} aria-hidden="true" />
      <input
        ref={ref}
        role="combobox"
        aria-label={roleFilter ? 'Search to add a player' : 'Search player by name or ID'}
        aria-expanded={visible}
        aria-controls={`${id}-results`}
        aria-autocomplete="list"
        aria-describedby={`${id}-help`}
        aria-activedescendant={visible && active >= 0 ? `${id}-${active}` : undefined}
        placeholder={disabled ? 'Maximum 5 players' : 'Search player by name or ID…'}
        disabled={disabled}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
          setRoleChoice(undefined);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            setRoleChoice(undefined);
            setActive((v) =>
              suggestions.length
                ? (v + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length
                : -1,
            );
          }
          if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && active >= 0 && !roleFilter) {
            const p = suggestions[active];
            const available = p.identity.roles.filter(
              (r) => p.records[r]?.methods[method].master !== null,
            );
            if (available.length > 1) {
              e.preventDefault();
              const current = roleChoice ?? bestRole(p, method);
              setRoleChoice(available[(available.indexOf(current) + 1) % available.length]);
            }
          }
          if (e.key === 'Enter' && active >= 0 && suggestions[active]) {
            e.preventDefault();
            select(suggestions[active], roleChoice);
          }
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Tab') setOpen(false);
        }}
      />
      {visible && (
        <div className="search-dropdown">
          <ul role="listbox" id={`${id}-results`} aria-label="Matching players">
            {suggestions.map((p, i) => (
              <li
                role="option"
                aria-selected={active === i}
                aria-disabled={excludeIds.includes(p.identity.playerId)}
                id={`${id}-${i}`}
                key={p.identity.playerId}
                className={active === i ? 'active' : ''}
                onMouseEnter={() => {
                  setActive(i);
                  setRoleChoice(undefined);
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(p)}
              >
                <div>
                  <span className="search-name">{displayName(p.identity)}</span>
                  <small>{p.identity.nationality ?? 'Nationality unavailable'}</small>
                </div>
                <div className="search-roles">
                  {excludeIds.includes(p.identity.playerId) ? (
                    <span className="chip">Added</span>
                  ) : (
                    p.identity.roles
                      .filter(
                        (r) =>
                          (!roleFilter || r === roleFilter) &&
                          p.records[r]?.methods[method].master !== null,
                      )
                      .map((role) => (
                        <span
                          key={role}
                          className={`chip ${role} ${active === i && (roleChoice ?? bestRole(p, method)) === role ? 'chosen' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            select(p, role);
                          }}
                        >
                          {roleLabel(role)} {p.records[role]!.methods[method].rankDisplay}
                        </span>
                      ))
                  )}
                </div>
              </li>
            ))}
          </ul>
          {suggestions.length === 0 && (
            <div className="search-empty">
              No players match “{query}”. Try a shorter name or a player ID.
              {incompatible && onRoleHint && (
                <p>
                  {incompatible.identity.name} has no eligible{' '}
                  {roleFilter === 'batter' ? 'batting' : 'bowling'} score. They are rated as a{' '}
                  {bestRole(incompatible, method)} —{' '}
                  <button
                    className="text-button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onRoleHint(bestRole(incompatible, method));
                      setQuery('');
                      setOpen(false);
                    }}
                  >
                    switch role <ArrowUpRight size={14} />
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <span className="sr-only" id={`${id}-help`}>
        Use Up and Down to browse. Left and Right choose a role. Enter selects, Escape closes.
      </span>
      <span className="sr-only" role="status">
        {visible
          ? `${suggestions.length} matching players${roleChoice ? `, ${roleLabel(roleChoice)} role selected` : ''}`
          : ''}
      </span>
    </div>
  );
}
