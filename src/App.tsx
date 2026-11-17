import { Component, Suspense, lazy, type ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './data/DataProvider';
import { AppLayout } from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="standalone error-panel">
        <h1>Dashboard data could not be loaded</h1>
        <p>Retry, or rebuild the data files.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <DataProvider>
          <Suspense
            fallback={
              <main className="container route-loading" aria-busy="true">
                Loading player tools…
              </main>
            }
          >
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="player" element={<PlayerPage />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </DataProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
