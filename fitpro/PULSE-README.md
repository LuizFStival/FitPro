# FitPro Pulse: Hevy read-only build

Personal pt-BR analytics mode in the openGym fork. Original openGym by Duarte Santos and contributors: https://github.com/DuarteSantos8/openGym. Distributed under AGPL-3.0-or-later; see PULSE-LICENSE.txt. Modifications: Hevy read-only gateway, local cache, per-routine analysis and Pulse UI (2026-11-02).

## Deployment under /fitpro/ (2026-11-03)

This directory is now the maintained FitPro source inside LuizFStival/FitPro. The host builds the original HevyPulse at / and copies this build to /fitpro/. Its dedicated GET /fitpro/api/hevy rewrites to api/fitpro-hevy.mjs; no legacy shared credentials are used. Manifest, icons, source archive and service worker are scoped to /fitpro/. The original worker only removes its own caches and ignores this subpath.

The published app and localhost have different browser storage. Enter your own key on the published URL; remembering it is opt-in. Source and license are available at /fitpro/source.tar.gz. No personal data is included in this package.

## Reproduce this version

Node 22 or newer. Run `npm ci`, then `npm run build:pulse`. The source archive deliberately contains only the source needed for this build, including build scripts, lockfile and icons. It does not contain private state, API keys, native app code or the separately licensed exercise media.

`npm run preview:pulse` serves the compiled app and the same read-only gateway at http://127.0.0.1:8182/fitpro/. In the full host repository, run npm run build from its root to assemble both apps, and deploy the repository root to the existing Vercel project heavypulse (project-01anu.vercel.app). The standalone vercel.json in this source archive is only for reproducing this subapp separately.

Workouts are recorded only in Hevy. Supply your own Hevy API key in the UI. Remembering the key is optional and device-local. No personal key belongs in build variables. The gateway permits only workouts, routines, exercise_templates and body_measurements GETs and never uses a shared key. Data and preferences stay in browser storage; custom names, visibility and the weekly schedule do not synchronize between devices. Do not treat cached data as a successful new synchronization.

The November 3 revision restores weekly Home, Plan and visual Stats. It reuses openGym's BodyMap and LineChart; see PULSE-NOTICE.md for attribution. Optional metadata failures preserve cached measurements and muscle data with a visible warning. Weight uses actual dated measurements. Muscle distribution weights primary sets by 1 and secondary sets by 0.4, reports metadata coverage, and does not estimate recovery or hypertrophy. RPE/RIR uses recorded effort only, with an average after at least five rated sets.

Alerts use each Hevy routine ID + exercise template ID. When routine_id is missing, only an unambiguous exact normalized title match is accepted. Warmup/failure/drop sets are excluded. Weight, reps at equal weight, or volume increases reset stagnation. Gaps above the configured 14-day default reset the baseline. Last sessions older than 30 days do not generate current alerts. Equivalence groups are not migrated from the old app. Exercise labels are API titles, with optional user aliases keyed by template ID.

Tests for this mode live in src/pulse. Use `npm run test:pulse` here or in the corresponding source archive. `npm run dev:pulse -- --port 8184` exposes a DEV-only synthetic preview at http://127.0.0.1:8184/fitpro/?demo=1. The preview neither saves data nor calls Hevy; it is excluded from the production bundle.

## Pending acceptance

The real Hevy account was successfully consulted locally. Published-origin verification and iPhone HTTPS acceptance are separate checks. The upstream Docker instance remains independent.
