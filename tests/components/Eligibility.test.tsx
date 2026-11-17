import fs from 'node:fs';
import { render, screen, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { DataProvider, useData } from '../../src/data/DataProvider';
import { normalizeComparison } from '../../src/domain/comparison';
import PlayerPage from '../../src/pages/PlayerPage';
import ComparePage from '../../src/pages/ComparePage';

const source = JSON.parse(fs.readFileSync('public/data/players.json', 'utf8'));
const meta = JSON.parse(fs.readFileSync('public/data/meta.json', 'utf8'));
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('meta.json') ? meta : url.includes('history.') ? {} : source),
    })),
  );
});
afterEach(() => vi.unstubAllGlobals());
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => <div>{children}</div>,
  };
});

function CheckSharedData() {
  const data = useData();
  const excludedIds = source.identities
    .filter((p: { nationality: string }) => p.nationality === 'Pakistan')
    .map((p: { playerId: number }) => p.playerId);
  for (const id of excludedIds) {
    expect(data.identities.has(id)).toBe(false);
    expect(data.records.has(`batter:${id}`)).toBe(false);
    expect(data.records.has(`bowler:${id}`)).toBe(false);
    expect(data.searchIndex.some((p) => p.identity.playerId === id)).toBe(false);
  }
  for (const method of ['B', 'C'] as const)
    for (const role of ['batter', 'bowler'] as const) {
      expect(data.ranked[method][role].every((p) => p.identity.nationality !== 'Pakistan')).toBe(
        true,
      );
      expect(normalizeComparison('2490,5979,4722', role, method, data.records)).not.toContain(2490);
      expect(normalizeComparison('2490,5979,4722', role, method, data.records)).not.toContain(5979);
    }
  expect(data.sourceMeta.population).toEqual(meta.population);
  expect(
    data.searchIndex.find((p) => p.identity.playerId === 2933)?.records.bowler?.methods.B.rank,
  ).toBe(2);
  for (const method of ['B', 'C'] as const)
    for (const role of ['batter', 'bowler'] as const) {
      const pool = data.ranked[method][role];
      expect(data.meta.population[method][role]).toBe(pool.length);
      expect(pool.map((p) => p.record.methods[method].rank)).toEqual(pool.map((_, i) => i + 1));
    }
  return <p>Shared consideration indexes verified</p>;
}

describe('exclusion throughout dashboard navigation', () => {
  it('shows a revised player rank and population with the original source rank in More Details', async () => {
    window.location.hash = '/player?role=bowler&id=2933&m=B';
    render(
      <HashRouter>
        <DataProvider>
          <PlayerPage />
        </DataProvider>
      </HashRouter>,
    );
    await screen.findByRole('heading', { name: 'Jasprit Bumrah' });
    expect(screen.getByText('of 605 bowlers').closest('.rank-line')).toHaveTextContent('#2');
    expect(screen.getByText('Original source rank').parentElement).toHaveTextContent('#4');
  });
  it('uses the revised ranks in the comparison grid', async () => {
    window.location.hash = '/compare?role=bowler&ids=2933,830&m=B';
    render(
      <HashRouter>
        <DataProvider>
          <ComparePage />
        </DataProvider>
      </HashRouter>,
    );
    const table = await screen.findByRole('table', {
      name: 'Pressure performance comparison for 2 bowlers',
    });
    const row = table.querySelector('tbody tr:nth-child(2)');
    expect(row).toHaveTextContent('#2');
    expect(row).toHaveTextContent('#3');
  });
  it('filters every shared lookup and recalculates dashboard ranks/populations while retaining source metadata', async () => {
    window.location.hash = '/';
    render(
      <HashRouter>
        <DataProvider>
          <CheckSharedData />
        </DataProvider>
      </HashRouter>,
    );
    expect(await screen.findByText('Shared consideration indexes verified')).toBeInTheDocument();
  });
  it.each(['B', 'C'])('blocks a saved Pakistan player profile under method %s', async (method) => {
    window.location.hash = `/player?role=batter&id=2485&m=${method}`;
    render(
      <HashRouter>
        <DataProvider>
          <PlayerPage />
        </DataProvider>
      </HashRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Player not found' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Babar Azam' })).not.toBeInTheDocument();
  });
  it('removes excluded players from saved comparison URLs and retains permitted selections', async () => {
    window.location.hash = '/compare?role=bowler&ids=2490,5979,4722&m=B';
    render(
      <HashRouter>
        <DataProvider>
          <ComparePage />
        </DataProvider>
      </HashRouter>,
    );
    await screen.findByRole('combobox');
    await waitFor(() => expect(window.location.hash).not.toContain('2490'));
    expect(window.location.hash).not.toContain('5979');
    expect(window.location.hash).toContain('ids=4722');
    expect(screen.getByText('Selected 1 of 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Mohammad Nawaz' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Abrar Ahmed' })).not.toBeInTheDocument();
  });
});
