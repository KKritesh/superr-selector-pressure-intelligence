import { CountryFlag } from './CountryFlag';
import { useId, useRef, useState } from 'react';
import { Search, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<Role | ''>('');
  const [nationality, setNationality] = useState('');
  const maxMatches = Math.max(
    10,
    ...searchIndex.flatMap((p) => Object.values(p.records).map((r) => r?.matches ?? 0)),
  );
  const [minMatches, setMinMatches] = useState(10);
  const [upperMatches, setUpperMatches] = useState<number | null>(null);
  const [browse, setBrowse] = useState(false);
  const upper = upperMatches ?? maxMatches;
  const countries = [
    ...new Set(searchIndex.map((p) => p.identity.nationality).filter((n): n is string => !!n)),
  ].sort();
  const selectedRole = roleFilter ?? (filterRole || undefined);
  const filtered = searchIndex.flatMap((p) => {
    if (nationality && p.identity.nationality !== nationality) return [];
    const roles = p.identity.roles.filter((r) => {
      const record = p.records[r];
      return (
        (!selectedRole || r === selectedRole) &&
        record?.matches != null &&
        record.matches >= minMatches &&
        record.matches <= upper &&
        record.methods[method].master != null
      );
    });
    if (!roles.length) return [];
    return [
      {
        ...p,
        identity: { ...p.identity, roles },
        records: Object.fromEntries(roles.map((r) => [r, p.records[r]])),
      },
    ];
  });
  const suggestions = query.trim()
    ? searchPlayers(filtered, query, method, selectedRole)
    : browse
      ? [...filtered].sort(
          (a, b) =>
            (b.records[bestRole(b, method)]?.methods[method].master ?? 0) -
            (a.records[bestRole(a, method)]?.methods[method].master ?? 0),
        )
      : [];
  const visible = open && !filtersOpen && (query.trim().length > 0 || browse);
  const incompatible =
    roleFilter &&
    suggestions.length === 0 &&
    searchPlayers(searchIndex, query, method, roleFilter).length === 0
      ? searchPlayers(searchIndex, query, method)[0]
      : undefined;
  const select = (p: SearchEntry, role?: Role) => {
    if (excludeIds.includes(p.identity.playerId) || disabled) return;
    onSelect(p.identity.playerId, role ?? roleFilter ?? bestRole(p, method));
    setOpen(false);
    setBrowse(false);
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
      <button
        type="button"
        className="search-filter-toggle"
        aria-label="Search filters"
        aria-expanded={filtersOpen}
        disabled={disabled}
        onClick={() => setFiltersOpen(!filtersOpen)}
      >
        <SlidersHorizontal size={19} />
      </button>
      {filtersOpen && (
        <div className="search-filter-panel">
          <label>
            Role
            <select
              aria-label="Filter by role"
              value={roleFilter ?? filterRole}
              disabled={!!roleFilter}
              onChange={(e) => {
                setFilterRole(e.target.value as Role | '');
                setActive(-1);
              }}
            >
              <option value="">All roles</option>
              <option value="batter">Batter</option>
              <option value="bowler">Bowler</option>
            </select>
          </label>
          <label>
            Nationality
            <select
              aria-label="Filter by nationality"
              value={nationality}
              onChange={(e) => {
                setNationality(e.target.value);
                setActive(-1);
              }}
            >
              <option value="">All nationalities</option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>
              Matches played: {minMatches}–{upper}
            </legend>
            <div className="match-range">
              <input
                type="range"
                aria-label="Minimum matches played"
                min={10}
                max={maxMatches}
                value={minMatches}
                onChange={(e) => {
                  setMinMatches(Math.min(Number(e.target.value), upper));
                  setActive(-1);
                }}
              />
              <input
                type="range"
                aria-label="Maximum matches played"
                min={10}
                max={maxMatches}
                value={upper}
                onChange={(e) => {
                  setUpperMatches(Math.max(Number(e.target.value), minMatches));
                  setActive(-1);
                }}
              />
            </div>
            <small>
              Matches analysed in the selected role; a player qualifies if either role matches when
              all roles are selected.
            </small>
          </fieldset>
          <div className="search-filter-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setFilterRole('');
                setNationality('');
                setMinMatches(10);
                setUpperMatches(null);
                setActive(-1);
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => {
                setFiltersOpen(false);
                setBrowse(true);
                setOpen(true);
                setActive(-1);
                ref.current?.focus();
              }}
            >
              Show players
            </button>
          </div>
        </div>
      )}
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
        placeholder={disabled ? 'Maximum 5 players' : 'Search player by name'}
        disabled={disabled}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setBrowse(false);
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
            if (!p) return;
            const available = p.identity.roles.filter(
              (r) => p.records[r]?.methods[method].master !== null,
            );
            if (available.length > 1) {
              e.preventDefault();
              const current = roleChoice ?? bestRole(p, method);
              setRoleChoice(available[(available.indexOf(current) + 1) % available.length]);
            }
          }
          if (e.key === 'Enter' && !query.trim() && active < 0) {
            e.preventDefault();
            setBrowse(true);
            setOpen(true);
            setFiltersOpen(false);
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
                  <small>
                    <CountryFlag country={p.identity.nationality} />
                  </small>
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
              No players match the current search and filters. Try changing the filters or name.
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
