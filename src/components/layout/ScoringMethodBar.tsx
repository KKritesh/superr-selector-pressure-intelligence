import { MethodSelector } from '../common/Selectors';
import { useMethod } from '../../routes';

const descriptions = {
  B: "Prioritises recent performances under pressure while accounting for the strength of a player's track record.",
  C: 'Prioritises players who perform well under pressure repeatedly, with fewer fluctuations in their performances.',
};

export function ScoringMethodBar() {
  const [method] = useMethod();
  return (
    <div className="method-bar">
      <div className="method-bar-inner">
        <span className="method-caption">Scoring method</span>
        <MethodSelector />
      </div>
      <p className="method-description" aria-live="polite">
        {descriptions[method]}
      </p>
    </div>
  );
}
