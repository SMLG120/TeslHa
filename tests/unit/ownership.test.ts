import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS, GASOLINE_KG_CO2_PER_GALLON, chargeCost, simulate } from "@/lib/calc/ownership";

describe("simulate()", () => {
  const base = { ...DEFAULT_INPUTS, annualMiles: 10000, years: 5, evKwhPerMile: 0.3, chargingEfficiency: 0.9, homeElectricityPrice: 0.15, publicDcPrice: 0.45, dcShare: 0.2, iceMpg: 25, gasolinePrice: 4, evMaintPerMile: 0.06, iceMaintPerMile: 0.1, evPurchasePrice: 45000, icePurchasePrice: 35000, gridKgCo2PerKwh: 0.4 };

  it("computes grid energy including charging losses", () => {
    const r = simulate(base);
    expect(r.evAnnualKwhFromGrid).toBeCloseTo((10000 * 0.3) / 0.9, 6);
  });

  it("blends home and DC prices by share", () => {
    expect(simulate(base).blendedElectricityPrice).toBeCloseTo(0.15 * 0.8 + 0.45 * 0.2, 9);
  });

  it("computes gasoline use and tailpipe CO2", () => {
    const r = simulate(base);
    expect(r.iceAnnualGallons).toBe(400);
    expect(r.iceAnnualKgCo2).toBeCloseTo(400 * GASOLINE_KG_CO2_PER_GALLON, 6);
    expect(r.iceAnnualEnergyCost).toBe(1600);
  });

  it("totals purchase + years × (energy + maintenance)", () => {
    const r = simulate(base);
    const evAnnual = r.evAnnualEnergyCost + 600;
    expect(r.evTotalCost).toBeCloseTo(45000 + 5 * evAnnual, 6);
    expect(r.iceTotalCost).toBeCloseTo(35000 + 5 * (1600 + 1000), 6);
    expect(r.evSavings).toBeCloseTo(r.iceTotalCost - r.evTotalCost, 6);
    expect(r.timeline).toHaveLength(6);
  });

  it("finds the first break-even year, or null", () => {
    const r = simulate({ ...base, years: 15 });
    const first = r.timeline.find((p) => p.evCumulative <= p.iceCumulative);
    expect(r.breakEvenYear).toBe(first?.year ?? null);
    expect(simulate({ ...base, gasolinePrice: 1, years: 2 }).breakEvenYear).toBeNull();
    expect(simulate({ ...base, evPurchasePrice: 30000 }).breakEvenYear).toBe(0);
  });

  it("can show the ICE vehicle winning (no EV bias)", () => {
    const r = simulate({ ...base, gasolinePrice: 2.5, homeElectricityPrice: 0.4, dcShare: 0.8, publicDcPrice: 0.6 });
    expect(r.evSavings).toBeLessThan(0);
    expect(r.evAnnualEnergyCost).toBeGreaterThan(r.iceAnnualEnergyCost);
  });

  it("clamps invalid inputs instead of producing NaN/Infinity", () => {
    const r = simulate({ ...base, iceMpg: 0, chargingEfficiency: 0, dcShare: 2, years: 0 });
    for (const v of [r.iceAnnualGallons, r.evAnnualKwhFromGrid, r.evTotalCost, r.blendedElectricityPrice]) expect(Number.isFinite(v)).toBe(true);
    expect(r.blendedElectricityPrice).toBeCloseTo(base.publicDcPrice, 9);
  });
});

describe("chargeCost()", () => {
  it("prices energy for a given distance", () => {
    expect(chargeCost(100, 0.27, 0.2, 0.9)).toBeCloseTo((27 / 0.9) * 0.2, 9);
  });
});
