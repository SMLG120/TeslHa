import { z } from "zod";

/**
 * Only self-hosted, content-hashed GLBs produced by scripts/assets/prepare-glb.mjs may be loaded.
 * Arbitrary or third-party URLs are rejected at the schema boundary.
 */
export const ASSET_URL_PATTERN = /^\/models\/[a-z0-9-]+\.[0-9a-f]{8}\.glb$/;

const Sha256 = z.string().regex(/^[0-9a-f]{64}$/);

export const VehicleAssetSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  url: z.string().regex(ASSET_URL_PATTERN),
  /** Procedural design this asset replaces when licensed assets are enabled. */
  design: z.string(),
  title: z.string(),
  author: z.string(),
  /** Only licences that allow redistribution and commercial use. NC/ND licences are rejected. */
  license: z.enum(["CC BY 4.0", "CC0 1.0"]),
  licenseUrl: z.url(),
  sourceUrl: z.url(),
  /** What the geometry is. Never "manufacturer CAD". */
  fidelity: z.enum(["community-model", "artist-reconstruction"]),
  /** sha256 of the file as downloaded from the source, and of the optimised file served here. */
  sourceSha256: Sha256,
  sha256: Sha256,
  bytes: z.number().int().positive(),
  triangles: z.number().int().positive(),
  /** teslha-v1: nose +X, up +Y, metres, centred on X/Z, wheels on y = 0 (see vehicle-frame.ts). */
  frame: z.literal("teslha-v1"),
  coverage: z.object({
    interior: z.enum(["none", "partial", "full"]),
    /** Doors are separate meshes (they can be hinged at runtime). */
    separateDoors: z.boolean(),
    /** Each wheel is a separate mesh (spinning and steering are possible). */
    separateWheels: z.boolean(),
  }),
  notes: z.string(),
});
export type VehicleAsset = z.infer<typeof VehicleAssetSchema>;
