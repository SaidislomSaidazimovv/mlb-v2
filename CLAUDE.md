# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mebelchi / Jihozla — a kitchen-furniture design tool. A customer draws a room, gets
auto-generated kitchen layouts, edits cabinets in a live 3D constructor, sees a running
price, and hands off a manufacturing package (SWJ008 CNC XML, cut lists, drilling sheets,
PDFs). The repo splits cleanly into a **UI-free engine + pure packages** (deterministic
geometry/pricing/schema) and a **React app** that consumes them.

## Layout — two separate npm projects

This is **not** a single workspace. There are two independent npm roots, each with its own
`package.json`, `node_modules`, and vitest config. Run commands from the matching root.

- **Repo root** (`package.json` name `mebelchi-engine`) — the headless engine + shared
  packages + their tests. No React, no Vite.
- **`apps/app/`** (`@mebelchi/app`) — the React + Vite + Capacitor client.

> The `mebelchi/` subdirectory is a stale earlier copy (a pnpm workspace) — ignore it; its
> `mebelchi/CLAUDE.md` does not describe the active code. Work in the repo root and `apps/app/`.

## Commands

**Engine / packages (from repo root):**
```sh
npm test                    # vitest run — the golden + primitive-proof correctness suite (tests/)
npm run typecheck           # tsc --noEmit — strict + noUncheckedIndexedAccess (engine + tests)
npm run bench               # vitest run --config vitest.bench.config.ts (perf, kept OUT of test)
npx vitest run tests/engine.test.ts   # a single file
npx vitest run -t "<name>"            # a single test by name
```

**App (from `apps/app/`):**
```sh
npm run dev                 # vite dev server (host: true — LAN-accessible)
npm run build               # vite build → dist/
npm test                    # vitest run — the app's PURE MODEL suite (apps/app/tests/)
npm run typecheck           # tsc against BOTH tsconfig.json and tsconfig.node.json
npm run cap:sync            # build → cap sync to ios/android (needs Xcode / Android SDK)
```

There is no lint step. `typecheck` + `test` are the gates.

## Architecture

### The engine (`engine/`) — UI-free, one entry point

Imports no React/Three/Zustand. Runs identically in Node, browser, or phone. The public
surface is **`engine/index.ts` only** — everything else is internal.

- `solvePreview(project)` — sync, ~2ms, bounded per gesture tick. Returns bounding boxes +
  LOD drill **zones/counts** per face, never individual op coordinates. Safe on every drag frame.
- `solveFull(project)` — async; produces the `MachiningPlan` and runs the **safety gate**
  (bounds/collision, `core/validate.ts`). Nothing exports unless the gate is clean.
- `solveAndExportSWJ008(project)` — full solve → gate → SWJ008 XML string.

**Units invariant:** all engine-internal coordinates are **`mm10` integers** (tenths of a mm;
16 mm = 160). Floats appear only at the export/render edge (`core/units.ts`). The Face A/B ⇄
SWJ008 mapping is a single locked constant (`core/face.ts`).

**No drilling number is ever a literal** — every diameter/depth/offset comes from the typed
`HardwareSpec` loaded from `engine/catalogs/hardware_specs.dummy.json`. Real values slot in by
editing the JSON; the drilling primitives (`engine/primitives/`) never change. Specs carry a
`verified` flag — outstanding values live in `FACTORY_CHECKLIST.md`.

Folder layers: `contracts/` (types), `core/` (units/face/canonical/validate), `solver/`
(parametric cabinet → parts), `primitives/` (pure drilling patterns), `postprocessors/`
(SWJ008 export + parse), `catalogs/`.

### The Golden Cabinet Suite (`tests/`) — `npm test` from root

Correctness is proven by **semantic comparison**, not byte diff: export → re-parse →
canonicalize → deep-equal against the canonical form of the **real factory XML**
(`tests/golden/xml/`). Fixtures (`tests/fixtures/*.ts`) are committed `Part` literals in mm10
transcribed from those files. Byte-exact comparison is used once (Fixture 0) as a format anchor.
Primitive proofs are gated on the spec's `verified` flag — unverified specs use `it.fails` so the
suite stays green but flips red the instant the geometry becomes correct. **Never delete a golden.**

### Shared packages (`packages/`) — pure, source-exported

No build step: `package.json` points `exports`/`types` at `src/index.ts`. Both `apps/app`'s
`vite.config.ts` and its `vitest.config.ts` alias `@mebelchi/*` to that source and let Vite
transpile (hence `server.fs.allow` widened to repo root).

- `@mebelchi/schema` — the one shared type surface (`Project`, `Space`, `Module`, `RateTable`,
  `Bom`, `Quote`). Types only, no logic.
- `@mebelchi/pricing` — pure: `buildBom(project)` → BOM, `priceProject(project, rateTable)` →
  grouped `Quote`. Same model + same rates → same quote. No network, no UI. Also `modulesToParts`
  emits engine `Part` objects. Engineering tunables live in `src/constants.ts`, **rates live in
  the `RateTable`** — keep them separate.
- `render-spike` — a standalone experiment; not part of the app or engine.

### The app (`apps/app/src/`)

- **State:** one Zustand store (`store.ts`) drives the whole journey. Screens read slices.
  The design flow is a linear `FLOW` of screens: `details` (room editor) → `variants` →
  `configure` (3D constructor) → `preview` (render) → `engineering` → `cost` → `handoff`.
  `home/projects/settings/user/auth` are the hub/menu screens outside the journey. `App.tsx`
  renders by `screen`; routing is store state, not a router. (`quiz`/`space` are legacy Screen
  values kept only so old saved projects can resume — not in `FLOW`.)
- **`model/`** — the app's own geometry/business logic (layout generation, cabinet grid/rows,
  corners, fill, nesting, cut/parts/DXF/XLSX/PDF export, the `toProject.ts` adapter that maps
  app state → `@mebelchi/schema` Project so pricing/engine can run). This is the code the app
  vitest suite guards — geometry no view can vouch for.
- **`three/`** — the Three.js scene (`kitchen3d.ts`, PBR, lighting, post). `pricing/usePrice.ts`
  is the live price ticker.
- **Persistence & sync:** guest-first, no login wall. Local state in `localStorage`; optional
  Supabase sync (`lib/supabase.ts`, `lib/sync.ts`). Two RLS tables mirror the local model
  (`supabase/schema.sql`): `profiles` ← `model/settings.ts`, `projects` ← `model/projects.ts`.
  The public anon key is safe to ship because RLS scopes every row to its owner.
- **i18n:** UI strings are Russian; `i18n/dicts.ts` + `useT.ts`. Much of the source commentary
  is in Russian — keep matching the surrounding language when editing comments/strings.

### Two typechecks, two test suites — and why

The root tsconfig is the **engine's**: `strict` + `noUncheckedIndexedAccess` for integer
geometry, ESM with `.js` extensions in relative imports. The app is deliberately not written
against those rules, so the two suites and typechecks are kept apart on purpose. Don't pull app
source into the root config or vice-versa.

## Gotchas

- **AI render is flag-gated OFF** (`apps/app/src/config.ts`, `AI_RENDER = false`). The render
  *step* ships; only the kie.ai photoreal pass is held. `.env.local` holds a live
  `VITE_KIE_API_KEY` — flipping the flag ships that key to every client bundle. Move the call
  behind a Supabase Edge Function before enabling. In dev, `vite.config.ts` proxies
  `/kie-upload` and `/kie-api` to avoid CORS.
- Capacitor app id `uz.jihozla.app`, `webDir: dist`. Platforms are added on demand
  (`cap:add:ios` / `cap:add:android`) and require the native toolchains.
- Mined/dataset dumps (`mined_*`, `joint_decisions*.json`) are gitignored build/analysis
  artifacts, not source.
