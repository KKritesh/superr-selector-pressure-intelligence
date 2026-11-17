# Validation report — SupeRR Selector

Validated on 17 November 2026 against the supplied workbooks.

## Results

| Check                                     | Result                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Strict TypeScript + Vite production build | Passed; `dist/` generated                                                                    |
| Automated tests                           | **37/37 passed** across 10 test files                                                        |
| All-record source verification            | **12,280 checks; zero mismatches**                                                           |
| Detailed sample verification              | 10 distinct players, including both-role, one-match, same-name and largest-rank-change cases |
| Pipeline reconciliation                   | 25 check categories; zero mismatches                                                         |
| Initial JavaScript size                   | 65,531 bytes gzip; below the BRD's 350 KB limit                                              |
| DOM accessibility                         | No serious/critical axe violations in the tested states; browser contrast checks excluded    |
| Browser preview / responsive screenshots  | **Unverified** — managed preview relay unavailable                                           |
| Designated download-folder export         | **Blocked** — cloud filesystem did not permit creating that folder                           |

The all-record verifier checks all 1,535 role records under both methods: master score, source rank, match count and independently derived percentile. Source scores/ranks/counts match to full precision. Sampled Realtime/Individual weighted averages match within 1e-9, and last-ten dates/values match their audit observations exactly. The verifier output is retained in `reports/verify-sample.txt` and `reports/source-verification.json`.

## Dataset

- 888 batter records; 647 bowler records.
- 958 player identities; 577 dual-role players.
- 23,817 audit observations; data through 1 November 2026.
- Recency weights as of 17 November 2026; supplied weights are retained.
- One pipeline warning: standalone `Player_ID_Mapping.xlsx` was not attached. The embedded 1,217-row mapping is validated and used. External-copy equivalence remains unverified.

## Automated coverage

| Test file                | Tests | Result |
| ------------------------ | ----- | ------ |
| `Accessibility.test.tsx` | 5     | Passed |
| `Charts.test.tsx`        | 3     | Passed |
| `Compare.test.tsx`       | 3     | Passed |
| `Home.test.tsx`          | 1     | Passed |
| `Player.test.tsx`        | 4     | Passed |
| `comparison.test.ts`     | 8     | Passed |
| `profile.test.ts`        | 3     | Passed |
| `search.test.ts`         | 3     | Passed |
| `derive.test.ts`         | 3     | Passed |
| `source.test.ts`         | 4     | Passed |

Coverage includes source fidelity for every player/method, score ties and percentiles, null vs zero, weighted averages, successful refresh with new players, unresolved-name fallback, critical-header failure preserving previous JSON, real-data search and duplicate IDs, keyboard selection, independent pagination including the final page, method changes, source-row traceability, single/dual-role handling, selection limits/removal, role-change normalization, deterministic verdicts and evidence caveats.

The chart tests render actual Recharts SVG geometry at a supplied viewport. They verify ten observed points, full-history counts, straight paths, a fixed 0–100 axis, separate series, legend visibility, single points and undated exclusions. They caught and fixed an observation-index/series-marker conflict.

The accessibility tests verify the HashRouter skip link, drawer focus trapping/restoration, Escape closure, and axe DOM rules on rankings, search, methodology, profile and comparison. jsdom has no browser layout engine, so color-contrast checking is disabled there. This result is not a claim of full WCAG conformance.

## Remaining acceptance work

The managed preview service returned `relay could not open browser port 4173: timed out waiting for relay readiness`. No separate preview server or infrastructure workaround was used. The following remain unverified:

- Visual layouts at 1440, 1024, 768 and 390 px; horizontal overflow and touch-target review.
- Actual-browser axe/color contrast, keyboard-only end-to-end use and visual spot checks against Excel.
- Laptop load/search/toggle/history latency and the unaided two-minute executive use case.
- Current/previous Chrome, Edge, Firefox, Safari and mobile browser coverage.
- Product-owner acceptance of the BRD's default thresholds and upstream active-flag semantics.

An optional local Playwright suite is included as `npm run test:browser`; it was not executed here. See `README.md` for setup. The complete source and package are retained in the shared workspace because the required projectless download location is not writable on this machine.

No application was published, and no source pressure scores or scoring framework were altered.

## Nationality consideration filter follow-up

All 47 automated tests pass after excluding source nationality `Pakistan` across shared player lookups, leaderboards, search, profiles and comparisons. Tests cover both methods/roles, old URLs, missing nationality, case/whitespace normalization and source-object immutability. The 65 excluded identities account for 61 batting and 42 bowling records. Original source files, reference JSON and scoring pipeline checksums are unchanged. See `reports/nationality-exclusion-tests.json` for this run.

## Revised rankings follow-up

All 55 automated tests pass, and the strict TypeScript/Vite build succeeds. Displayed rankings and percentiles are now recomputed without the excluded nationality for all 827 remaining batters and 605 bowlers under both methods. Independent checks cover every remaining rank and percentile, preserved source scores, ties, zero/null scores, empty/single-player pools, revised B/C rank differences and immutable original provenance. Integration checks cover profile denominators, original-source rank disclosure, search badges and comparison ranks. The original workbooks, reference JSON and scoring pipeline checksums remain unchanged. See `reports/revised-rankings-tests.json`.
