import { beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { families } from "@/data/vehicles";
import { CarSurface, surfaceFor } from "@/lib/car-design/surface";
import { cabinFor, cabinLayout, type CabinLayout } from "@/lib/car-design/cabin";
import { buildCar } from "@/components/three/car-mesh";
import { checkSeats, checkShell, checkSteering, panelMatrix, validateVehicle, type Check } from "@/lib/car-design/geometry-validation";
import { useStudio } from "@/stores/studio";

const bodies = families.flatMap((f) => f.generations.map((g) => ({ name: `${f.id}/${g.id}`, body: g.body ?? f.body })));
const byName = (name: string) => bodies.find((b) => b.name === name)!.body;
const failed = (checks: Check[]) => checks.filter((c) => !c.pass).map((c) => c.id);

describe("every vehicle passes full geometric validation", () => {
  it.each(bodies)("$name", ({ body }) => {
    const r = validateVehicle(surfaceFor(body));
    expect(r.checks.length).toBeGreaterThan(40);
    expect(r.failures.map((f) => `${f.id}=${f.value} ${f.detail}`)).toEqual([]);
  }, 60000);
});

describe("the validator rejects broken geometry", () => {
  const s = surfaceFor(byName("model-s/lr"));
  const cabin = cabinFor(s);
  const withSteering = (patch: Partial<CabinLayout["steering"]>): CabinLayout => ({ ...cabin, steering: { ...cabin.steering, ...patch } });

  it("fails when the steering wheel passes through the windshield", () => {
    const [x, y, z] = cabin.steering.center;
    const ids = failed(checkSteering(withSteering({ center: [x + 0.8, y + 0.5, z] })));
    expect(ids).toContain("rim-inside-cabin");
    expect(ids).toContain("rim-behind-dash");
  });

  it("fails when the steering wheel is pushed through the door", () => {
    const [x, y] = cabin.steering.center;
    expect(failed(checkSteering(withSteering({ center: [x, y, -1.0] })))).toContain("rim-inside-cabin");
  });

  it("fails when a seat is pushed through a door or the roof", () => {
    const moved = (dy: number, dz: number): CabinLayout => ({
      ...cabin,
      seats: cabin.seats.map((p, i) => (i === 0 ? { ...p, hip: [p.hip[0], p.hip[1] + dy, p.hip[2] + dz] } : p)),
    });
    expect(failed(checkSeats(moved(0, -0.5)))).toContain("seat-0-inside-cabin");
    expect(failed(checkSeats(moved(0.6, 0)))).toEqual(expect.arrayContaining(["seat-0-inside-cabin", "seat-0-headrest-under-roof"]));
  });

  it("fails when a rear seat is out of line or off-centre", () => {
    const rear = cabin.seats.findIndex((p) => p.row === 1);
    const broken: CabinLayout = { ...cabin, seats: cabin.seats.map((p, i) => (i === rear ? { ...p, hip: [p.hip[0] + 0.05, p.hip[1], p.hip[2] + 0.04] } : p)) };
    expect(failed(checkSeats(broken))).toEqual(expect.arrayContaining(["row-2-level", "row-2-mirrored"]));
  });

  it("fails when a door no longer fits its opening", () => {
    const car = buildCar(s, true);
    const door = car.openings.find((o) => o.door === 0)!;
    door.paint.translate(0.04, 0, 0);
    expect(failed(checkShell(s, car, cabin)).some((id) => id.endsWith("edges-on-opening"))).toBe(true);
  });
});

describe("doors and roof", () => {
  it.each(bodies)("$name: panels return exactly to closed and pivot about the hinge", ({ body }) => {
    const car = buildCar(surfaceFor(body), true);
    for (const o of car.openings) {
      expect(panelMatrix(o, 0).equals(new THREE.Matrix4())).toBe(true);
      const hinge = new THREE.Vector3(...o.hinge);
      expect(hinge.clone().applyMatrix4(panelMatrix(o, o.angle)).distanceTo(hinge)).toBeLessThan(1e-6);
      // The same damping the renderer uses settles on closed.
      let a = o.angle;
      for (let i = 0; i < 600; i++) a = THREE.MathUtils.damp(a, 0, 3.6, 1 / 60);
      expect(Math.abs(a)).toBeLessThan(1e-3);
    }
  });

  it("falcon doors hinge at their own top edge, one on each side of the roof spine", () => {
    const s = surfaceFor(byName("model-x/x"));
    const falcons = buildCar(s, true).openings.filter((o) => o.kind === "falcon");
    expect(falcons).toHaveLength(2);
    expect(falcons[0].hinge[2]).toBeCloseTo(-falcons[1].hinge[2], 5);
    expect(Math.abs(falcons[0].hinge[2])).toBeGreaterThan(0.03);
  });

  it("exploded view is off by default and cleared when switching vehicles", () => {
    expect(useStudio.getState().exploded).toBe(false);
    expect(useStudio.getState().showComponents).toBe(false);
    useStudio.getState().set({ exploded: true });
    useStudio.getState().resetVehicle();
    expect(useStudio.getState().exploded).toBe(false);
  });
});

describe("stability", () => {
  beforeEach(() => useStudio.getState().reset());
  it.each(bodies)("$name: layout is deterministic and independent of the camera view", ({ body }) => {
    const strip = (c: CabinLayout) => JSON.stringify({ ...c, envelope: undefined });
    const a = strip(cabinLayout(new CarSurface(body)));
    for (const view of ["front", "interior", "top"] as const) useStudio.getState().setView(view);
    expect(strip(cabinLayout(new CarSurface(body)))).toBe(a);
  });

  it("the cabins are model-specific rather than resized copies", () => {
    const s = cabinFor(surfaceFor(byName("model-s/lr")));
    const r = cabinFor(surfaceFor(byName("roadster/gen2")));
    expect(r.spec.rows).toEqual([2]);
    expect(r.seats[0].hip[1] - r.floorY).toBeLessThan(s.seats[0].hip[1] - s.floorY - 0.05);
    expect(r.steering.tilt).toBeLessThan(s.steering.tilt);
  });
});
