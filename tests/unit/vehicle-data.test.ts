import { describe, expect, it } from "vitest";
import { configurations, families, getConfigurations } from "@/data/vehicles";
import { getSource } from "@/data/sources";
import { COMPONENTS } from "@/data/components";

describe("vehicle dataset", () => {
  it("has all five families, each with at least one configuration", () => {
    expect(families.map((f) => f.id).sort()).toEqual(["model-3", "model-s", "model-x", "model-y", "roadster"]);
    for (const f of families) expect(getConfigurations(f.id).length).toBeGreaterThan(0);
  });

  it("has unique configuration ids that reference real families", () => {
    const ids = configurations.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of configurations) expect(families.some((f) => f.id === c.familyId)).toBe(true);
  });

  it("cites a resolvable source for every spec", () => {
    for (const c of configurations)
      for (const [key, spec] of Object.entries(c.specs)) {
        expect(spec.sourceIds.length, `${c.id}.${key}`).toBeGreaterThan(0);
        for (const id of spec.sourceIds) expect(getSource(id), `${c.id}.${key} → ${id}`).toBeDefined();
      }
  });

  it("tags every announced-vehicle value as an announced target", () => {
    for (const c of configurations.filter((x) => x.status === "announced"))
      for (const spec of Object.values(c.specs)) expect(spec.verification).toBe("announced-target");
  });

  it("explains every intentionally missing value", () => {
    for (const c of configurations)
      for (const [key, spec] of Object.entries(c.specs)) if (spec.value === null) expect(spec.note, `${c.id}.${key}`).toBeTruthy();
  });

  it("keeps values physically plausible", () => {
    for (const c of configurations) {
      const s = c.specs;
      if (s.zeroToSixtyS.value !== null) expect(s.zeroToSixtyS.value).toBeGreaterThan(1.5);
      if (s.epaRangeMi.value !== null) expect(s.epaRangeMi.value).toBeLessThan(700);
      if (s.topSpeedMph.value !== null) expect(s.topSpeedMph.value).toBeLessThanOrEqual(260);
    }
  });

  it("backs every regulatory value with an EPA record source", () => {
    for (const c of configurations)
      for (const [key, spec] of Object.entries(c.specs))
        if (spec.verification === "regulatory") expect(spec.sourceIds.some((id) => id.startsWith("epa-")), `${c.id}.${key}`).toBe(true);
  });

  it("backs every manufacturer value with a tesla.com source", () => {
    for (const c of configurations)
      for (const [key, spec] of Object.entries(c.specs))
        if (spec.verification === "manufacturer") expect(spec.sourceIds.some((id) => id.startsWith("tesla-")), `${c.id}.${key}`).toBe(true);
  });

  it("matches tesla.com corrections found on 2026-11-07", () => {
    const v = (id: string) => configurations.find((c) => c.id === id)!.specs;
    expect(v("model-3-premium-awd-2026").zeroToSixtyS.value).toBe(3.8);
    expect(v("model-3-performance-2026").horsepower.value).toBe(528);
    expect(v("model-y-premium-awd-2026").zeroToSixtyS.value).toBe(4.3);
    expect(v("model-s-plaid-2026").topSpeedMph.value).toBe(163);
    expect(v("model-x-plaid-2026").cargoCuFt.value).toBe(94.5);
  });

  it("has EPA-verified range and consumption for every current US trim", () => {
    for (const c of configurations.filter((x) => x.status === "current")) {
      expect(c.specs.epaRangeMi.verification, c.id).toBe("regulatory");
      expect(c.specs.efficiencyWhPerMi.value, c.id).toBeGreaterThan(200);
    }
  });

  it("distinguishes the original and next-gen Roadster", () => {
    const r = getConfigurations("roadster");
    expect(r.map((c) => c.generationId).sort()).toEqual(["gen1", "gen2"]);
    expect(r.find((c) => c.generationId === "gen1")!.status).toBe("discontinued");
    expect(r.find((c) => c.generationId === "gen2")!.status).toBe("announced");
  });

  it("links engineering components to valid components", () => {
    const ids = new Set(COMPONENTS.map((c) => c.id));
    expect(ids.size).toBe(10);
    for (const c of COMPONENTS) for (const link of c.connectsTo) expect(ids.has(link)).toBe(true);
  });
});
