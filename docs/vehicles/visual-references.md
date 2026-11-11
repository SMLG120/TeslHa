# Visual references and asset requirements

Feature-by-feature comparison against tesla.com is in [`docs/vehicle-reference.md`](../vehicle-reference.md)
(pages reviewed 2026-11-08). Dimensions and their verification levels live in
`src/data/vehicles/families.ts`. This page adds the target generation for each model and what a
licensed asset must have before it can replace the procedural rig.

tesla.com returns 403 to scripted fetches; it was read in a browser. No Tesla images, configurator
assets or app files were downloaded or reused.

| Model | Target generation | Dataset L × W × H, wheelbase (mm) | Verification | Seats | Steering |
|---|---|---|---|---|---|
| Model S | 2021+ refresh (production ended 2026) | 4970 × 1964 × 1431, 2960 | secondary | 2 + 3 | yoke (round also offered) |
| Model X | 2021+ refresh (production ended 2026) | 5057 × 1999 × 1680, 2965 | secondary | 2 + 2 + 2 shown (page conflicts) | round |
| Model 3 | 2024+ "Highland" (matches the 4720 mm length) | 4720 × 1850 × 1441, 2875 | see dataset | 2 + 3 | round; turn-signal stalk not modelled |
| Model Y | 2025+ "Juniper" (matches the 4797 mm length) | 4797 × 1921 × 1624, 2891 | secondary | 2 + 3 | round |
| Roadster (next gen) | Announced two-seater; no production car | 4400 × 1980 × 1180, 2650 | announced-target / approximate | 2 | yoke |

## Unverified details

- No interior dimension (seat size, H-point, steering position) is published. Every cabin placement is a
  packaging approximation solved in `src/lib/car-design/cabin.ts`.
- Roadster: everything except "two seats", the yoke and the displays shown on the page is from the
  2017 prototype or later press. The community GLB in use predates the current design.

## Asset compatibility requirements

A licensed GLB can replace a procedural model when all of the following hold:

1. Licence CC BY 4.0 or CC0, with a named creator who plausibly owns it (see `docs/assets/asset-manifest.md`).
2. Same generation as the table above. A pre-facelift Model S or a pre-Juniper Model Y fails, however good it looks.
3. Passes `validateAssetGeometry` after `prepare-glb.mjs`: length exact, body width and height within 4%,
   wheels on the floor and within 10% of the dataset diameter, doors mirrored, steering on the driver's (−Z)
   side, inside the cabin and under the roof.
4. Separate meshes for the body paint and the glass, so paint colours and glass tint work.
5. For the full studio (doors, interior explorer): separate doors with recoverable hinge lines, seats and a
   dashboard. Without them the asset is used only in the plain exterior view, and the procedural cabin stays.
6. At most 250k triangles and 15 MB after the pipeline for desktop (100k / 6 MB for a mobile variant).
