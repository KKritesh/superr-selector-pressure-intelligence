import { ChevronLeft, ChevronRight } from 'lucide-react';
export function pageNumbers(page: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = [
    1,
    ...Array.from({ length: 3 }, (_, i) => page - 1 + i).filter((n) => n > 1 && n < total),
    total,
  ];
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  return unique.flatMap((n, i) => (i && n - unique[i - 1] > 1 ? ['…', n] : [n]));
}
export function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="Leaderboard pages">
      <button aria-label="Previous page" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={16} />
      </button>
      {pageNumbers(page, total).map((p, i) =>
        typeof p === 'string' ? (
          <span key={`ellipsis-${i}`}>…</span>
        ) : (
          <button
            key={p}
            aria-label={`Page ${p}`}
            aria-current={page === p ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button aria-label="Next page" disabled={page === total} onClick={() => onChange(page + 1)}>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
