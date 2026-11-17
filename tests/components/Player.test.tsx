import fs from 'node:fs';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { DataProvider } from '../../src/data/DataProvider';
import PlayerPage from '../../src/pages/PlayerPage';
import { PlayerSearch } from '../../src/components/common/PlayerSearch';
import { MethodSelector } from '../../src/components/common/Selectors';
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
function setup(hash: string) {
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
afterEach(() => vi.unstubAllGlobals());
describe('profile and search interactions', () => {
  it('restores a profile, exposes traceability, toggles methods and lists the real last ten', async () => {
    setup('/player?role=batter&id=6281&m=B');
    render(
      <HashRouter>
        <DataProvider>
          <MethodSelector />
          <PlayerPage />
        </DataProvider>
      </HashRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Abhishek Sharma' })).toBeInTheDocument();
    expect(screen.getAllByText('41.8')[0]).toBeInTheDocument();
    expect(screen.getByText('134')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(table).toHaveTextContent('1 Nov 2026');
    expect(table).toHaveTextContent(batter['6281'].at(-1).final.toFixed(1));
    fireEvent.click(screen.getByText('More Details'));
    expect(screen.getByText(/Excel row 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Option C — Consistency Adjusted' }));
    expect(screen.getAllByText('40.7')[0]).toBeInTheDocument();
    expect(screen.getByText('Consistency penalty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Bowler' }));
    await waitFor(() => expect(window.location.hash).toContain('role=bowler'));
    expect(screen.getByRole('heading', { name: 'Abhishek Sharma' })).toBeInTheDocument();
  });
  it('supports arrow / Enter selection and duplicate-name IDs', async () => {
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
    fireEvent.change(input, { target: { value: 'Basil Hameed' } });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText(/ID 8638/)).toBeInTheDocument();
    expect(screen.getByText(/ID 39444/)).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: 'no-such-player' } });
    expect(screen.getByText(/No players match/)).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
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
