import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ChartNoAxesColumnIncreasing, UserRound, UsersRound, CircleHelp } from 'lucide-react';
import { useData } from '../../data/DataProvider';
import { useMethod } from '../../routes';
import { MethodSelector } from '../common/Selectors';
import { formatDate } from '../../domain/format';
import { METHOD_NAMES, CONSIDERATION_NOTE } from '../../config/constants';
import { MethodologyDrawer } from './MethodologyDrawer';
const nav = [
  { path: '/', label: 'Rankings', mobile: 'Rankings', Icon: ChartNoAxesColumnIncreasing },
  { path: '/player', label: 'Know Your Player', mobile: 'Player', Icon: UserRound },
  { path: '/compare', label: 'Compare', mobile: 'Compare', Icon: UsersRound },
];
export function AppLayout() {
  const { meta } = useData(),
    [method] = useMethod(),
    [drawer, setDrawer] = useState(false);
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById('main-content');
          main?.focus();
          main?.scrollIntoView?.();
        }}
      >
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Link to={`/?m=${method}`} className="brand" aria-label="SupeRR Selector home">
            <span className="ball-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="15" />
                <path d="M10 2c11 7-2 21 11 28M7 5l5 1M8 10l5 1M8 15l5 1M9 21l5 1M13 27l5-1" />
              </svg>
            </span>
            <span>
              Supe<span className="brand-rr">RR</span> Selector
              <small>PRESSURE PERFORMANCE INTELLIGENCE</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map(({ path, label }) => (
              <NavLink key={path} to={`${path}?m=${method}`} end={path === '/'}>
                {label}
              </NavLink>
            ))}
          </nav>
          <button className="methodology-trigger" onClick={() => setDrawer(true)}>
            <CircleHelp size={17} />
            <span>How scores work</span>
          </button>
        </div>
        <div className="method-bar">
          <div className="container">
            <span className="method-caption">Scoring method</span>
            <MethodSelector />
            <span className="method-data">Data through {formatDate(meta.dataThrough)}</span>
          </div>
        </div>
      </header>
      <main className="container main-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="app-footer container">
        <div>
          <strong>SupeRR Selector</strong>
          <span>
            Data through {formatDate(meta.dataThrough)} · Weights as of {formatDate(meta.asOfDate)}
          </span>
          <p>
            Scores indicate pressure-performance, not auction valuation, squad fit, or availability.
          </p>
          <p>{CONSIDERATION_NOTE}</p>
        </div>
        <details>
          <summary>Data sources</summary>
          <ul>
            {meta.sources.map((s) => (
              <li key={s.file}>{s.file}</li>
            ))}
          </ul>
        </details>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(({ path, mobile, Icon }) => (
          <NavLink key={path} to={`${path}?m=${method}`} end={path === '/'}>
            <Icon size={21} />
            {mobile}
          </NavLink>
        ))}
      </nav>
      <div className="sr-only" role="status">
        {METHOD_NAMES[method]} selected
      </div>
      {drawer && <MethodologyDrawer onClose={() => setDrawer(false)} />}
    </>
  );
}
