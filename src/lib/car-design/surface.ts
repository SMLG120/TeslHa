import type { BodyGeometry } from "@/types/vehicle";
import { DESIGNS, type CarDesign, type Curve } from "./designs";

/**
 * Parametric car surface (pure math, no three.js), so the same shape drives the WebGL mesh,
 * SVG thumbnails and unit tests.
 *
 * World frame: front of the car faces +X, ground is y = 0, right flank is +Z, metres.
 */

export type Vec3 = [number, number, number];

/** Monotone cubic (Fritsch–Carlson) interpolation: smooth, never overshoots the control points. */
export function monotone(points: Curve): (x: number) => number {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const n = xs.length;
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
    );
  };
}

/** Signed superellipse term: sgn(a)·|a|^(2/n). */
const se = (a: number, n: number) => Math.sign(a) * Math.pow(Math.abs(a), 2 / n);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Length (in t) over which the glass blends onto the body at the windshield base and tail. */
const GLASS_END_BLEND = 0.03;

export interface Section {
  x: number;
  bottom: number;
  shoulder: number;
  top: number;
  halfWidth: number;
}

export class CarSurface {
  readonly design: CarDesign;
  readonly L: number;
  readonly W: number;
  readonly H: number;
  readonly WB: number;
  readonly wheelR: number;
  readonly tireW: number;
  readonly frontAxleX: number;
  readonly rearAxleX: number;
  readonly tFrontAxle: number;
  readonly tRearAxle: number;
  readonly archR: number;
  readonly glass: readonly [number, number];
  /**
   * Body-ring parameter where the greenhouse meets the paint (right side; the left side is 1 − beltU).
   * The body cut-out, the door tops and the glass base all use this one line, so they cannot drift apart.
   */
  readonly beltU: number;
  private readonly topFn: (t: number) => number;
  private readonly roofFn: (t: number) => number;
  private readonly planFn: (t: number) => number;
  private readonly bottomFn: (t: number) => number;

  constructor(body: BodyGeometry) {
    const d = DESIGNS[body.design];
    this.design = d;
    this.L = body.lengthMm / 1000;
    this.W = body.widthMm / 1000;
    this.H = body.heightMm / 1000;
    this.WB = body.wheelbaseMm / 1000;
    this.wheelR = body.wheelDiameterMm / 2000;
    this.tireW = Math.min(0.285, this.W * 0.135);
    this.tFrontAxle = d.frontOverhang / this.L;
    this.tRearAxle = (d.frontOverhang + this.WB) / this.L;
    this.frontAxleX = this.xAt(this.tFrontAxle);
    this.rearAxleX = this.xAt(this.tRearAxle);
    this.archR = this.wheelR + d.archGap;

    this.topFn = monotone(d.bodyTop);
    this.planFn = monotone(d.plan);
    this.bottomFn = monotone([
      [0, d.noseBottom],
      [this.tFrontAxle * 0.7, d.groundClearance],
      [this.tRearAxle + (1 - this.tRearAxle) * 0.3, d.groundClearance],
      [1, d.tailBottom],
    ]);
    // Snap the greenhouse ends onto the beltline so glass meets paint exactly.
    const roof = d.roof.map(([t, y], i) => [t, i === 0 || i === d.roof.length - 1 ? this.topFn(t) : y] as const);
    this.roofFn = monotone(roof);
    this.glass = [roof[0][0], roof[roof.length - 1][0]];
    this.beltU = this.findBeltU();
  }

  /** First u (walking up the flank at mid-cabin) that reaches the beltline or the design's cabin half-width. */
  private findBeltU() {
    const tMid = (this.glass[0] + this.glass[1]) / 2;
    const belt = this.topFn(tMid);
    const maxZ = this.design.beltHalfWidth ?? 0;
    for (let u = 0.25; u < 0.49; u += 0.0025) {
      const [, y, z] = this.body(tMid, u);
      if (y >= belt - 0.03 || z <= maxZ) return u;
    }
    return 0.49;
  }

  xAt(t: number) {
    return this.L / 2 - t * this.L;
  }

  tAt(x: number) {
    return (this.L / 2 - x) / this.L;
  }

  /** Top of the body (hood, beltline, deck) at t, before end closure. */
  beltAt(t: number) {
    return this.topFn(t);
  }

  roofAt(t: number) {
    return t <= this.glass[0] || t >= this.glass[1] ? this.topFn(t) : Math.max(this.roofFn(t), this.topFn(t));
  }

  /** Wheel-arch cut-out height at x (0 when outside both arches). */
  archAt(x: number) {
    let y = 0;
    for (const ax of [this.frontAxleX, this.rearAxleX]) {
      const dx = x - ax;
      if (Math.abs(dx) < this.archR) y = Math.max(y, this.wheelR + Math.sqrt(this.archR * this.archR - dx * dx));
    }
    return y;
  }

  section(t: number): Section {
    const d = this.design;
    const x = this.xAt(t);
    let top = this.topFn(t);
    let bottom = Math.max(this.bottomFn(t), this.archAt(x));
    // Keep at least a thin fender skin above the arch.
    bottom = Math.min(bottom, top - 0.05);
    let shoulder = bottom + (top - bottom) * d.shoulder;
    let halfWidth = (this.W / 2) * this.planFn(t);

    // Rounded nose / tail closures.
    const front = t * this.L;
    const rear = (1 - t) * this.L;
    let k = 1;
    if (front < d.noseLen) {
      const e = 1 - front / d.noseLen;
      k = Math.pow(Math.max(0, 1 - Math.pow(e, d.noseP)), 1 / d.noseP);
    } else if (rear < d.tailLen) {
      const e = 1 - rear / d.tailLen;
      k = Math.pow(Math.max(0, 1 - Math.pow(e, d.tailP)), 1 / d.tailP);
    }
    if (k < 1) {
      // Shrink toward a low nose point (bumper height) / mid-height tail point, so the hood
      // slopes down into the nose instead of ending in a tall rounded wall.
      const tip = bottom + (top - bottom) * (front < rear ? 0.4 : 0.52);
      const kv = Math.pow(k, 0.8);
      top = tip + (top - tip) * kv;
      bottom = tip - (tip - bottom) * kv;
      halfWidth *= k;
      shoulder = bottom + (top - bottom) * d.shoulder;
    }
    return { x, bottom, shoulder, top, halfWidth };
  }

  /** Point on the painted body at (t, u). */
  body(t: number, u: number, sec = this.section(t)): Vec3 {
    const d = this.design;
    const th = ((((u % 1) + 1) % 1) * 2 - 0.5) * Math.PI;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const y = s >= 0 ? sec.shoulder + (sec.top - sec.shoulder) * se(s, d.nTop) : sec.shoulder + (sec.shoulder - sec.bottom) * se(s, d.nBottom);
    const tuck = s >= 0 ? 1 - 0.05 * s * s : 1 - 0.12 * s * s;
    const z = sec.halfWidth * se(c, d.nSide) * tuck;
    return [sec.x, y, z];
  }

  /** Half-width of the painted body at height y (exact inverse of the section shape in `body`). */
  bodyHalfWidthAtY(t: number, y: number) {
    const sec = this.section(t);
    const d = this.design;
    if (y >= sec.top || y <= sec.bottom) return 0;
    const upper = y >= sec.shoulder;
    const r = upper ? (y - sec.shoulder) / (sec.top - sec.shoulder) : (sec.shoulder - y) / (sec.shoulder - sec.bottom);
    const s = Math.pow(clamp01(r), (upper ? d.nTop : d.nBottom) / 2);
    const c = Math.sqrt(Math.max(0, 1 - s * s));
    return sec.halfWidth * se(c, d.nSide) * (1 - (upper ? 0.05 : 0.12) * s * s);
  }

  /** Point on the belt junction at t (right side): shared by the body cut-out and the glass base. */
  beltPoint(t: number): Vec3 {
    return this.body(t, this.beltU);
  }

  /**
   * Point on the greenhouse (glass) at (t, v). The base is exactly the belt junction; over the last
   * few percent at each end the surface blends onto the body top so the seal has no gap.
   */
  glassAt(t: number, v: number): Vec3 {
    const sec = this.section(t);
    const [x, base, hwBase] = this.body(t, this.beltU, sec);
    const roof = Math.max(this.roofAt(t), base);
    const vv = clamp01(v);
    const th = vv * Math.PI;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const y = base + (roof - base) * se(s, 3.2);
    const hw = hwBase + (hwBase * this.design.tumblehome - hwBase) * Math.pow(s, 1.6);
    const z = hw * se(c, 3.2);
    const edge = Math.min(t - this.glass[0], this.glass[1] - t) / GLASS_END_BLEND;
    if (edge >= 1) return [x, y, z];
    const k = edge <= 0 ? 0 : edge * edge * (3 - 2 * edge);
    const seal = this.body(t, this.beltU + (1 - 2 * this.beltU) * vv, sec);
    return [x, seal[1] + (y - seal[1]) * k, seal[2] + (z - seal[2]) * k];
  }

  /** Numerical outward normal of a parametric surface. */
  static normal(f: (a: number, b: number) => Vec3, a: number, b: number, ea = 1e-4, eb = 1e-4): Vec3 {
    const p0 = f(a - ea, b);
    const p1 = f(a + ea, b);
    const q0 = f(a, b - eb);
    const q1 = f(a, b + eb);
    const da: Vec3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const db: Vec3 = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]];
    // outward = d/du × d/dt (see winding notes in car-mesh.ts)
    const n: Vec3 = [db[1] * da[2] - db[2] * da[1], db[2] * da[0] - db[0] * da[2], db[0] * da[1] - db[1] * da[0]];
    const len = Math.hypot(...n) || 1;
    return [n[0] / len, n[1] / len, n[2] / len];
  }

  /** Side-view outline for 2D thumbnails: upper line (max of body/glass) and lower line (incl. arches). */
  sideProfile(samples = 120): { upper: [number, number][]; lower: [number, number][] } {
    const upper: [number, number][] = [];
    const lower: [number, number][] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const sec = this.section(t);
      const roof = t > this.glass[0] && t < this.glass[1] ? this.roofAt(t) : sec.top;
      upper.push([sec.x, Math.max(sec.top, roof)]);
      lower.push([sec.x, sec.bottom]);
    }
    return { upper, lower };
  }
}

const cache = new WeakMap<BodyGeometry, CarSurface>();
export function surfaceFor(body: BodyGeometry) {
  let s = cache.get(body);
  if (!s) {
    s = new CarSurface(body);
    cache.set(body, s);
  }
  return s;
}
