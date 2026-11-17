export const PAGE_SIZE = 50;
export const TOP_N = 10;
export const LIMITED_SAMPLE_MATCHES = 5;
export const TIE_EPS = 0.05;
export const SCORE_TIE_EPS = 1e-9;
export const FORM_MIN_MATCHES = 8;
export const FORM_THRESHOLD = 3;
export const HALF_LIFE_DAYS = 183;
export const NARROW_LEAD = 1;
export const CLEAR_LEAD = 3;
export const MAX_COMPARE = 5;
export const METHOD_NAMES = {
  B: 'Option B — Bayesian',
  C: 'Option C — Consistency Adjusted',
} as const;
export const VERDICT_DISCLAIMER =
  'Comparison reflects pressure-performance indicators, not auction valuation, squad fit, or player availability.';
export const DUAL_FOOTNOTE =
  'Batting and bowling scores are measured separately and are not interchangeable. No combined all-rounder score is calculated.';
export const TOOLTIPS = {
  B: 'Option B — Bayesian: recent pressure performance, balanced so players with few matches are not over- or under-rated. Best for a steady, fair view.',
  C: 'Option C — Consistency Adjusted: starts from Option B and lowers the score of players whose results swing widely from match to match.',
  master:
    'Overall rating out of 100 for how well this player performs when the match is tough. Higher is better.',
  rank: 'Position among all players of this role. A 93rd percentile means higher than 93% of them.',
  realtime:
    'Supporting metric: how well the player handled the live match situation. Weighted towards recent matches.',
  individual:
    "Supporting metric: the player's underlying class and recent form. Weighted towards recent matches.",
  trend:
    'Pressure score in each recent match, by date. Look for steady levels rather than single spikes.',
  matches: 'Qualifying T20 and T20I performances in the dataset for this role.',
  ess: 'How much evidence the score rests on after giving recent matches more weight.',
  limited: 'Fewer than 5 analysed matches; treat this score with extra caution.',
  missing: 'Not available in source data.',
};
