import { Trophy } from 'lucide-react';
import type { RankedPlayer, Method } from '../../data/types';
import { comparisonVerdict } from '../../domain/verdict';
import { VERDICT_DISCLAIMER } from '../../config/constants';
export function ComparisonVerdict({players,method}:{players:RankedPlayer[];method:Method}){const verdict=comparisonVerdict(players,method);if(!verdict)return null;return <section className="comparison-verdict" aria-label="Comparison Verdict" aria-live="polite"><div className="verdict-icon"><Trophy size={20}/></div><div><span className="eyebrow">COMPARISON VERDICT</span><h2>{verdict.headline}</h2><p>{verdict.detail} <span className="verdict-method">{verdict.methodNote}</span></p><p className="verdict-disclaimer">{VERDICT_DISCLAIMER}</p></div></section>;}
