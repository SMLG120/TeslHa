import { describe, expect, it } from "vitest";
import { families } from "@/data/vehicles";
import { CarSurface } from "@/lib/car-design/surface";
import { cabinLayout } from "@/lib/car-design/cabin";
import { CABINS } from "@/lib/car-design/designs";

const bodies = families.flatMap((f) => f.generations.map((g) => ({ name: `${f.id}/${g.id}`, body: g.body ?? f.body })));

describe("cabin packaging", () => {
  it.each(bodies)("$name: seat count matches the cabin spec", ({ body }) => {
    const c = cabinLayout(new CarSurface(body));
    expect(c.seats).toHaveLength(c.spec.rows.reduce((a, b) => a + b, 0));
  });

  it.each(bodies)("$name: seats sit inside the body and under the roof", ({ body }) => {
    const s = new CarSurface(body);
    const c = cabinLayout(s);
    for (const seat of c.seats) {
      const [x, y, z] = seat.hip;
      expect(y).toBeGreaterThan(c.floorY);
      expect(Math.abs(z) + seat.width / 2).toBeLessThan(s.bodyHalfWidthAtY(s.tAt(x), y + 0.3));
      // Head-restraint top (hip + ~0.9 m scaled) stays below the roof.
      expect(y + 0.86 * seat.fit).toBeLessThan(s.roofAt(s.tAt(x - 0.15)));
      expect(x).toBeLessThan(c.dashX);
      expect(x).toBeGreaterThan(-s.L / 2);
    }
  });

  it.each(bodies)("$name: eye points are inside the cabin, below the roof", ({ body }) => {
    const s = new CarSurface(body);
    const c = cabinLayout(s);
    for (const e of [c.eyes.driver, c.eyes.passenger, c.eyes.rear].filter(Boolean) as [number, number, number][]) {
      expect(e[1]).toBeLessThan(s.roofAt(s.tAt(e[0])));
      expect(e[1]).toBeGreaterThan(s.beltAt(s.tAt(e[0])) - 0.1);
      expect(Math.abs(e[2])).toBeLessThan(c.halfIn);
    }
    // Left-hand drive: driver on -Z.
    expect(c.eyes.driver[2]).toBeLessThan(0);
  });

  it.each(bodies)("$name: wheel, dash and screen are packaged ahead of the driver", ({ body }) => {
    const s = new CarSurface(body);
    const c = cabinLayout(s);
    expect(c.dashX).toBeLessThan(c.cowlX);
    expect(c.wheel.center[0]).toBeGreaterThan(c.eyes.driver[0] + 0.3);
    expect(c.wheel.center[0]).toBeLessThan(c.dashX);
    if (c.screen) {
      const top = c.screen.center[1] + c.screen.h / 2;
      expect(top).toBeLessThan(s.roofAt(s.tAt(c.screen.center[0])));
      expect(c.screen.w / 2).toBeLessThan(c.halfIn);
    }
  });

  it.each(bodies)("$name: every interior camera preset is finite", ({ body }) => {
    const c = cabinLayout(new CarSurface(body));
    for (const v of Object.values(c.views)) for (const n of [...v.pos, ...v.target]) expect(Number.isFinite(n)).toBe(true);
  });

  it("cabin specs follow the official pages", () => {
    expect(CABINS["model-s"].screen?.diagIn).toBe(17.4);
    expect(CABINS["model-s"].rearScreen?.diagIn).toBe(9.4);
    expect(CABINS["model-3"].screen?.diagIn).toBe(16);
    expect(CABINS["model-y"].screen?.diagIn).toBe(16);
    expect(CABINS["model-x"].rows.reduce((a, b) => a + b, 0)).toBe(6);
    expect(CABINS["roadster-gen2"].rows).toEqual([2]);
    expect(CABINS["roadster-gen2"].steering).toBe("yoke");
    expect(CABINS["roadster-gen2"].forwardDisplays).toBe(true);
    for (const c of Object.values(CABINS)) expect(c.sources.length).toBeGreaterThan(0);
  });
});
