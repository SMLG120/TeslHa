# Geometry validation

How the vehicle shell and cabin are kept aligned, and what is tested. Every value is derived from the
published exterior dimensions (length, width, height, wheelbase, wheel size) or is a packaging
approximation. No seat, cabin or steering dimension here is a measured Tesla value.

## Coordinate frame

Defined once in `src/lib/car-design/vehicle-frame.ts`:

| Axis | Direction | Notes |
|---|---|---|
| +X | Forward | Bumpers at ±L/2, origin at mid-length |
| +Y | Up | Ground at y = 0 |
| +Z | Right flank | Left-hand drive: the driver sits at −Z; pairs mirror about z = 0 |

The earlier axes were kept (X = length) because every surface formula and camera preset uses them.
Relabelling would change no geometry and would risk regressions.

## Structure

| File | Role |
|---|---|
| `vehicle-frame.ts` | Axes, packaging constants, body datums (axles, floor, cowl, dash, firewall, wheelhouse) |
| `surface.ts` | Body and glass surfaces; `beltU` is the single junction shared by glass, body cut-out and doors |
| `cabin-envelope.ts` | Usable volume solved from the real surfaces: `ceiling(x, z)`, `halfWidth(x, y)`, wheelhouses, signed `clearance` |
| `cabin-parts.ts` | Seat parts and steering rims in local space, in parent→child frames; the renderer and the tests read the same numbers |
| `cabin.ts` | Constraint solver: rows, seats, per-model `SteeringConfig`, displays, door cards, floor outline, cameras |
| `geometry-validation.ts` | All checks below, using `THREE.Matrix4`, `Vector3`, `Box3` and `Raycaster` |
| `geometry-overlay.tsx` | `?debug=geometry`: centreline, seat boxes and anchors, steering, cabin sections, roof clearance, hinge axes |

Validation runs in tests and in the debug overlay only, never per frame. Layouts are cached per body.

## Root causes fixed

| Symptom | Cause | Fix |
|---|---|---|
| Model X roof and glass looked detached | The glass base used a width function that jumps at wheel-arch stations: up to 240 mm outboard of the body cut at the Model X cowl | Glass base now lies on the shared belt line; the ends blend exactly onto the body |
| Rear seats buried or misaligned (Model S and others) | The body ring's crown over the rear axle and a wheel-well shell both spanned the whole car, through the rear row; seat checks read the roof at the wrong station and only on the centreline | Crown opened between wheelhouses, one short shell per wheel, seats solved against the roof at each corner and clear of wheelhouses |
| Roadster seats through the shell | The next-generation body's cabin opening was ±0.40 m wide, with seats extending to ±0.66 m | Glass base moved to the design's cabin half-width; seat rails solved from free width |
| Roadster yoke cut by body panels; column not reaching the dash | Wheel placed by fixed offsets; column length fixed | Per-model `SteeringConfig`; column length solved to the dash face |
| Dash through the cowl and windshield base | Dash height taken at its rear edge, while the belt falls toward the cowl | Dash tucks under a closed cowl panel, height from the lowest belt point |
| Door trim stayed behind when doors opened; red paint inside | Trim was static cabin geometry; door skins are double-sided | Door cards built on each door and parented to its hinge |
| Door openings blocked | Body liner ran behind the doors | Liner cut to the door apertures |
| Steering rim vanished after switching between a yoke car and a round-wheel car | React reused the yoke mesh for the torus and cleared its geometry | Steering component keyed by control type |
| Falcon door hinge | Hinged on the centreline | Hinged at each door's top edge; door carries its share of the opaque roof |
| Roof seemed to float | No structure between the roof and the body | Window rail that becomes the A- and C-pillars |

Exploded view was investigated as a cause of the Model X issue and ruled out: it only moves component
meshes, is off by default and is cleared when switching vehicles (covered by a test).

## Tolerances

| Name | Value | Why |
|---|---|---|
| Mirror | 1 mm | Mirrored parts come from one formula; slack is for 32-bit vertices |
| Seal | 2 mm | Below the 2 mm seam strips that cover panel joints |
| Containment | ≥ 0 | Measured after subtracting door-card or headliner thickness |
| Head clearance | 25 mm | Packaging approximation |
| Rim to windshield or door | ≥ 20 mm | Packaging approximation |

## Running

```bash
npx vitest run tests/unit/geometry-validation.test.ts
npx playwright test tests/e2e/geometry.spec.ts       # needs a production server on :3100
node scripts/geometry-shots.mjs <outDir> http://localhost:3100 1280 800 1
# Overlay: /studio/model-x?debug=geometry
```

The validator has its own tests that move a wheel or seat out of bounds and require a failure.

## Known limits

- Seats are built from boxes. Containment tests the boxes, which are slightly larger than the rounded parts drawn.
- Second-row seats on low fastbacks use a reduced back height to stay under the roof (Model S 79%, Model 3 73% of nominal). The 1st-generation Roadster uses 67%.
- Body cross-sections are approximations; a cabin that fits this body says nothing about the real car's interior.
