import { formIndicator, visibleHistory } from '../../src/domain/trend';
import { formatScore, displayName } from '../../src/domain/format';
import type { Observation } from '../../src/data/types';
const observations = (scores: number[]): Observation[] =>
  scores.map((final, i) => ({
    matchId: i,
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    final,
    realtime: null,
    individual: null,
  }));
describe('form and observation integrity', () => {
  it('sorts dates and picks actual last ten without fabricating undated matches', () => {
    const history = observations(Array.from({ length: 12 }, (_, i) => i));
    history.reverse();
    history.push({ matchId: 500, date: null, final: 99, realtime: null, individual: null });
    const before = JSON.stringify(history);
    expect(visibleHistory(history).map((o) => o.final)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(JSON.stringify(history)).toBe(before);
    expect(visibleHistory(history, true)).toHaveLength(12);
  });
  it('uses the specified eight-observation minimum and compares last five with preceding available observations', () => {
    expect(formIndicator([])).toBeNull();
    expect(formIndicator(observations([1, 2, 3, 4, 5, 6, 7]))!.text).toMatch('Not enough');
    expect(formIndicator(observations([10, 10, 10, 13, 13, 13, 13, 13]))!.tone).toBe('up');
    expect(formIndicator(observations([20, 20, 20, 20, 20, 10, 10, 10, 10, 10]))!.tone).toBe(
      'down',
    );
    expect(formIndicator(observations(Array(10).fill(20)))!.text).toBe('Steady ▬');
  });
  it('renders zero and null separately and displays only the name for colliding IDs', () => {
    expect(formatScore(0)).toBe('0.0');
    expect(formatScore(null)).toBe('—');
    expect(
      displayName({
        playerId: 8638,
        name: 'Basil Hameed',
        nameSource: 'B',
        nationality: 'UAE',
        activeLast2Years: true,
        hasNameCollision: true,
        roles: ['batter'],
      }),
    ).toBe('Basil Hameed');
  });
});
