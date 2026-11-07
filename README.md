# TeslHa — Engineering the Electric Future

An interactive 3D electric-vehicle showroom, engineering lab and performance-analytics platform covering Model S, Model 3, Model X, Model Y and the Roadster (both the 2008 original and the announced next generation).

> **Independent project.** TeslHa is not affiliated with, endorsed by, or sponsored by Tesla, Inc. Vehicle names are used only to identify the vehicles discussed. The TeslHa mark is original.

## Features

| Route | What it does |
|---|---|
| `/` | Cinematic 3D hero with turntable camera, vehicle switching (sink → swap → rise), paint picker, staged preload sequence, scroll storytelling, animated KPI counters |
| `/vehicles` | Fleet showroom: every family with its real US configurations and key specs |
| `/vehicles/[model]` | Configuration tabs, full spec grid with per-value verification badges and sources, dimensions, embedded 3D viewer |
| `/studio/[model]` | Full-screen 3D explorer: 6 camera presets with animated transitions, orbit/zoom/pan, doors (falcon-wing on Model X), frunk/trunk, headlights, 6 paints, studio/night environments, solid/x-ray/wireframe, component overlay, turntable, generation switch for Roadster |
| `/engineering` | Engineering Lab: 10 selectable systems with camera focus, floating technical panel, connected-system navigation, transparent/wireframe shell, exploded view, animated energy flow (drive and regenerative braking). Deep-linkable: `?component=inverter&vehicle=model-y` |
| `/compare` | 2–5 configurations (URL-driven `?ids=`), one synchronized 3D scene at true relative scale, weighted priority scoring, per-metric charts, best-in-row table, 5-year cost vs an ICE baseline |
| `/analytics` | KPI tiles, range / 0–60 / top speed / range-per-dollar charts, charging-cost calculator, **data coverage matrix** |
| `/simulation` | EV vs gasoline cost & emissions simulator (12 adjustable inputs, break-even, "where gasoline wins") and an interactive powertrain energy-flow simulation |
| `/about` | Architecture, asset pipeline, data policy, all sources, limitations |

Global: metric/imperial switch, currency switch (fixed, labelled demo FX rates), reduced-motion support, keyboard-accessible controls, skip link, WebGL detection + error boundary fallback, `?q=low|medium|high` render-quality override.

## Data policy (read this before trusting a number)

- Specs are modelled per **exact configuration** (model year, trim, drivetrain, wheel size, market), never per model.
- Every value is a `Spec { value, verification, sourceIds, note }`, validated with Zod at load time and in tests.
- `verification` is one of:
  - `manufacturer` / `regulatory`: checked against Tesla or EPA/fueleconomy.gov
  - `secondary`: compiled from third-party reporting, **pending primary re-check**
  - `announced-target`: claim for an unreleased vehicle (next-gen Roadster)
- Values Tesla does not publish (e.g. usable pack capacity, most horsepower figures) are `null` with an explanatory note. **They are never estimated.**
- Current state (verified 2026-11-07): EPA range and consumption for every current US trim come from the fueleconomy.gov API (`regulatory`, cited per EPA record). 0–60, peak power, cargo and peak DC rate shown on tesla.com are `manufacturer`. Values tesla.com does not display (most top speeds, cash MSRP, Gen 1 Roadster) stay `secondary`. Where Tesla and EPA disagree on range (Model 3 Performance 316 vs 314, Model Y Premium RWD 355 vs 357), the EPA figure is shown and Tesla's is noted.
- Status as of 2026-11: Model S and Model X production ended in 2026. The next-gen Roadster has not entered production.

## 3D asset pipeline

No accurate, legally licensed production models with separable doors, interiors and drivetrain parts were available, so **no third-party GLBs are used**. Every vehicle is generated at runtime by a parametric car-design system. It is labelled **"procedural representation · not manufacturer CAD"** wherever a car appears.

- `src/lib/car-design/designs.ts`: one `CarDesign` per body (Model S, Model 3, Model X, Model Y, Roadster 2008, Roadster next-gen). Each design has curves for the beltline/hood/deck, the roof, plan-view width and section shape (superellipse exponents), plus nose/tail closure, door cut lines, frunk/trunk and liftback flags, light shapes, wheel style and seat rows.
- `src/lib/car-design/surface.ts`: pure-TypeScript lofted surface built from published length, width, height, wheelbase and wheel size. Monotone cubic curves, superellipse cross-sections, wheel-arch cut-outs and a separate greenhouse with tumblehome. Also produces the side profile for the SVG thumbnails, so the model selector always matches the 3D car.
- `src/components/three/car-mesh.ts`: turns the surface into grid meshes, including paint/underside groups, the glass with a black roof panel, openings cut from the body (doors, falcon-wing doors, frunk, trunk/liftgate), seams, lamps, mirrors, the charge port and lathe-turned wheels in five rim styles.
- `src/components/three/procedural-vehicle.tsx`: materials (clear-coat paint, tinted glass), render modes (paint / x-ray / wireframe), hinged openings with damped motion, head/tail lamps with spotlights, wheel wells, interior and selectable components.
- `src/components/three/vehicle-geometry.ts`: component placements, explode vectors and camera targets derived from the surface.
- `src/components/three/stage.tsx`: aspect-aware camera presets (3/4, front, side, rear, top, interior), contact shadows, floor glow and red rim lights. `studio-environment.tsx` bakes the overhead softboxes, flank strips and red accent wall into a PMREM map once (no HDR download).
- `energy-flow.tsx`: instanced particles along Catmull-Rom paths, battery → inverter → motor → wheels (reversed for regen).

`tests/unit/car-design.test.ts` checks that each design stays within its published length, width and height, that the wheels clear the arches, that the greenhouse stays inside the body, and that every mesh, including each opening state, builds without NaNs.

**Adding a licensed model (not wired yet):** each family in `src/data/vehicles/families.ts` has an `asset` slot (`url`, `license`, `author`, `sourceUrl`). Compress GLBs with `gltf-transform` (Draco or Meshopt geometry, KTX2 textures), place them in `public/models/`, register them there, and render them with drei's `useGLTF` in place of `ProceduralVehicle`. Name sub-meshes after the `ComponentId`s so the selection, x-ray and explode logic keep working. Record the licence (CC-BY, CC0 or a commercial licence that permits redistribution in a public web app) and attribution below. `next.config.ts` already serves `/models`, `/textures` and `/environments` with long cache headers, so use versioned file names.

## Architecture

```
src/
  app/                    routes (App Router, Cache Components + Partial Prefetching)
  proxy.ts                rejects unknown vehicle slugs with a real 404 before render
  components/
    layout/               nav, footer, wordmark, unit/currency toggle
    three/                stage (lighting, floor, post-fx, adaptive quality), camera rig, rig, env, WebGL guard
    charts/               validated categorical palette, MetricBars
    simulations/          cost simulator, powertrain simulation
    ui/                   primitives, spec value + verification badge, animated number, number field
  features/
    showroom/             hero, studio, vehicle detail, fleet stats
    engineering/          engineering lab
    comparison/           compare studio + synchronized scene
    analytics/            dashboard
  data/
    vehicles/             families (geometry), configurations (specs), Zod-validated index
    components/           engineering-component content
    sources/              every cited source with access date
  lib/calc/               ownership (EV vs ICE), scoring, powertrain model — pure, unit-tested
  stores/                 Zustand: studio scene state, persisted preferences
  hooks/                  media-query hooks (reduced motion, low power)
  types/                  Zod schemas + inferred types
```

**Performance:** 3D scenes are `next/dynamic({ ssr: false })` code-split. DPR is capped at 1.5 and adapted by drei's `PerformanceMonitor`, which also steps quality high → medium → low (Bloom + reflective floor → Bloom → none; N8AO was dropped because n8ao 2.0.1 crashes on three r187). Mobile/coarse pointers get reduced geometry. Geometries and materials created in hooks are disposed on unmount. Per-frame animation mutates Three objects in `useFrame` rather than React state.

## Formulas (simulation)

- EV grid energy = miles × kWh/mi ÷ charging efficiency
- Blended electricity price = home × (1 − DC share) + DC × DC share
- ICE fuel = miles ÷ mpg; tailpipe CO₂ = 8.887 kg/gal (EPA)
- Grid CO₂ default ≈ 0.81 lb/kWh (EIA, US average); user-adjustable
- Maintenance defaults $0.061/mi BEV vs $0.101/mi ICE (Argonne, Burnham et al. 2021)
- Total = purchase + years × (energy + maintenance). Excludes insurance, depreciation, financing, taxes, incentives and upstream emissions.

The powertrain simulation is a generic 1,900 kg / 250 kW single-motor EV longitudinal model (drag, rolling resistance, torque and power limits, regen fade). It is clearly labelled as **not calibrated** to any Tesla.

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000
npm run check          # typecheck + lint + unit tests
npm run build && npm start
npx playwright install chromium   # once
npm run test:e2e       # builds must exist; starts `next start` on :3100 if not running
npm run screenshot -- "http://localhost:3100/?q=low" out.png 8000   # headless screenshot helper
```

Requires Node 20.9+ (developed on Node 24).

## Testing

- **Vitest + Testing Library** (`tests/unit`): ownership-cost math, including an "ICE wins" scenario and NaN guards; scoring; procedural layout invariants for every family; powertrain physics; dataset integrity (unique ids, resolvable sources, notes on every null, announced values tagged, Roadster generations distinct); spec-rendering and WebGL fallback UI.
- **Playwright** (`tests/e2e`): every route renders without runtime errors on desktop and mobile, a real 404 for unknown models, hero vehicle switching, studio toggles and camera views, in-studio model switching, engineering deep links, URL-driven comparison, simulator recalculation, unit switching. Uses SwiftShader so WebGL renders headless.

## Deployment (Render)

Live at **https://teslha.onrender.com** (Render free web service, created from `render.yaml`).

- `render.yaml`: Node 24, `npm ci && npm run build`, then `npm start`. Health check at `/api/health`. Deploys `main` with `autoDeployTrigger: checksPass`, so a push deploys only after the CI checks pass. No secrets are needed. If you add any, set them in the dashboard (or as `sync: false` entries), never in the file.
- `.github/workflows/ci.yml`: runs typecheck, lint, unit tests and a production build on every push and pull request.
- Free instances sleep after about 15 minutes idle, so the first request after that takes roughly a minute.

**Turning on auto-deploy (one-off, in the browser):** the service was first connected by public repo URL, and that kind of connection can't receive push events or see check results.
1. In Render: **Account settings → GitHub → Configure** (or GitHub → Settings → Applications → Render → Configure). Under *Repository access*, add `teslha`.
2. In Render: **teslha service → Settings → Build & Deploy → Repository**. Reconnect it to `SMLG120/teslha` through the GitHub app, branch `main`.
3. Open **Blueprints → teslha → Sync** so the service picks up `render.yaml` (health check path and auto-deploy trigger). Check the diff it shows before you apply it.
4. Push a commit and check that the CI run completes and a deploy then starts.

Until then, deploy with **Manual Deploy → Deploy latest commit**. The app also runs on any Node host (`npm run build && npm start`) or Vercel with no extra configuration.

## Known limitations

- Vehicle bodies are stylised approximations from published dimensions, not production surfaces. Details such as exact light signatures, panel gaps, grille-less fascias and badge-level styling are simplified. Component placement is schematic.
- No licensed GLB models are bundled, so the Draco/Meshopt loading path is documented but not wired up.
- Interior is a simplified seat and dash layout, not a detailed cabin.
- Prices and some top speeds remain `secondary`: tesla.com shows financing offers rather than a stable cash MSRP. Tesla changes trims and prices frequently, so re-verify before relying on any figure.
- No DC charging curves yet: no dataset with documented test conditions has been added.
- Per-trim EPA consumption (Wh/mi) is not yet in the dataset, so cost comparisons apply one assumed consumption to every EV (stated wherever it is used).
- Currency conversion uses fixed demo rates and does not represent local market prices.
- Dark theme only, by design of the brand.
- shadcn/ui was not installed via its CLI. The few primitives needed are built directly on Radix (Tabs, Slider, Tooltip) with Tailwind.

## Asset licensing & attribution

All 3D geometry is generated procedurally at runtime by this project's code. No third-party models, textures or HDRIs are used. Fonts: Geist and Geist Mono (SIL OFL), Michroma (SIL OFL), via `next/font/google`. Icons: Lucide (ISC).

## Sources

See `src/data/sources/index.ts` or the `/about` page for the full, dated list (fueleconomy.gov, tesla.com, EPA, EIA, Argonne National Laboratory, and the secondary publications cited per value).
