import fs from 'node:fs';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { DataProvider } from '../../src/data/DataProvider';
import PlayerPage from '../../src/pages/PlayerPage';
import { PlayerSearch } from '../../src/components/common/PlayerSearch';
const meta = JSON.parse(fs.readFileSync('public/data/meta.json', 'utf8'));
const players = JSON.parse(fs.readFileSync('public/data/players.json', 'utf8'));
const batter = JSON.parse(fs.readFileSync('public/data/history.batter.json', 'utf8'));
const bowler = JSON.parse(fs.readFileSync('public/data/history.bowler.json', 'utf8'));
vi.mock('recharts', async () => {
  const original = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => <div>{children}</div>,
  };
});
function setup(hash: string, sourcePlayers = players) {
  window.location.hash = hash;
  vi.stubGlobal('scrollTo', vi.fn());
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
              : sourcePlayers,
    })),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe('profile and search interactions', () => {
  it('restores a profile, exposes traceability, toggles methods and lists the real last ten', async () => {
    setup('/player?role=batter&id=6281&m=B');
    render(
      <HashRouter>
        <DataProvider>
          <PlayerPage />
        </DataProvider>
      </HashRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Abhishek Sharma' })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(screen.getAllByText('41.8')[0]).toBeInTheDocument();
    expect(screen.getByText('134')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(table).toHaveTextContent('1 Nov 2026');
    expect(table).toHaveTextContent(batter['6281'].at(-1).final.toFixed(1));
    fireEvent.click(screen.getByText('More Details'));
    expect(screen.getByText(/Excel row 2/)).toBeInTheDocument();
    vi.stubGlobal('scrollY', 480);
    const restoreScroll = vi.fn();
    vi.stubGlobal('scrollTo', restoreScroll);
    fireEvent.click(screen.getByRole('radio', { name: 'Consistent Performers' }));
    expect(restoreScroll).toHaveBeenCalledWith({ left: 0, top: 480, behavior: 'instant' });
    expect(screen.getAllByText('40.7')[0]).toBeInTheDocument();
    expect(screen.getByText('Consistency penalty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Bowler' }));
    await waitFor(() => expect(window.location.hash).toContain('role=bowler'));
    expect(screen.getByRole('heading', { name: 'Abhishek Sharma' })).toBeInTheDocument();
  });
  it('supports arrow / Enter selection and duplicate-name IDs', async () => {
    const collisionFixture = structuredClone(players);
    for (const r of collisionFixture.records) {
      if ([8638, 39444].includes(r.playerId)) r.matches = 10;
    }
    setup('/', collisionFixture);
    const onSelect = vi.fn();
    render(
      <HashRouter>
        <DataProvider>
          <PlayerSearch onSelect={onSelect} />
        </DataProvider>
      </HashRouter>,
    );
    const input = await screen.findByRole('combobox');
    fireEvent.change(input, { target: { value: 'Basil Hameed' } });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getAllByText('Basil Hameed')).toHaveLength(2);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: 'no-such-player' } });
    expect(screen.getByText(/No players match/)).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
  it('browses all eligible players on empty Enter and combines role, nationality and match-range filters', async () => {
    setup('/');
    const onSelect = vi.fn();
    render(
      <HashRouter>
        <DataProvider>
          <PlayerSearch onSelect={onSelect} />
        </DataProvider>
      </HashRouter>,
    );
    const input = await screen.findByRole('combobox');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getAllByRole('option').length).toBeGreaterThan(8);
    fireEvent.click(screen.getByRole('button', { name: 'Search filters' }));
    fireEvent.change(screen.getByLabelText('Filter by role'), { target: { value: 'bowler' } });
    fireEvent.change(screen.getByLabelText('Filter by nationality'), {
      target: { value: 'India' },
    });
    fireEvent.change(screen.getByLabelText('Minimum matches played'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Maximum matches played'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show players' }));
    const indianIds = new Set(
      players.identities
        .filter((p: { nationality: string }) => p.nationality === 'India')
        .map((p: { playerId: number }) => p.playerId),
    );
    const expected = players.records.filter(
      (r: {
        role: string;
        playerId: number;
        matches: number;
        methods: { B: { master: number | null } };
      }) =>
        r.role === 'bowler' &&
        indianIds.has(r.playerId) &&
        r.matches >= 20 &&
        r.matches <= 100 &&
        r.methods.B.master !== null,
    );
    expect(screen.getAllByRole('option')).toHaveLength(expected.length);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.any(Number), 'bowler');
    expect(
      expected.some((r: { playerId: number }) => r.playerId === onSelect.mock.calls[0][0]),
    ).toBe(true);
    fireEvent.change(input, { target: { value: 'Rashid Khan' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
  it('disables an unavailable role and hides the dual-role panel for a single-role player', async () => {
    setup('/player?role=batter&id=50284&m=B');
    render(
      <HashRouter>
        <DataProvider>
          <PlayerPage />
        </DataProvider>
      </HashRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Vaibhav Sooryavanshi' }),
    ).toBeInTheDocument();
    const bowlingRole = screen.getByRole('radio', { name: 'Bowler' });
    expect(bowlingRole).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(bowlingRole);
    expect(window.location.hash).toContain('role=batter');
    expect(
      screen.queryByRole('heading', { name: 'Batting & Bowling view' }),
    ).not.toBeInTheDocument();
  });
  it('shows an invalid-ID state without inventing a profile', async () => {
    setup('/player?role=batter&id=999999');
    render(
      <HashRouter>
        <DataProvider>
          <PlayerPage />
        </DataProvider>
      </HashRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Player not found' })).toBeInTheDocument();
  });
});
