import fs from 'node:fs';
import axe from 'axe-core';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import { DataProvider } from '../../src/data/DataProvider';
import { AppLayout } from '../../src/components/layout/AppLayout';
import HomePage from '../../src/pages/HomePage';
import PlayerPage from '../../src/pages/PlayerPage';
import ComparePage from '../../src/pages/ComparePage';
import { ScoreCard } from '../../src/components/profile/Metrics';
import type { Players } from '../../src/data/types';
const meta = JSON.parse(fs.readFileSync('public/data/meta.json', 'utf8')),
  players = JSON.parse(fs.readFileSync('public/data/players.json', 'utf8')) as Players;
const batter = JSON.parse(fs.readFileSync('public/data/history.batter.json', 'utf8')),
  bowler = JSON.parse(fs.readFileSync('public/data/history.bowler.json', 'utf8'));
vi.mock('recharts', async () => {
  const original = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => <div>{children}</div>,
  };
});
function setup(hash = '/') {
  window.location.hash = hash;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('meta')
          ? meta
          : url.includes('history.batter')
            ? batter
            : url.includes('history.bowler')
              ? bowler
              : players,
    })),
  );
}
function Shell() {
  return (
    <HashRouter>
      <DataProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="player" element={<PlayerPage />} />
            <Route path="compare" element={<ComparePage />} />
          </Route>
        </Routes>
      </DataProvider>
    </HashRouter>
  );
}
afterEach(() => vi.unstubAllGlobals());
describe('accessible navigation and methodology', () => {
  it('moves skip-link focus without changing the HashRouter route and traps / restores drawer focus', async () => {
    setup();
    const user = userEvent.setup();
    render(<Shell />);
    await screen.findByRole('heading', { name: 'Who performs when it matters most?' });
    const before = window.location.hash;
    fireEvent.click(screen.getByRole('link', { name: 'Skip to content' }));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.hash).toBe(before);
    const trigger = screen.getByRole('button', { name: 'How scores work' });
    await user.click(trigger);
    const close = screen.getByRole('button', { name: 'Close methodology' });
    expect(close).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    await user.tab();
    expect(screen.getByText('Scoring framework reference')).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('has no serious or critical DOM accessibility issues on rankings, search and drawer', async () => {
    setup();
    const { container } = render(<Shell />);
    await screen.findByRole('heading', { name: 'Who performs when it matters most?' });
    for (const state of ['rankings', 'search', 'drawer']) {
      if (state === 'search')
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Abhishek Sharma' } });
      if (state === 'drawer') {
        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
        fireEvent.click(screen.getByRole('button', { name: 'How scores work' }));
      }
      const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(
        result.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })),
      ).toEqual([]);
    }
  }, 20000);
  it.each(['/player?role=batter&id=6281&m=B', '/compare?role=batter&ids=6281,50284,4117&m=B'])(
    'has no serious or critical DOM accessibility issues at %s',
    async (hash) => {
      setup(hash);
      const { container } = render(<Shell />);
      await screen.findByRole('combobox');
      await waitFor(() =>
        expect(screen.queryByText('Loading match history…')).not.toBeInTheDocument(),
      );
      const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(
        result.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })),
      ).toEqual([]);
    },
    20000,
  );
  it('renders a missing score and a valid zero score differently', () => {
    const record = structuredClone(players.records[0]);
    record.methods.B.master = 0;
    record.matches = 1;
    const { rerender } = render(<ScoreCard record={record} method="B" population={888} />);
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('Limited sample')).toBeInTheDocument();
    record.methods.B.master = null;
    rerender(<ScoreCard record={record} method="B" population={888} />);
    expect(screen.getByText('—')).toHaveAttribute('title', 'Not available in source data.');
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });
});
