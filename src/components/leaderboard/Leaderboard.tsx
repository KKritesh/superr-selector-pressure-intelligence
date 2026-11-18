import { CountryFlag } from '../common/CountryFlag';
import { useLayoutEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Crosshair, Activity } from 'lucide-react';
import { useData } from '../../data/DataProvider';
import { useMethod, playerURL } from '../../routes';
import type { Role, RankedPlayer, Method } from '../../data/types';
import { displayName, formatScore, formatCount } from '../../domain/format';
import { PAGE_SIZE, LIMITED_SAMPLE_MATCHES, METHOD_NAMES, TOOLTIPS } from '../../config/constants';
import { Pagination } from './Pagination';
import { InfoTooltip } from '../common/InfoTooltip';
function LeaderboardRow({ player, method }: { player: RankedPlayer; method: Method }) {
  const { identity, record } = player,
    score = record.methods[method],
    navigate = useNavigate(),
    url = playerURL(identity.playerId, record.role, method);
  return (
    <tr
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a,button')) navigate(url);
      }}
    >
      <td>
        <span
          className={`rank ${score.rank !== null && score.rank <= 3 ? 'top-rank' : ''}`}
          title={score.isTied ? 'Tied' : undefined}
        >
          {score.rankDisplay.replace('#', '')}
        </span>
      </td>
      <td>
        <Link
          to={url}
          title={
            identity.nameSource === 'id_fallback' ? 'Name not available in source data' : undefined
          }
        >
          {displayName(identity)}
        </Link>
        <span className="nationality">
          <CountryFlag country={identity.nationality} />
        </span>
        <span className="mobile-matches">
          {formatCount(record.matches)} matches
          {record.matches !== null && record.matches < LIMITED_SAMPLE_MATCHES
            ? ' · Limited sample'
            : ''}
        </span>
      </td>
      <td className="score-cell">{formatScore(score.master)}</td>
      <td className="matches-cell">
        {formatCount(record.matches)}
        {record.matches !== null && record.matches < LIMITED_SAMPLE_MATCHES && (
          <span className="limited-label" title={TOOLTIPS.limited}>
            Limited sample
          </span>
        )}
      </td>
    </tr>
  );
}
export function Leaderboard({ role }: { role: Role }) {
  const { ranked } = useData(),
    [method] = useMethod(),
    [params, setParams] = useSearchParams(),
    ref = useRef<HTMLDivElement>(null);
  const key = role === 'batter' ? 'bp' : 'wp',
    items = ranked[method][role],
    pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.get(key)) || 1));
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const rows = Array.from(container.querySelectorAll('tbody tr')).slice(0, 10);
    const header = container.querySelector('thead');
    const measure = () => {
      const height =
        (header?.getBoundingClientRect().height ?? 0) +
        rows.reduce((sum, row) => sum + row.getBoundingClientRect().height, 0);
      if (height > 0) container.style.height = `${Math.ceil(height) + 2}px`;
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    for (const element of [...rows, ...(header ? [header] : [])]) observer.observe(element);
    return () => observer.disconnect();
  }, [items, page, method]);
  const update = (p: number) => {
    const next = new URLSearchParams(params);
    next.set(key, String(p));
    setParams(next, { replace: true });
    ref.current?.scrollTo?.({ top: 0, behavior: 'instant' });
  };
  const Icon = role === 'batter' ? Crosshair : Activity;
  return (
    <section className={`card leaderboard ${role}`} aria-labelledby={`${role}-title`}>
      <header className="leaderboard-heading">
        <div className="role-icon">
          <Icon size={21} />
        </div>
        <div>
          <h2 id={`${role}-title`}>
            Top {role === 'batter' ? 'Batters' : 'Bowlers'} Under Pressure
          </h2>
          <p>
            {formatCount(items.length)} {role === 'batter' ? 'batters' : 'bowlers'} ranked ·{' '}
            {METHOD_NAMES[method]}
          </p>
        </div>
      </header>
      <div
        className="leaderboard-scroll"
        ref={ref}
        tabIndex={0}
        role="region"
        aria-label={`${role === 'batter' ? 'Batting' : 'Bowling'} players, scroll for more`}
      >
        <table aria-label={`${role === 'batter' ? 'Batting' : 'Bowling'} pressure rankings`}>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Player</th>
              <th scope="col" className="score-cell">
                Score{' '}
                <InfoTooltip floating text={TOOLTIPS.master} label="About Master Pressure Score" />
              </th>
              <th scope="col" className="matches-cell">
                Matches{' '}
                <InfoTooltip floating text={TOOLTIPS.matches} label="About Matches Analysed" />
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((player) => (
              <LeaderboardRow key={player.identity.playerId} player={player} method={method} />
            ))}
          </tbody>
        </table>
      </div>
      <footer className="leaderboard-footer">
        <span>
          Showing {items.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
          {Math.min(page * PAGE_SIZE, items.length)} of {formatCount(items.length)}
        </span>
        <Pagination page={page} total={pages} onChange={update} />
      </footer>
    </section>
  );
}
