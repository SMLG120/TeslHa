import { describe, expect, it } from "vitest";
import { families, bodyFor } from "@/data/vehicles";
import { CarSurface } from "@/lib/car-design/surface";
import { DESIGNS } from "@/lib/car-design/designs";
import { buildCar } from "@/components/three/car-mesh";

const bodies = families.flatMap((f) => f.generations.map((g) => ({ name: `${f.id}/${g.id}`, body: bodyFor(f, g.id) })));

describe("procedural car design", () => {
  it("has a distinct design for every family and generation", () => {
    const ids = new Set(bodies.map((b) => b.body.design));
    expect(ids.size).toBe(Object.keys(DESIGNS).length);
  });

  it.each(bodies)("$name: surface matches published dimensions", ({ body }) => {
    const s = new CarSurface(body);
    let maxY = 0;
    let maxZ = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      for (let j = 0; j < 64; j++) {
        const [x, y, z] = s.body(t, j / 64);
        expect(Number.isFinite(x + y + z)).toBe(true);
        maxZ = Math.max(maxZ, Math.abs(z));
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      if (t > s.glass[0] && t < s.glass[1]) maxY = Math.max(maxY, s.glassAt(t, 0.5)[1]);
    }
    expect(maxX - minX).toBeCloseTo(body.lengthMm / 1000, 2);
    expect(maxZ * 2).toBeLessThanOrEqual(body.widthMm / 1000 + 1e-6);
    expect(maxZ * 2).toBeGreaterThan((body.widthMm / 1000) * 0.95);
    // Roof height within 1.5% of the published height.
    expect(Math.abs(maxY - body.heightMm / 1000) / (body.heightMm / 1000)).toBeLessThan(0.015);
  });

  it.each(bodies)("$name: wheels clear the body and sit inside the arches", ({ body }) => {
    const s = new CarSurface(body);
    for (const ax of [s.frontAxleX, s.rearAxleX]) {
      const sec = s.section(s.tAt(ax));
      expect(sec.bottom).toBeGreaterThan(s.wheelR * 2);
      expect(sec.top).toBeGreaterThan(sec.bottom);
    }
    expect(s.frontAxleX - s.rearAxleX).toBeCloseTo(body.wheelbaseMm / 1000, 6);
  });

  it.each(bodies)("$name: greenhouse stays inside the body footprint", ({ body }) => {
    const s = new CarSurface(body);
    for (let i = 1; i < 40; i++) {
      const t = s.glass[0] + ((s.glass[1] - s.glass[0]) * i) / 40;
      const [, , z] = s.glassAt(t, 0);
      expect(Math.abs(z)).toBeLessThan(s.section(t).halfWidth);
    }
  });

  it.each(bodies)("$name: mesh builds without NaNs and with every opening", ({ body }) => {
    const s = new CarSurface(body);
    const car = buildCar(s, true);
    for (const g of [car.body, car.glass, car.head, car.tail]) {
      const a = g.getAttribute("position").array as Float32Array;
      expect(a.length).toBeGreaterThan(0);
      expect(a.every(Number.isFinite)).toBe(true);
    }
    const kinds = car.openings.map((o) => o.kind);
    expect(kinds.filter((k) => k === "door" || k === "falcon").length).toBe((s.design.doors.length - 1) * 2);
    expect(kinds.includes("frunk")).toBe(!!s.design.frunk);
    expect(kinds.includes("trunk")).toBe(true);
  });
});
