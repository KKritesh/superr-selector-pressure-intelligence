import fs from 'node:fs';
import { cloneElement, type ReactElement } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import { PressureTrendChart } from '../../src/components/profile/PressureTrendChart';
import type { History } from '../../src/data/types';

// jsdom has no layout engine. Give the real Recharts chart an explicit viewport;
// keep its axes, paths, dates, dots and series logic intact.
vi.mock('recharts', async () => {
  const original = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 900, height: 270 }),
  };
});
const history = JSON.parse(fs.readFileSync('public/data/history.batter.json', 'utf8')) as History;
describe('rendered chart geometry with real match observations', () => {
  it('renders the exact ten observed dots with straight paths, a 0–100 axis and full-history switching', () => {
    const observations = history['6281'];
    const { container } = render(
      <PressureTrendChart
        series={[
          {
            id: 6281,
            name: 'Abhishek Sharma',
            color: 'var(--bat-600)',
            observations,
            matches: 134,
          },
        ]}
        reference={44.2087135839897}
      />,
    );
    const dots = () => container.querySelectorAll('.recharts-line-dots > circle');
    expect(dots()).toHaveLength(10);
    const path = container.querySelector('.recharts-line-curve')!;
    expect(path).toBeInTheDocument();
    expect(path.getAttribute('d')).not.toMatch(/NaN|C/);
    expect(path.getAttribute('d')).toMatch(/^M.*L/);
    expect(
      container.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick'),
    ).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(table).toHaveTextContent(observations.at(-1)!.final.toFixed(1));
    fireEvent.click(screen.getByRole('radio', { name: 'All matches' }));
    expect(dots()).toHaveLength(observations.length);
    expect(within(table).getAllByRole('row')).toHaveLength(observations.length + 1);
  });
  it('keeps each comparison series separate and toggles its path and table rows', () => {
    const series = [6281, 50284, 4117].map((id, i) => ({
      id,
      name: `Player ${id}`,
      color: `var(--series-${i + 1})`,
      observations: history[id],
      matches: history[id].length,
    }));
    const { container } = render(<PressureTrendChart series={series} />);
    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(3);
    expect(container.querySelectorAll('.recharts-line-dots')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Player 50284' }));
    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'View as table' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(21);
    expect(table).not.toHaveTextContent('Player 50284');
  });
  it('shows one real point for a one-match player and excludes undated observations', () => {
    const { container } = render(
      <PressureTrendChart
        series={[
          {
            id: 1,
            name: 'Isolated test fixture',
            color: 'var(--bat-600)',
            matches: 2,
            observations: [
              { matchId: 1, date: '2026-11-01', final: 0, realtime: 0, individual: 0 },
              { matchId: 2, date: null, final: 20, realtime: null, individual: null },
            ],
          },
        ]}
      />,
    );
    expect(container.querySelectorAll('.recharts-line-dots > circle')).toHaveLength(1);
    expect(screen.getByText(/Only 1 match — trend not available/)).toHaveTextContent(
      '1 matches without a date not plotted',
    );
  });
});
