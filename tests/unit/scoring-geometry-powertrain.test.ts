import { describe, expect, it } from "vitest";
import { bestIds, scoreConfigurations } from "@/lib/calc/scoring";
import { getConfiguration, families } from "@/data/vehicles";
import { computeLayout } from "@/components/three/vehicle-geometry";
import { GENERIC_EV, step, type PowertrainSample } from "@/lib/calc/powertrain";

describe("scoring", () => {
  const a = getConfiguration("model-3-premium-rwd-2026")!;
  const b = getConfiguration("model-s-plaid-2026")!;

  it("ranks by weighted min-max and skips missing metrics", () => {
    const [sa, sb] = scoreConfigurations([a, b], { epaRangeMi: 1 });
    expect(sb.score).toBe(100); // 368 mi > 363 mi
    expect(sa.score).toBe(0);
    const roadster = getConfiguration("roadster-gen1-2008")!; // cargo not published
    const withCargo = scoreConfigurations([roadster, a], { cargoCuFt: 1 });
    expect(withCargo[0].score).toBeNull();
    expect(withCargo[0].missing).toBe(1);
  });

  it("finds the best id respecting direction", () => {
    expect([...bestIds([a, b], "zeroToSixtyS", true)]).toEqual([b.id]);
    expect([...bestIds([a, b], "msrpUsd", true)]).toEqual([a.id]);
  });
});

describe("procedural layout", () => {
  it("derives sane metre-scale geometry for every family", () => {
    for (const f of families) {
      const l = computeLayout(f.body);
      expect(l.L).toBeCloseTo(f.body.lengthMm / 1000, 6);
      expect(l.frontAxleX).toBeGreaterThan(l.rearAxleX);
      expect(l.frontAxleX - l.rearAxleX).toBeCloseTo(f.body.wheelbaseMm / 1000, 6);
      expect(l.frontAxleX + l.wheelR).toBeLessThan(l.L / 2 + 0.05);
      expect(Object.keys(l.cameraTargets)).toHaveLength(10);
    }
  });
});

describe("powertrain model", () => {
  const start: PowertrainSample = { speedMs: 0, socPct: 80, energyKwh: 0, regenKwhTotal: 0, motorPowerKw: 0, batteryPowerKw: 0, wheelTorqueNm: 0, regenPowerKw: 0, mode: "coast" };
  const run = (s: PowertrainSample, pedal: number, seconds: number) => {
    for (let t = 0; t < seconds; t += 0.02) s = step(s, pedal, 0.02);
    return s;
  };

  it("accelerates, draws energy and never exceeds motor power", () => {
    const s = run(start, 1, 6);
    expect(s.speedMs).toBeGreaterThan(20);
    expect(s.energyKwh).toBeGreaterThan(0);
    expect(s.socPct).toBeLessThan(80);
    expect(s.motorPowerKw).toBeLessThanOrEqual(GENERIC_EV.maxMotorPowerKw + 1e-6);
  });

  it("recovers energy under regen and slows down", () => {
    const fast = run(start, 1, 6);
    const braked = run(fast, -1, 3);
    expect(braked.speedMs).toBeLessThan(fast.speedMs);
    expect(braked.regenKwhTotal).toBeGreaterThan(0);
    expect(braked.socPct).toBeGreaterThan(fast.socPct);
  });
});
