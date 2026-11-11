import { VehicleAssetSchema, type VehicleAsset } from "@/types/asset";

/**
 * Licensed vehicle GLBs. Provenance, scoring and the rebuild command for each entry are in
 * docs/assets/asset-manifest.md; pipeline reports are in docs/assets/reports/.
 * tests/unit/vehicle-assets.test.ts checks every entry against the file on disk.
 */
const ASSETS = [
  {
    id: "roadster-gen2",
    url: "/models/roadster-gen2.be6da01a.glb",
    design: "roadster-gen2",
    title: "Tesla Roadster",
    author: "GT Cars",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    sourceUrl: "https://sketchfab.com/3d-models/tesla-roadster-6ad8555df20f4f56985de23a587998cb",
    fidelity: "community-model",
    sourceSha256: "b683c15ea2269dc4bc5522647d2244d9a97c920f1f0604b61b7b7ce095670192",
    sha256: "be6da01a76e30ba86fffb4cfc53274bda85b6f013b0996a08fe4294567e253c1",
    bytes: 2023964,
    triangles: 175504,
    frame: "teslha-v1",
    coverage: { interior: "partial", separateDoors: true, separateWheels: false },
    notes:
      "Next-generation Roadster as shown before the production design was revealed. Interior is a tub with a steering wheel; no seats. All four wheels share meshes, so they cannot spin or steer independently.",
  },
] satisfies VehicleAsset[];

export const VEHICLE_ASSETS: readonly VehicleAsset[] = ASSETS.map((a) => VehicleAssetSchema.parse(a));

export function getAsset(id: string): VehicleAsset {
  const asset = VEHICLE_ASSETS.find((a) => a.id === id);
  if (!asset) throw new Error(`Unknown vehicle asset: ${id}`);
  return asset;
}

/** The licensed asset that stands in for a procedural design, if any. */
export function assetForDesign(design: string): VehicleAsset | null {
  return VEHICLE_ASSETS.find((a) => a.design === design) ?? null;
}
