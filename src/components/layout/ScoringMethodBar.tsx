import { useData } from '../../data/DataProvider';
import { formatDate } from '../../domain/format';
import { MethodSelector } from '../common/Selectors';

export function ScoringMethodBar() {
  const { meta } = useData();
  return (
    <div className="method-bar">
      <div className="method-bar-inner">
        <span className="method-caption">Scoring method</span>
        <MethodSelector />
        <span className="method-data">Data through {formatDate(meta.dataThrough)}</span>
      </div>
    </div>
  );
}
