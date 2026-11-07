import { z } from "zod";
import { ConfigurationSchema, VehicleFamilySchema, type Configuration, type VehicleFamily, type VehicleId } from "@/types/vehicle";
import { CONFIGURATIONS } from "./configurations";
import { FAMILIES } from "./families";

// Validate at module load so malformed data fails fast in dev, tests and build.
export const families: VehicleFamily[] = z.array(VehicleFamilySchema).parse(FAMILIES);
export const configurations: Configuration[] = z.array(ConfigurationSchema).parse(CONFIGURATIONS);

export const VEHICLE_IDS = families.map((f) => f.id) as VehicleId[];

export function getFamily(id: string): VehicleFamily | undefined {
  return families.find((f) => f.id === id);
}

export function getConfigurations(familyId: string): Configuration[] {
  return configurations.filter((c) => c.familyId === familyId);
}

export function getConfiguration(id: string): Configuration | undefined {
  return configurations.find((c) => c.id === id);
}

export function bodyFor(family: VehicleFamily, generationId?: string) {
  return family.generations.find((g) => g.id === generationId)?.body ?? family.body;
}
