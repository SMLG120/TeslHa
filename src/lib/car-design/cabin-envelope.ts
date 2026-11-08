/**
 * Usable passenger volume, sampled from the real body and greenhouse surfaces. A bounding box
 * cannot describe a curved roof or a tapered cabin, so every query solves against the surface
 * at the given station. Geometry tests use this; the renderer never runs it per frame.
 */
import type { CarSurface } from "./surface";
import { PACKAGING, type VehicleFrame } from "./vehicle-frame";

/** Glass plus headliner thickness. */
export const LINER = 0.015;

export type Constraint = "floor" | "roof" | "side" | "wheelhouse" | "cowl" | "tail";

export interface Clearance {
  value: number;
  constraint: Constraint;
}

export class CabinEnvelope {
  constructor(
    readonly s: CarSurface,
    readonly frame: VehicleFrame,
  ) {}

  private solveGlass(t: number, axis: 1 | 2, target: number) {
    // Over v ∈ [0, 0.5] y rises and z falls monotonically.
    let lo = 0;
    let hi = 0.5;
    const rising = axis === 1;
    for (let i = 0; i < 28; i++) {
      const v = (lo + hi) / 2;
      const value = this.s.glassAt(t, v)[axis];
      if (value < target === rising) lo = v;
      else hi = v;
    }
    return this.s.glassAt(t, (lo + hi) / 2);
  }

  private inGlass(t: number) {
    return t > this.s.glass[0] && t < this.s.glass[1];
  }

  /** Underside of the greenhouse at station x, lateral z. */
  ceiling(x: number, z: number) {
    const t = this.s.tAt(x);
    const az = Math.abs(z);
    if (!this.inGlass(t)) return this.s.beltPoint(t)[1] - LINER;
    const base = this.s.glassAt(t, 0);
    if (az >= base[2]) return base[1] - LINER;
    return this.solveGlass(t, 2, az)[1] - LINER;
  }

  /** Clear half-width at (x, y): skin minus `wall` below the belt, glass above it. */
  halfWidth(x: number, y: number, wall: number = PACKAGING.doorCardDepth) {
    const t = this.s.tAt(x);
    const belt = this.s.beltPoint(t);
    if (y <= belt[1] || !this.inGlass(t)) {
      // Over an axle the body ring's lower edge is the arch; below it the limit is the flank (the wheelhouse is checked separately).
      const sec = this.s.section(t);
      const skin = y <= sec.bottom ? sec.halfWidth : this.s.bodyHalfWidthAtY(t, Math.min(y, belt[1]));
      // The ring's crown is opened between the wheelhouses, so inboard of them the cabin is clear.
      const overAxle = [this.frame.frontAxleX, this.frame.rearAxleX].some((ax) => Math.abs(x - ax) < this.frame.archR);
      return Math.max(0, (overAxle ? Math.max(skin, this.frame.wheelhouseZ + wall) : skin) - wall);
    }
    if (y >= this.s.glassAt(t, 0.5)[1]) return 0;
    return Math.max(0, this.solveGlass(t, 1, y)[2] - LINER);
  }

  /** Signed distance outside the wheelhouse volume (positive = clear). */
  wheelhouse(x: number, y: number, z: number) {
    const { frontAxleX, rearAxleX, wheelR, archR, wheelhouseZ } = this.frame;
    const inboard = wheelhouseZ - Math.abs(z);
    let clear = Infinity;
    for (const ax of [frontAxleX, rearAxleX]) clear = Math.min(clear, Math.max(inboard, Math.hypot(x - ax, y - wheelR) - archR));
    return clear;
  }

  /** Smallest clearance of a point to any boundary, with the boundary that governs it. */
  clearance(x: number, y: number, z: number, wall: number = PACKAGING.doorCardDepth): Clearance {
    const checks: Clearance[] = [
      { value: y - this.frame.floorY, constraint: "floor" },
      { value: this.ceiling(x, z) - y, constraint: "roof" },
      { value: this.halfWidth(x, y, wall) - Math.abs(z), constraint: "side" },
      { value: this.wheelhouse(x, y, z), constraint: "wheelhouse" },
      { value: this.frame.cowlX - x, constraint: "cowl" },
      { value: x + this.s.L / 2, constraint: "tail" },
    ];
    return checks.reduce((a, b) => (b.value < a.value ? b : a));
  }

  /** Half-width available over a footprint, respecting walls and wheelhouses. */
  freeHalfWidth(x0: number, x1: number, y0: number, y1: number, wall: number) {
    let free = Infinity;
    for (let i = 0; i <= 6; i++) {
      const x = x0 + ((x1 - x0) * i) / 6;
      for (let j = 0; j <= 4; j++) {
        const y = y0 + ((y1 - y0) * j) / 4;
        free = Math.min(free, this.halfWidth(x, y, wall));
        for (const ax of [this.frame.frontAxleX, this.frame.rearAxleX]) {
          if (Math.hypot(x - ax, y - this.frame.wheelR) < this.frame.archR) free = Math.min(free, this.frame.wheelhouseZ);
        }
      }
    }
    return free;
  }
}
