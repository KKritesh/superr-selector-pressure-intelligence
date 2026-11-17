import { AlertCircle, RefreshCw } from 'lucide-react';
export function ErrorPanel({ onRetry, inline = false }: { onRetry: () => void; inline?: boolean }) {
  return (
    <div className="error-panel" role="alert">
      <AlertCircle size={24} />
      <h2>{inline ? 'Match history could not be loaded' : 'Dashboard data could not be loaded'}</h2>
      <p>Retry, or rebuild the data files.</p>
      <button className="button" onClick={onRetry}>
        <RefreshCw size={16} />
        Retry
      </button>
      {!inline && (
        <small>
          Local setup: run <code>npm run data:build</code>.
        </small>
      )}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="loading-shell" aria-label="Loading dashboard" aria-busy="true">
      <div className="loading-header" />
      <main className="container">
        <div className="skeleton hero-skeleton" />
        <div className="leaderboards">
          {[0, 1].map((i) => (
            <div className="card skeleton-card" key={i}>
              <div className="skeleton" />
              {Array.from({ length: 10 }, (_, j) => (
                <div className="skeleton skeleton-row" key={j} />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
