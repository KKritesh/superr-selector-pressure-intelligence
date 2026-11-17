# SupeRR Selector — Pressure Performance Intelligence

A local, read-only dashboard built from the supplied BRD. Rankings, Know Your Player and Compare Players use the real precomputed Excel outputs. Batting and bowling remain separate throughout.

## Start locally

Prerequisites: Node.js 20 or newer and npm. This project was built with Node 24.22.1 and npm 11.9.0. Extract the complete folder before running:

```sh
npm install
npm run data:build
npm run dev
```

Open the address Vite prints (normally http://localhost:4173). The first data build can take about half a minute because the match-wise workbook has many columns. Source workbooks and generated data are included in the delivery. After dependencies are installed, the app and data build run locally without third-party runtime requests. Fonts are bundled.

```sh
npm test                 # domain, source-fidelity, refresh and component tests
npm run verify:sample    # all master scores/ranks/matches/percentiles + sampled supporting metrics/history
npm run build            # strict type check and production dist/
npm run preview          # serve dist/ locally
```

Use a local server; opening `dist/index.html` directly with `file://` will not load JSON correctly.

## What is implemented

- Independent batting and bowling Top 10 lists, expandable to 50 rows per page, with independent pagination.
- Global Option B / Option C selection, carried in the URL.
- Accessible name/ID search, duplicate-name disambiguation, role chips, arrow-key navigation and keyboard role selection.
- Profiles with Master Pressure Score, consideration-pool rank/percentile, matches, Realtime Performance, Individual Player Score, recent/all-match trends, form indicator, dual-role views and source-row details.
- Comparison of 2–5 eligible players, removable selections, role-change notices, six metric rows, displayed-precision leader badges, separate sample-size tags, multi-series trends and deterministic verdicts.
- Methodology drawer, tooltips, loading/retry/empty states, mobile navigation and responsive styles.
- Shared chart wrapper with actual match dates, straight segments, fixed 0–100 scale, individual observation markers, series toggles and a data-table alternative.

## Current consideration filter

Players whose source nationality is `Pakistan` are excluded before dashboard lookup, search and ranking indexes are built. The rule also blocks their saved profile URLs and removes their IDs from saved comparisons, under both scoring methods and roles. Matching trims whitespace and ignores case; it does not infer nationality from names. Other or missing nationalities remain available.

The filter is configured in `src/config/constants.ts` and applied by `src/domain/eligibility.ts` in `DataProvider`. `src/domain/rankings.ts` then recalculates displayed ranks, rank labels, percentiles and Option B/C rank differences separately for each remaining role/method pool. Rank positions follow descending unchanged pressure scores; ties use competition ranks and share percentiles. Missing scores are unranked. Percentiles use the same strictly-lower, half-up convention with the remaining scored population as denominator.

All dashboard views use these revised rankings and pool sizes, including search role badges, profiles, dual-role panels and comparisons. The current data excludes 65 identities (61 batting and 42 bowling records), leaving 827 batters and 605 bowlers. For example, Jasprit Bumrah is now #2 under Option B bowling rather than the original #4.

Original Excel workbooks, generated reference JSON, master scores, supporting metrics, penalties, weights and scoring benchmarks remain intact. Original ranking values are kept on derived records as `sourceMethods`, and the original selected-method rank appears in More Details. Original metadata is retained as `sourceMeta`. `verify:sample` checks imported reference data against Excel; the revised consideration-pool ranks/percentiles are independently checked for every remaining record in the ranking tests.

The dashboard is privately hosted at https://superr-selector-pressure-intelligence.mysticwarbler2.chatgpt.site for the owner's account.

## Data and refresh

Place updated files in `data/source/` and run `npm run data:build`, then restart the dev server or rebuild `dist/`. Counts, rankings, percentiles, page counts, history and dates are derived from the new files. No source edits are needed when the schema is unchanged.

Consumed sources:

| File                                     | Use                                                             |
| ---------------------------------------- | --------------------------------------------------------------- |
| `Playerwise_Master_Pressure_Scores.xlsx` | Option B/C outputs, audit history and embedded player mapping   |
| `Matchwise_Pressure_Corrected.xlsx`      | Match-wise Realtime/Individual metrics and score reconciliation |
| `Player_ID_Mapping.xlsx`, when present   | Secondary identity mapping and equivalence check                |
| `competition_team_player_mapping.xlsx`   | Last-resort name resolver                                       |
| `matches.xlsx`                           | Match/opposition tooltip context                                |
| `competitions.xlsx`                      | Dataset-format validation context                               |

Numeric filename suffixes such as `(1)` are accepted. Multiple matching versions fail clearly so that a stale file cannot be chosen silently. `Framework_Draft_1.xlsx`, the competition problem statement, playing-eleven QC, teams and ball-by-ball data are references outside this dashboard pipeline. Ball-by-ball is never parsed or served.

The pipeline copies source master scores, source ranks, match counts, dates, ESS, penalties and weights without changing them. Only percentiles/tie labels, supporting weighted averages, populations and identity flags are derived. Audit weights are used as supplied. Verification recomputes relationships only for comparison and never replaces source values.

`public/data/` is generated; do not hand-edit it. The build stages all five JSON files and replaces the output directory only after successful validation. Missing required workbook/sheet/header, invalid numeric values, unsupported roles, duplicate keys and incompatible B/C key sets fail with a nonzero exit and leave the previous JSON untouched. Reconciliation differences are reported as warnings with original values retained. `validation-report.json` includes headers, counts, collisions, unmatched rows, checks and warnings. `meta.json` includes source filenames and SHA-256 hashes.

## Component and logic map

| Location                                     | Responsibility                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `scripts/build-data.ts`, `scripts/lib/`      | Input discovery, header validation, joins, reconciliation and atomic JSON generation  |
| `scripts/verify-sample.ts`                   | Independent Excel-to-dashboard checks; writes `test-results/source-verification.json` |
| `src/data/`                                  | Schemas, one-time core loading, indexes, lazy history loading and retry               |
| `src/routes.tsx`                             | Method/role URL hooks, profile URLs and Back behavior                                 |
| `src/pages/`                                 | The three screen compositions                                                         |
| `src/components/layout/`                     | Header, footer, navigation and focus-trapped methodology drawer                       |
| `src/components/common/`                     | Search, radio-group controls, tooltips and states                                     |
| `src/components/leaderboard/`                | Rankings and pagination                                                               |
| `src/components/profile/`                    | Scorecards, supporting bars, chart, dual-role view and source details                 |
| `src/components/compare/`                    | Selection, metrics and verdict presentation                                           |
| `src/domain/`                                | Pure search, formatting, trend, leader, selection and verdict logic                   |
| `src/styles/tokens.css`                      | Shared color, spacing, radius and elevation tokens                                    |
| `src/styles/index.css`, `tailwind.config.ts` | Responsive styles and token mapping                                                   |
| `tests/`                                     | Source checks, isolated pipeline fixtures, interactions and accessibility             |

`src/config/constants.ts` contains the page size (50), Top 10 count, limited-sample threshold (5), form threshold (±3), minimum form observations (8), verdict tie gap (strictly below 0.05), narrow/clear lead thresholds (1/3), half-life (183 days), labels and tooltips. Verdict wording is centralized in `src/domain/verdict.ts`; source-data percentile and weighted-average rules are in `scripts/lib/derive.ts`, and consideration-pool ranking rules are in `src/domain/rankings.ts`.

URL forms: `#/`, `#/player?role=batter&id=6281&m=B`, `#/compare?role=bowler&ids=…&m=C`. Home expansion/page state uses `bp` (batting) and `wp` (bowling). Page, method and comparison-selection changes replace the current history entry; profile role changes create a history entry. Browser Back restores the preceding URL and ranking expansion.

## Assumptions and open items

1. **Missing standalone mapping file.** `Player_ID_Mapping.xlsx` was named as required in the BRD but was not among the attachments. The actual master workbook contains a validated 1,217-row `Player_Mapping` sheet with all four required mapping fields. This build uses it and the supplied competition mapping. It does not fabricate a replacement workbook. The external-copy equivalence check remains open; if that workbook is later added, the pipeline compares the two and reports differences. This is the documented exception to the BRD's standalone-file stop rule.
2. **Match-wise filename.** The supplied file is `Matchwise_Pressure_Corrected.xlsx`, without `(1)`, and is selected by pattern.
3. **Rank-difference sign.** The source `rank_difference_vs_B` equals **rank B minus rank C** across all 1,535 role records. The dashboard uses that same sign: positive means a higher rank under C. A score difference is C minus B.
4. **Bowling reconciliation.** All 10,094 bowler audit Final Pressure Scores match the corresponding match-wise source values within 1e-6. All 13,723 batter observations reconcile too.
5. **Opposition labels.** Resolved from match-wise `team_id` against `matches.home_team_id` / `away_team_id`; unresolved context is omitted without guessing.
6. **Dates.** Actual latest match: **1 November 2026**. Audit date + age implies a consistent weight as-of date of **17 November 2026**. Both are shown. No weights are refreshed against today's date.
7. **Thresholds.** The BRD's defaults are implemented and centralized. Product-owner review of percentile convention and thresholds remains an acceptance decision.
8. **Dataset mix.** Competitions include 134 T20I and 7 T20 competitions. Counts are called “Matches Analysed”, not IPL matches.
9. **Active flag.** Observed values are `Yes` and `No`; `Yes` displays “Active in last 2 years”. Its precise upstream semantics were not independently established.
10. **Role vocabulary.** Actual source roles are only `Batter` and `Bowler`. Other values fail the build.
11. **Form with 8–9 matches.** Following the BRD's ≥8 minimum, compare the latest five against the available 3–4 earlier observations in the preceding five-slot window. Fewer than eight gets the specified insufficient-history label.
12. **Identity collisions.** Every colliding name is qualified with nationality and player ID. The ID already resolves the same-country Basil Hameed collision, so no additional date suffix is needed.
13. **Browser verification.** The initial managed preview relay failed to open port 4173. A subsequent user-requested startup diagnosis verified a healthy direct Vite server on `0.0.0.0:4173` and live rendering of Rankings, Know Your Player, Compare Players and B/C switching in the shared browser. The managed Sites relay still fails independently. See `PREVIEW_DIAGNOSIS.md`. Full responsive screenshots, touch-target review, browser color-contrast/axe checks, load timings, cross-browser coverage and the unaided two-minute usability test remain unverified. No application, scoring, dataset or UI files changed during that repair.

## Optional local browser acceptance

The Playwright suite is included for the remaining checks. It was **not executed** in the managed environment because the preview relay was unavailable.

```sh
npm run build
npx playwright install chromium   # once, if needed for testing
npm run test:browser
```

It serves the production bundle locally, checks the main selection path, independent pagination/Back, page overflow at the four requested widths, JavaScript errors and real-browser axe violations. Safari/Firefox/Edge and the unaided executive usability test still need manual review.

The existing static application is published as an owner-only ChatGPT Site. No backend, scoring framework changes, auction valuation or combined all-rounder score are included.

## Handoff files

`TEST_REPORT.md` records the completed checks and remaining acceptance work. `reports/` contains the source-verification output and machine-readable test results. The full source, workbook inputs, generated JSON, production `dist/` and six phase commits are retained in the workspace.

The designated projectless download folder could not be created on this cloud machine (read-only filesystem / permission denied). The ZIP is therefore staged in `/workspace/work/` for export rather than linked to a nonexistent download path.
