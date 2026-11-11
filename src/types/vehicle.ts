import { z } from "zod";
import { VehicleAssetSchema } from "./asset";

/**
 * How trustworthy a value is. Rendered as a badge next to every figure.
 * - manufacturer: published by Tesla (spec page, press release, owner docs)
 * - regulatory: official regulator data (EPA / fueleconomy.gov, WLTP homologation)
 * - secondary: reported by third-party publications; pending re-check against a primary source
 * - announced-target: a claim for an unreleased product; NOT a verified production spec
 */
export const VerificationSchema = z.enum([
  "manufacturer",
  "regulatory",
  "secondary",
  "announced-target",
]);
export type Verification = z.infer<typeof VerificationSchema>;

export const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.url(),
  publisher: z.string(),
  accessed: z.iso.date(),
});
export type Source = z.infer<typeof SourceSchema>;

/** A single numeric spec with provenance. `null` value = not publicly verified; never guessed. */
export const SpecSchema = z.object({
  value: z.number().nullable(),
  verification: VerificationSchema,
  sourceIds: z.array(z.string()),
  note: z.string().optional(),
});
export type Spec = z.infer<typeof SpecSchema>;

export const DrivetrainSchema = z.enum(["RWD", "AWD"]);

export const ConfigurationSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  generationId: z.string().optional(),
  name: z.string(),
  modelYear: z.number().int(),
  market: z.literal("US"),
  drivetrain: DrivetrainSchema,
  motors: z.number().int().min(1).max(4),
  seats: z.number().int().min(2).max(7),
  status: z.enum(["current", "discontinued", "announced"]),
  wheelsIn: z.number().nullable(),
  specs: z.object({
    horsepower: SpecSchema,
    torqueNm: SpecSchema,
    zeroToSixtyS: SpecSchema,
    topSpeedMph: SpecSchema,
    epaRangeMi: SpecSchema,
    batteryKwh: SpecSchema,
    efficiencyWhPerMi: SpecSchema,
    peakDcChargeKw: SpecSchema,
    cargoCuFt: SpecSchema,
    msrpUsd: SpecSchema,
  }),
});
export type Configuration = z.infer<typeof ConfigurationSchema>;
export type SpecKey = keyof Configuration["specs"];

/** Proportions that drive the procedural 3D body. Millimetres. */
export const BodyGeometrySchema = z.object({
  lengthMm: z.number(),
  widthMm: z.number(),
  heightMm: z.number(),
  wheelbaseMm: z.number(),
  wheelDiameterMm: z.number(),
  /** Procedural design (see src/lib/car-design/designs.ts): stylised surface parameters, not CAD. */
  design: z.enum(["model-s", "model-3", "model-x", "model-y", "roadster-gen1", "roadster-gen2"]),
  doorStyle: z.enum(["conventional", "falcon", "coupe"]),
  hasFrunk: z.boolean(),
  roofType: z.enum(["fixed", "targa"]),
  dimensionsVerification: VerificationSchema,
  dimensionsSourceIds: z.array(z.string()),
});
export type BodyGeometry = z.infer<typeof BodyGeometrySchema>;

export const VehicleFamilySchema = z.object({
  id: z.enum(["model-s", "model-3", "model-x", "model-y", "roadster"]),
  name: z.string(),
  tagline: z.string(),
  segment: z.string(),
  productionYears: z.string(),
  summary: z.string(),
  statusNote: z.string(),
  body: BodyGeometrySchema,
  /** Optional licensed GLB. When absent, the procedural representation is rendered and labelled as such. */
  asset: VehicleAssetSchema.nullable(),
  /** Implementation depth of the procedural rig. Model S is the reference implementation. */
  rigLevel: z.enum(["full", "standard"]),
  /** Some families have distinct generations (Roadster 2008 vs announced next-gen). */
  generations: z.array(z.object({ id: z.string(), label: z.string(), body: BodyGeometrySchema.optional() })),
});
export type VehicleFamily = z.infer<typeof VehicleFamilySchema>;
export type VehicleId = VehicleFamily["id"];
