# Preview startup diagnosis — 17 November 2026

The application server is healthy and the dashboard is usable in the shared Cloud Browser. The managed Sites preview relay still fails independently.

## Minimum correction

Only the `dev` script in `package.json` was changed:

```json
"dev": "vite --host 0.0.0.0 --port 4173 --strictPort"
```

The previous script bound to `0.0.0.0` but defaulted to Vite port 5173 unless a caller passed a port. The revised command uses the requested preview port and fails explicitly on a conflict rather than moving to another port. No permissive `allowedHosts: true` setting was added. The installed Vite version supports the managed preview's `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` mechanism, and requests from the shared browser succeed.

This is a startup configuration correction, not a claim that the default port caused the managed relay timeout. That timeout persists with the port explicitly fixed.

## Verified

- `npm ls --depth=0` succeeds: no missing or invalid declared dependencies.
- Node 24.22.1, npm 11.9.0, Vite 6.1.0.
- `npm run build` succeeds: strict TypeScript and Vite production build.
- No listener occupied port 4173 before startup.
- Direct `npm run dev` starts Vite in 493 ms; the final running instance starts in 343 ms.
- The listener binds to `0.0.0.0:4173`.
- HTTP 200 responses for `/`, `/src/main.tsx`, metadata, player records and both history files.
- Live browser verification: homepage and both leaderboards, Abhishek Sharma's Know Your Player profile, six metrics, an actual 10-point trend, and a two-player comparison with metrics, verdict and trend.
- Option B/C switching updates the comparison from 41.8/39.3 to 40.7/37.5 and updates the method note.
- The browser was reloaded successfully after the final server restart and left on Rankings with Option B.
- Browser console errors observed in the diagnostic belong to a browser-extension metadata messaging script; no dashboard-origin errors were observed in that log sample. The relationship of those extension errors to relay readiness is unproven.
- SHA-256 checks of all 51 existing files under `src/`, `scripts/`, `data/source/` and `public/data/` match the pre-repair baseline exactly. UI, functionality, scoring code, original workbooks and generated datasets were not modified or rebuilt.

## Managed preview result

The direct diagnostic server was stopped and port 4173 was confirmed free. The supported mechanism was then restarted with:

```sh
sites-preview stop
sites-preview start /workspace/work/superr-selector
```

It still returned:

> sites-preview: relay could not open browser port 4173: timed out waiting for relay readiness

`sites-preview status` then reported `Sites preview stopped`; no listener occupied port 4173. There are no retained environment network diagnostic captures. Application health checks and real-browser rendering succeed when Vite runs directly, so the unresolved failure is the managed preview environment's relay readiness handshake, not an application startup crash, missing dependency, port conflict or Vite host rejection. Its internal cause is not exposed by the available diagnostics.

The final direct Vite instance has been left running on port 4173 so the user can review the interactive dashboard in the shared browser while the managed relay remains unavailable. No relay files, environment network permissions or trusted browser settings were modified.

## Evidence

Logs are retained in `/workspace/work/preview-diagnosis/`:

- `build.log`: successful production build.
- `managed-preview.log`: supported preview retry failure.
- `vite-startup.log`: final running Vite instance's startup output.
- `http-checks.json`: HTTP readiness checks.
- `before-sha256.json`: pre-repair application/data checksum baseline.

The existing Playwright acceptance suite was not rerun as part of this startup-only correction. Live shared-browser smoke checks above were performed. Broader cross-browser, responsive and accessibility acceptance remains outside this repair.
