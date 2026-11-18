# GitHub / Vercel readiness

Prepared on 18 November 2026. This preparation changes documentation and ignore rules only, and includes original workbook inputs for reproducibility. Application source, reference JSON, flags, scoring logic and UI remain unchanged.

## Verified

- Lockfile installation: `npm ci` succeeded (a writable local npm cache was used in the managed execution environment).
- Production build: `npm run build` succeeded on Node 24.22.1 / npm 11.9.0.
- Tests: 67 passed across 14 files, including rankings, search filters, profiles, comparisons, charts, theme persistence and source fidelity.
- Independent workbook verification: 12,280 exact source checks, 10 sampled role profiles, zero mismatches.
- All 29 public assets copied byte-for-byte into the production build, including five JSON data files and locally bundled flag SVGs / provenance text.
- All 58 HTML/CSS asset references resolved to packaged files.
- Checksums confirm that all 74 protected application/data/workbook files are unchanged by deployment preparation.
- The runtime requires no environment variables, external API, backend, Codex workspace, or source Excel downloads.
- HashRouter URLs retain `#/`; direct links and refreshes request the root document, requiring no Vercel rewrite.
- Source and manifests were scanned for common GitHub token, AWS access-key and private-key patterns; no matches found. Credentials, dependencies, caches and build outputs are excluded.

## Verification limits

The managed Sites preview relay has a previously diagnosed readiness failure. Browser-level visual, responsive and cross-browser checks remain unverified; passing component/chart tests and asset validation are not represented as a substitute for visual browser testing. No application code was changed to compensate for preview infrastructure.

## Publishing status

No Vercel deployment was requested or performed. The owner created `KKritesh/superr-selector-pressure-intelligence` after the GitHub integration could not create repositories. Public visibility was explicitly authorized by the owner. The complete prepared project targets the repository's `main` branch at https://github.com/KKritesh/superr-selector-pressure-intelligence. Earlier repository-creation and private-visibility blockers are resolved by the owner's creation and updated visibility instruction.

Vercel settings: Vite; repository root (`.`); install `npm ci`; build `npm run build`; output `dist`; Node 24.x; environment variables: none. See README.md for full instructions and route examples.
