# 3D audit and migration plan (2026-11-10)

## Repository state at the start

| Item | State |
|---|---|
| `main` | `535a699`, PR #2 (licensed Roadster in the homepage hero), auto-deployed to Render after CI |
| `digital-twin` | Merged as PR #1 (interior explorer, geometry repair) |
| `hero-fade-in` | Main checkout; **uncommitted** homepage fade-in work (4 files). Left untouched. |
| This work | Worktree `../teslha-3d`, branch `3d-reconstruction` from `origin/main` |
| Baseline checks | typecheck ✓, lint ✓, 111/111 unit tests ✓ (now 118) |

## Architecture (unchanged parts)

```text
Next 16 App Router (cacheComponents, static + PPR routes)
├─ features/showroom   home hero · studio · vehicle detail        ← React UI, Zustand store (stores/studio.ts)
├─ components/three    Stage (renderer, PMREM studio env, bloom) · CameraRig (presets from layout bounds)
│                      ProceduralVehicle (car-mesh.ts, cabin-interior.tsx) · GlbVehicle · overlays
├─ lib/car-design      vehicle-frame · surface (lofted body) · cabin-envelope · cabin solver · validators
├─ data                typed, Zod-validated specs, sources, configurations; assets manifest (new)
└─ lib/calc            ownership, scoring, powertrain (analytics)
```

There is no backend data service: specs are local typed modules, served statically. Nothing here needs
a database, and the brief's data-layer requirements (strict TS, Zod at boundaries, explicit year/trim ids,
no redundant requests) were already met. The only runtime fetch is `/api/health`.

## Coordinate frame

`vehicle-frame.ts` uses **+X forward, +Y up, +Z right, metres, origin at mid-length on the ground**.
The brief suggests Z-forward. It was kept, as decided in PR #1: every surface formula, camera preset
and test uses it, and relabelling would change no geometry. The asset pipeline converts every GLB into
this frame (`frame: "teslha-v1"` in the manifest), so all assets share one convention.

## Defects found and status

| Defect from the brief | Status |
|---|---|
| Roadster steering through the windshield / cabin | Fixed in PR #1 (per-model `SteeringConfig`, column solved to the dash, rim ≥ 20 mm from glass). Re-verified by the unit suite. The licensed GLB's wheel is validated separately (inside tub, ≥ 150 mm from body side and roof). |
| Model S rear seats | Fixed in PR #1 (roof read at each seat corner, wheelhouse clearance). Second-row backs are reduced to fit the fastback (documented). |
| Model X / Y / 3 steering | Covered by the per-model validator tests (driver side, dash attachment, glass and door clearance). |
| Licensed GLB 7.4 MB, uncompressed, 39 textures (many duplicates), nose on −Z, arbitrary units, runtime re-orientation | **Fixed here:** offline pipeline → 1.93 MB, 14 textures, normalised frame, semantic hierarchy. |
| GLB loader keyed on asset-specific material names | **Fixed here:** roles (`paint`, `glass`) written by the pipeline. |
| Any URL could be passed to the GLB loader | **Fixed here:** schema and loader accept only hashed `/models/*.glb` from the manifest. |
| Studio cannot show licensed geometry | **Added here:** `?assets=licensed` flag (plain exterior view only), caption and credit follow what is drawn. |

## Remaining limitations

- Only one licensed vehicle (Roadster, next generation, pre-production design). The other four families
  remain procedural approximations. Candidates are listed in `docs/assets/asset-manifest.md`; downloading
  them needs a signed-in Sketchfab account.
- The Roadster GLB has no seats and merged wheels. The interior explorer, doors, X-ray and component views
  keep the procedural rig.
- Performance numbers come from SwiftShader in headless Chromium. They are not representative of GPUs, and
  no FPS claim is made.
- KTX2 textures were not adopted: the textures are small (≤ 1024²) and WebP already reduces them. KTX2 would add a
  transcoder download. Revisit for 2K+ textures.

## Migration plan

1. ✅ Pipeline, manifest, validator, loader, flag (this branch).
2. Download candidates (needs account) → `assets/source/` → `prepare-glb.mjs` with a rules file → visual review
   at the fixed camera shots (`scripts/geometry-shots.mjs`) → manifest entry.
3. Per vehicle, behind the flag: exterior first; doors once hinge axes are derived; interiors only when the asset has
   seats and a dash that pass containment.
4. Make licensed geometry the default per vehicle only after the flag build passes the e2e suite and visual review.
5. Remove procedural shells only after feature parity (doors, X-ray, components, interior). Until then they stay as fallback.
