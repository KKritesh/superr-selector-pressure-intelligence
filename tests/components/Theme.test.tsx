import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeToggle } from '../../src/components/layout/ThemeToggle';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
});
it('applies the selected palette globally and restores the choice after remounting', () => {
  const view = render(<ThemeToggle />);
  fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(localStorage.getItem('superr-theme')).toBe('dark');
  view.unmount();
  render(<ThemeToggle />);
  expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.getItem('superr-theme')).toBe('light');
});
it('still switches themes when browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('unavailable');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('unavailable');
  });
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
});
