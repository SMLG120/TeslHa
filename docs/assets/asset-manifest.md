# Vehicle asset manifest

Every licensed 3D model in TeslHa is listed here and in `src/data/assets/index.ts`. The app can only
load manifest entries: the schema in `src/types/asset.ts` accepts self-hosted, content-hashed
`/models/<id>.<hash8>.glb` URLs and CC BY 4.0 / CC0 licences only. Non-commercial and no-derivatives
licences are rejected. `tests/unit/vehicle-assets.test.ts` checks each entry against the file on
disk and against its pipeline report in `docs/assets/reports/`.

None of these files is manufacturer CAD. "Community model" means the geometry was made by a
third-party artist and is redistributed under its licence. It can be inaccurate.

## In use

### roadster-gen2: "Tesla Roadster" by GT Cars

| Field | Value |
|---|---|
| Source | https://sketchfab.com/3d-models/tesla-roadster-6ad8555df20f4f56985de23a587998cb |
| Creator | GT Cars |
| Licence | CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ (credit shown wherever the model is on screen) |
| Download | Sketchfab "Download 3D model" (glTF binary), added in PR #2 on 2026-11-09 |
| Source file | `assets/source/tesla_roadster.glb`, 7,436,804 B, sha256 `b683c15e…5670192` (not served) |
| Served file | `public/models/roadster-gen2.be6da01a.glb`, 2,023,964 B (−73%) |
| Triangles | 175,504 (unchanged; no decimation) |
| Draw primitives | 49 |
| Textures | 39 → 14 after de-duplication, WebP, largest 1024² |
| Extensions | EXT_meshopt_compression, KHR_mesh_quantization, EXT_texture_webp, KHR_materials_clearcoat, KHR_materials_emissive_strength |
| Interior | Partial: cabin tub, trim and steering wheel. No modelled seats. |
| Doors | Front left and right are separate meshes (not hinged yet) |
| Wheels | All four wheels share meshes, so no independent spin or steer |
| Normalised size | 4.400 × 1.169 × 1.936 m (L × H × W) vs dataset 4.40 × 1.18 × 1.98 m (announced, approximate) |
| Measured | Wheel height 0.655 m (dataset 0.70 m, −6%); wheelbase ≈ 2.78 m (dataset 2.65 m, an approximation itself) |
| Fidelity | Community model of the pre-production next-generation Roadster. Not the production design. |

Rebuild:

```bash
node scripts/assets/prepare-glb.mjs --in assets/source/tesla_roadster.glb --name roadster-gen2 \
  --length 4.4 --forward=-z --max-texture 2048 --webp --rules scripts/assets/rules/roadster-gen2.json
# then copy url / sha256 / bytes from docs/assets/reports/roadster-gen2.json into src/data/assets/index.ts
```

## Candidates (not yet downloaded)

Metadata below was read on 2026-11-10 from the public Sketchfab API (`/v3/models/{uid}`). All five
are marked downloadable under CC BY 4.0. **Downloading needs a signed-in Sketchfab account**, so none
has been downloaded, opened or visually checked yet. Scores therefore cover only what can be judged
without the file. Visual criteria are "—" until the model has been through the pipeline.

| Model | Sketchfab entry | Creator | Faces (Sketchfab) | Stated year | Provenance notes |
|---|---|---|---:|---|---|
| Model S | [3b658ba8…](https://sketchfab.com/3d-models/tesla-model-s-3b658ba88b8441c1a5881210bc65ed8e) | Ibrahim3dee | 1,226,044 | 2013 (description) | Pre-2016 nose; TeslHa targets the current Model S. Tags mix "lowpolycar" and "teslamodel3". |
| Model X | [6a5469a1…](https://sketchfab.com/3d-models/tesla-model-x-6a5469a1b776431cb1e1e17a72a2c4f5) | Abdul.Hannan | 686,744 | not stated (2020 upload) | Author says Blender modifiers were not applied and materials differ. Tagged "car-exterior", so likely no interior. |
| Model 3 | [5af35a47…](https://sketchfab.com/3d-models/tesla-model-3-5af35a4772f240039a6e58c58998555b) | dannzjs | 684,315 | not stated | Description is Tesla marketing copy about an SUV; tags list Lamborghini, Bugatti, Honda, Model X. **Ownership must be confirmed before use.** |
| Model Y | [c0a86cac…](https://sketchfab.com/3d-models/tesla-model-y-2021-c0a86cac582d4b33aba0fb1b1912d970) | 763468712 | 2,432,138 | 2021 | No description beyond "model Y". 2.4 M faces needs ~90% reduction for the desktop budget. **Ownership must be confirmed before use.** |
| Roadster | [1fbf29e2…](https://sketchfab.com/3d-models/tesla-roadster-2020-1fbf29e297bd4a17ac39a00a378441d8) | metarex.4d | 608,850 | "2020" | Description copied from Wikipedia. Replaces the GT Cars model only if it has a fuller interior. |

### Scoring (weights from the brief; "—" = cannot be judged before download)

| Criterion (weight) | Model S | Model X | Model 3 | Model Y | Roadster (metarex) |
|---|---|---|---|---|---|
| Exterior fidelity (25) | — | — | — | — | — |
| Interior completeness (20) | — | likely low ("car-exterior") | — | — | — |
| Geometric quality (15) | — | unapplied modifiers: risk | — | — | — |
| Model-year accuracy (10) | 3: 2013 pre-facelift | 6: unspecified | 5: unspecified | 7: 2021, pre-2025 refresh | 6: concept |
| Animation readiness (10) | — | — | — | — | — |
| Performance (10) | 4: 1.2 M faces | 6 | 6 | 2: 2.4 M faces | 6 |
| Licence and provenance (10) | 8 | 8 | 4: copied text, mixed tags | 4: anonymous | 7 |

### Rejection rules applied at intake

`prepare-glb.mjs` accepts only a binary `.glb` (no external URIs, so no path traversal), under
300 MB, starting with the glTF magic. It never executes anything from the file. Every mesh must
match a material rule, or the build fails. Archives (`.zip`) must be listed and inspected before
extraction into an empty directory; extract only the `.glb` and the licence file.

An asset is rejected if its licence is not CC BY / CC0, the uploader is unlikely to own it
(ripped game or configurator assets), its proportions miss the dataset by more than the
`ASSET_TOLERANCE` in `src/lib/car-design/asset-validation.ts`, or it fails `validateAssetGeometry`.

Trademarks: a CC licence covers the artist's copyright in the mesh. It does not license Tesla's
trademarks or trade dress. The site keeps its "independent, not affiliated" notice.
