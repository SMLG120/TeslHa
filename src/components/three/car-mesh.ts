import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CarSurface, type Vec3 } from "@/lib/car-design/surface";
import type { LightPatch, RimStyle } from "@/lib/car-design/designs";
import { cabinFor } from "@/lib/car-design/cabin";
import { PACKAGING, wheelhouseInnerZ } from "@/lib/car-design/vehicle-frame";

/**
 * Builds three.js geometry from a CarSurface.
 *
 * Grid winding: for a surface P(a, b) with a along the car and b around it, triangles
 * (i,j)→(i,j+1)→(i+1,j) give normals along ∂P/∂b × ∂P/∂a, which points outward for
 * both the body ring and the greenhouse.
 */

type Fn = (a: number, b: number) => Vec3;

/** Top-of-body u band used for the frunk and trunk lids. */
export const LID_U: readonly [number, number] = [0.37, 0.63];

interface GridOptions {
  closedB?: boolean;
  offset?: number;
  skip?: (am: number, bm: number) => boolean;
  /** Material group per face (0 by default). */
  group?: (am: number, bm: number) => number;
  /** Normal used where the numerical normal degenerates (poles). */
  poleNormal?: (a: number) => Vec3;
}

function grid(f: Fn, as: number[], bs: number[], o: GridOptions = {}) {
  const na = as.length;
  const nb = bs.length;
  const pos = new Float32Array(na * nb * 3);
  const nor = new Float32Array(na * nb * 3);
  const uv = new Float32Array(na * nb * 2);
  for (let i = 0; i < na; i++) {
    for (let j = 0; j < nb; j++) {
      const k = i * nb + j;
      const p = f(as[i], bs[j]);
      let n = CarSurface.normal(f, as[i], bs[j]);
      if (!Number.isFinite(n[0]) || Math.hypot(...n) < 0.5 || isPoleish(f, as[i], bs[j])) n = o.poleNormal?.(as[i]) ?? n;
      const off = o.offset ?? 0;
      pos[k * 3] = p[0] + n[0] * off;
      pos[k * 3 + 1] = p[1] + n[1] * off;
      pos[k * 3 + 2] = p[2] + n[2] * off;
      nor[k * 3] = n[0];
      nor[k * 3 + 1] = n[1];
      nor[k * 3 + 2] = n[2];
      uv[k * 2] = (as[i] - as[0]) / (as[na - 1] - as[0] || 1);
      uv[k * 2 + 1] = (bs[j] - bs[0]) / (bs[nb - 1] - bs[0] || 1);
    }
  }
  const buckets = new Map<number, number[]>();
  const jMax = o.closedB ? nb : nb - 1;
  for (let i = 0; i < na - 1; i++) {
    for (let j = 0; j < jMax; j++) {
      const j1 = (j + 1) % nb;
      const bNext = o.closedB && j1 === 0 ? bs[0] + 1 : bs[j1];
      const am = (as[i] + as[i + 1]) / 2;
      const bm = (bs[j] + bNext) / 2;
      if (o.skip?.(am, bm)) continue;
      const g = o.group?.(am, bm) ?? 0;
      const a = i * nb + j;
      const b = (i + 1) * nb + j;
      const c = (i + 1) * nb + j1;
      const d = i * nb + j1;
      let list = buckets.get(g);
      if (!list) buckets.set(g, (list = []));
      list.push(a, d, b, b, d, c);
    }
  }
  const index: number[] = [];
  const geo = new THREE.BufferGeometry();
  [...buckets.keys()].sort((x, y) => x - y).forEach((g) => {
    const list = buckets.get(g)!;
    geo.addGroup(index.length, list.length, g);
    index.push(...list);
  });
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

/** True where all neighbouring samples around b collapse to one point (nose/tail pole). */
function isPoleish(f: Fn, a: number, b: number) {
  const p = f(a, b);
  const q = f(a, b + 0.25);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-5;
}

function range(lo: number, hi: number, n: number) {
  return Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n);
}

function merge(list: number[], forced: number[], lo: number, hi: number) {
  const all = [...list, ...forced.filter((x) => x >= lo && x <= hi)].sort((a, b) => a - b);
  return all.filter((x, i) => i === 0 || x - all[i - 1] > 1e-6);
}

const inBand = (x: number, [lo, hi]: readonly [number, number]) => x > lo && x < hi;
const mirrorBand = ([lo, hi]: readonly [number, number]) => [1 - hi, 1 - lo] as const;

export interface Opening {
  kind: "door" | "falcon" | "frunk" | "trunk";
  /** Pivot in vehicle space. */
  hinge: Vec3;
  axis: "x" | "y" | "z";
  /** Open angle (radians, signed). */
  angle: number;
  paint: THREE.BufferGeometry;
  glass: THREE.BufferGeometry | null;
  detail: THREE.BufferGeometry | null;
  /** Inner door card, following the skin. Doors only. */
  inner: THREE.BufferGeometry | null;
  /** Index into the design's door bands (doors only). */
  door: number | null;
  /** Grid bands of this panel, used to test that it fits its opening. */
  band: readonly [number, number];
  uBand: readonly [number, number];
}

export interface CarMeshes {
  body: THREE.BufferGeometry;
  liner: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  openings: Opening[];
  seams: THREE.BufferGeometry;
  trim: THREE.BufferGeometry;
  housings: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  drl: THREE.BufferGeometry | null;
  tail: THREE.BufferGeometry;
  chargePort: Vec3;
  mirrors: { position: Vec3; side: 1 | -1 }[];
}

export function buildCar(s: CarSurface, low = false): CarMeshes {
  const d = s.design;
  const nT = low ? 110 : 240;
  const nU = low ? 44 : 96;
  const nV = low ? 18 : 40;
  const [g0, g1] = s.glass;
  const doorBands = d.doors.slice(0, -1).map((t0, i) => [t0, d.doors[i + 1]] as const);
  // Cabin opening: everything above the belt junction. The glass base is built on the same line.
  const uc = s.beltU;
  const cabinU: readonly [number, number] = [uc, 1 - uc];
  // The opening runs from the dash to the rear bulkhead; the strips ahead of and behind it stay
  // closed as a dark cowl and parcel shelf, so the dash has something to tuck beneath.
  const cabin = cabinFor(s);
  const cabinT: readonly [number, number] = [s.tAt(cabin.dashFrontX), s.tAt(cabin.rearX)];
  // Door skins stop at the cabin opening so no panel reaches into the cabin.
  const doorU: readonly [number, number] = [d.doorU[0], Math.min(d.doorU[1], uc)];
  const doorUL = mirrorBand(doorU);
  const isFalcon = (i: number) => d.id === "model-x" && i === 1;
  const doorVFor = (i: number) => (isFalcon(i) ? d.doorV : Math.min(d.doorV, 0.32));

  // ── Parameter grids, with every cut line forced onto a grid line ─────────────────────
  const archEdges = [s.tFrontAxle, s.tRearAxle].flatMap((ta) => {
    const dt = s.archR / s.L;
    return [ta - dt, ta - dt * 0.98, ta + dt * 0.98, ta + dt];
  });
  const lidT = [...(d.frunk ?? []), ...d.trunk.t];
  const ts = merge(
    // denser near the ends where the closures curve fastest
    range(0, 1, nT).map((t) => 0.5 - 0.5 * Math.cos(Math.PI * (0.18 * t + 0.82 * (0.5 - 0.5 * Math.cos(Math.PI * t))))),
    [...d.doors, ...lidT, g0, g1, cabinT[0], cabinT[1], ...archEdges],
    0,
    1,
  );
  const us = merge(range(0, 1, nU).slice(0, -1), [doorU[0], doorU[1], doorUL[0], doorUL[1], LID_U[0], LID_U[1], cabinU[0], cabinU[1]], 0, 0.999999);
  const liftV: readonly [number, number] = [0.1, 0.9];
  const vs = merge(range(0, 1, nV), [...doorBands.flatMap((_, i) => [doorVFor(i), 1 - doorVFor(i)]), liftV[0], liftV[1]], 0, 1);
  const tsGlass = merge(ts.filter((t) => t > g0 && t < g1), [g0, g1], g0, g1);

  const bodyFn: Fn = (t, u) => s.body(t, u);
  const glassFn: Fn = (t, v) => s.glassAt(t, v);
  const pole = (t: number): Vec3 => (t < 0.5 ? [1, 0, 0] : [-1, 0, 0]);

  // ── Cut-outs ────────────────────────────────────────────────────────────────────────
  const inDoorBody = (t: number, u: number) =>
    doorBands.some((band) => inBand(t, band)) && (inBand(u, doorU) || inBand(u, doorUL));
  const inFrunk = (t: number, u: number) => !!d.frunk && inBand(t, d.frunk) && inBand(u, LID_U);
  const deckBand: readonly [number, number] = d.trunk.liftback ? [g1, d.trunk.t[1]] : d.trunk.t;
  const inDeck = (t: number, u: number) => inBand(t, deckBand) && inBand(u, LID_U);
  // The loft is a closed tube: open its top under the greenhouse so the cabin is visible and enterable.
  const inCabin = (t: number, u: number) => inBand(t, cabinT) && inBand(u, cabinU);
  const inCowlOrShelf = (t: number, u: number) => inBand(t, [g0, g1]) && inBand(u, cabinU) && !inCabin(t, u);
  // The body ring rises over each axle so the arches read from outside. Between the wheelhouses
  // that crown would cut through the cabin floor and rear seats, so it is opened there.
  const wellZ = wheelhouseInnerZ(s);
  // The margin covers the step where the ring drops back to the sill just outside the arch.
  const crownT = [s.tFrontAxle, s.tRearAxle].map((ta) => [ta - (s.archR + 0.06) / s.L, ta + (s.archR + 0.06) / s.L] as const);
  const inAxleCrown = (t: number, u: number) =>
    inBand(t, cabinT) && crownT.some((b) => inBand(t, b)) && (u < 0.25 || u > 0.75) && Math.abs(s.body(t, u)[2]) < wellZ + 0.05; // the margin stays hidden inside the wheelhouse shell
  const inDoorGlass = (t: number, v: number) =>
    doorBands.some((band, i) => inBand(t, band) && (v < doorVFor(i) || v > 1 - doorVFor(i)));
  const inLiftGlass = (t: number, v: number) => d.trunk.liftback && inBand(t, [d.trunk.t[0], g1]) && inBand(v, liftV);

    // Dark underbody only between the nose/tail caps; on the caps the same u band faces forward/back.
  const capF = d.noseLen / s.L;
  const capR = 1 - d.tailLen / s.L;
  const underside = (t: number, u: number) => (((u < 0.1 || u > 0.9) && t > capF && t < capR) || inCowlOrShelf(t, u) ? 1 : 0);
  const body = grid(bodyFn, ts, us, {
    closedB: true,
    skip: (t, u) => inDoorBody(t, u) || inFrunk(t, u) || inDeck(t, u) || inCabin(t, u) || inAxleCrown(t, u),
    group: underside,
    poleNormal: pole,
  });
  // Every cut line stays on the liner's coarser grid so openings have clean edges.
  const linerT = merge(ts.filter((_, i) => i % 3 === 0), [...d.doors, cabinT[0], cabinT[1], ...archEdges, 1], 0, 1);
  const linerU = merge(us.filter((_, i) => i % 2 === 0), [doorU[0], doorU[1], doorUL[0], doorUL[1], cabinU[0], cabinU[1]], 0, 0.999999);
  const liner = grid(bodyFn, linerT, linerU, {
    closedB: true,
    offset: -0.025,
    skip: (t, u) => inCabin(t, u) || inDoorBody(t, u) || inAxleCrown(t, u),
    poleNormal: pole,
  });
  // Opaque black glass roof between windshield header and rear-glass header (Tesla-style panoramic roof).
  // Roof = the part of the greenhouse whose centre line faces mostly upward.
  const roofTs = tsGlass.filter((t) => t > g0 + 0.02 && t < g1 - 0.02 && CarSurface.normal(glassFn, t, 0.5)[1] > 0.78);
  const roofBand: readonly [number, number] = [roofTs[0] ?? g0, roofTs[roofTs.length - 1] ?? g1];
  const roofV: readonly [number, number] = [0.27, 0.73];
  const glass = grid(glassFn, tsGlass, merge(vs, [...roofV], 0, 1), {
    skip: (t, v) => inDoorGlass(t, v) || inLiftGlass(t, v),
    group: (t, v) => (inBand(t, roofBand) && inBand(v, roofV) ? 1 : 0),
  });

  const sub = (list: number[], [lo, hi]: readonly [number, number]) => list.filter((x) => x >= lo - 1e-9 && x <= hi + 1e-9);

  // ── Openings ────────────────────────────────────────────────────────────────────────
  const openings: Opening[] = [];
  doorBands.forEach((band, i) => {
    const falcon = isFalcon(i);
    for (const side of [1, -1] as const) {
      const uBand = side === 1 ? doorU : doorUL;
      const paint = grid(bodyFn, sub(ts, band), sub(us, uBand));
      const gBand: readonly [number, number] = [Math.max(band[0], g0), Math.min(band[1], g1)];
      const vBand: readonly [number, number] = side === 1 ? [0, doorVFor(i)] : [1 - doorVFor(i), 1];
      // A falcon door carries its share of the opaque roof, so the roof reads as one surface when closed.
      const glassGroup = falcon ? { group: (t: number, v: number) => (inBand(t, roofBand) && inBand(v, roofV) ? 1 : 0) } : {};
      const gvs = falcon ? merge(sub(vs, vBand), [...roofV].filter((v) => inBand(v, vBand)), 0, 1) : sub(vs, vBand);
      const glassPart = gBand[1] > gBand[0] ? grid(glassFn, sub(tsGlass, gBand), gvs, glassGroup) : null;
      const inner = grid(bodyFn, sub(ts, band), sub(us, uBand), { offset: -PACKAGING.doorCardDepth });
      // Flush handle near the trailing upper edge.
      const th = band[1] - 0.14 / s.L;
      const uh = side === 1 ? uBand[1] - 0.045 : uBand[0] + 0.045;
      const handle = patch(bodyFn, [th - 0.075 / s.L, th + 0.075 / s.L], [uh - 0.006, uh + 0.006], 0.004);
      const common = { paint, glass: glassPart, detail: handle, inner, door: i, band, uBand };
      if (falcon) {
        const tm = (band[0] + band[1]) / 2;
        // Hinged along the door's top edge, beside the fixed roof spine.
        const top = s.glassAt(tm, side === 1 ? d.doorV : 1 - d.doorV);
        openings.push({ kind: "falcon", hinge: [s.xAt(tm), top[1], top[2]], axis: "x", angle: -side * 1.25, ...common });
      } else {
        const hingeP = s.body(band[0], (uBand[0] + uBand[1]) / 2);
        if (d.doorHinge === "scissor") {
          // Lifts upward about a transverse axis at the door's front edge.
          openings.push({ kind: "door", hinge: [s.xAt(band[0]), s.beltAt(band[0]), hingeP[2]], axis: "z", angle: -1.15, ...common });
        } else {
          openings.push({ kind: "door", hinge: [s.xAt(band[0]), hingeP[1], hingeP[2]], axis: "y", angle: side * 1.0, ...common });
        }
      }
    }
  });
  if (d.frunk) {
    const paint = grid(bodyFn, sub(ts, d.frunk), sub(us, LID_U));
    const top = s.body(d.frunk[1], 0.5);
    openings.push({ kind: "frunk", hinge: [s.xAt(d.frunk[1]), top[1], 0], axis: "z", angle: 0.85, paint, glass: null, detail: null, inner: null, door: null, band: d.frunk, uBand: LID_U });
  }
  {
    const paint = grid(bodyFn, sub(ts, deckBand), sub(us, LID_U));
    const glassPart = d.trunk.liftback ? grid(glassFn, sub(tsGlass, [d.trunk.t[0], g1]), sub(vs, liftV)) : null;
    const t0 = d.trunk.t[0];
    const hingeY = d.trunk.liftback ? s.roofAt(t0) : s.body(t0, 0.5)[1];
    openings.push({ kind: "trunk", hinge: [s.xAt(t0), hingeY, 0], axis: "z", angle: d.trunk.liftback ? -1.15 : -0.95, paint, glass: glassPart, detail: null, inner: null, door: null, band: deckBand, uBand: LID_U });
  }

  // ── Seams: thin dark strips along every cut line ───────────────────────────────────
  const seamParts: THREE.BufferGeometry[] = [];
  const dt = 0.0022 / s.L;
  const du = 0.0016;
  // Long, thin strips: tessellated along their length so they follow the body instead of dipping under it.
  const seamT = (t: number, band: readonly [number, number]) => seamParts.push(patch(bodyFn, [t - dt, t + dt], band, 0.002, 2, 40));
  const seamU = (u: number, band: readonly [number, number]) => seamParts.push(patch(bodyFn, band, [u - du, u + du], 0.002, 40, 2));
  doorBands.forEach((band) => {
    for (const ub of [doorU, doorUL]) {
      seamT(band[0], ub);
      seamT(band[1], ub);
      seamU(ub === doorU ? ub[0] : ub[1], band);
    }
  });
  for (const band of [d.frunk, deckBand].filter(Boolean) as (readonly [number, number])[]) {
    seamT(band[0], LID_U);
    seamT(band[1], LID_U);
    seamU(LID_U[0], band);
    seamU(LID_U[1], band);
  }
  // B-pillars between front and rear doors.
  if (doorBands.length > 1) {
    const tb = d.doors[1];
    const w = 0.035 / s.L;
    for (const vb of [[0, 0.27], [0.73, 1]] as const) seamParts.push(patch(glassFn, [tb - w, tb + w], vb, 0.003));
  }
  // Window frame. At the roof the rail sits above the side glass; toward each end of the greenhouse it
  // converges on the glass base, becoming the A- and C-pillars at the windshield and rear-glass edges.
  // It stops at a falcon door, which carries that part of the roof with it.
  const railV = Math.max(...doorBands.map((_, i) => (isFalcon(i) ? 0 : doorVFor(i)))) + 0.002;
  const railAt = (t: number) => {
    const k = t < roofBand[0] ? (t - g0) / (roofBand[0] - g0) : t > roofBand[1] ? (g1 - t) / (g1 - roofBand[1]) : 1;
    const e = Math.min(1, Math.max(0, k));
    return 0.03 + (railV - 0.03) * e * e * (3 - 2 * e);
  };
  const railBands = doorBands.some((_, i) => isFalcon(i)) ? ([[g0, d.doors[1]], [d.doors[2], g1]] as const) : ([[g0, g1]] as const);
  const railWidth = 0.035;
  for (const band of railBands) {
    const right: Fn = (t, w) => s.glassAt(t, railAt(t) + w * railWidth);
    const left: Fn = (t, w) => s.glassAt(t, 1 - railAt(t) - (1 - w) * railWidth);
    seamParts.push(patch(right, band, [0, 1], 0.003, 80, 1), patch(left, band, [0, 1], 0.003, 80, 1));
  }
  const seams = mergeGeometries(seamParts.map(stripGroups)) ?? new THREE.BufferGeometry();

  // ── Lights ─────────────────────────────────────────────────────────────────────────
  const lightParts = (list: readonly LightPatch[] | undefined, offset: number, grow = 0) =>
    (list ?? []).flatMap(({ t, u }) => {
      const tt: [number, number] = [t[0] - grow / s.L, t[1] + grow / s.L];
      const uu: [number, number] = [u[0] - grow * 0.6, u[1] + grow * 0.6];
      const centred = u[0] < 0.5 && u[1] > 0.5;
      const bands = centred ? [uu] : [uu, [1 - uu[1], 1 - uu[0]] as [number, number]];
      return bands.map((b) => patch(bodyFn, tt, b, offset));
    });
  const head = mergeGeometries(lightParts(d.lights.head, 0.0035).map(stripGroups))!;
  const tail = mergeGeometries(lightParts(d.lights.tail, 0.0035).map(stripGroups))!;
  const drl = d.lights.drl ? mergeGeometries(lightParts(d.lights.drl, 0.0035).map(stripGroups)) : null;
  const housings = mergeGeometries(
    [...lightParts(d.lights.head, 0.002, 0.012), ...lightParts(d.lights.tail, 0.002, 0.008), ...lightParts(d.lights.drl, 0.002, 0.006)].map(stripGroups),
  )!;

  // ── Trim: charge-port door ────────────────────────────────
  const portT = d.lights.tail[0].t[0] - 0.035;
  const trim = mergeGeometries(
    [
      patch(bodyFn, [portT - 0.014, portT + 0.014], [0.64, 0.675], 0.0025),
    ].map(stripGroups),
  )!;
  const chargePort = s.body(portT, 0.66);

  // ── Mirrors at the A-pillar base ───────────────────────────────────────────────────
  const tm = g0 + 0.055;
  const mirrors = ([1, -1] as const).map((side) => {
    const p = s.glassAt(tm, side === 1 ? 0.02 : 0.98);
    return { position: [p[0], p[1] + 0.07, p[2] + side * 0.13] as Vec3, side };
  });

  return { body, liner, glass, openings, seams, trim, housings, head, drl, tail, chargePort, mirrors };
}

/** Small surface patch lifted off the body along its normal (lights, trim, seams). */
export function patch(f: Fn, [a0, a1]: readonly [number, number], [b0, b1]: readonly [number, number], offset: number, na = 10, nb = 8) {
  return grid(f, range(a0, a1, na), range(b0, b1, nb), { offset });
}

function stripGroups(g: THREE.BufferGeometry) {
  g.clearGroups();
  return g;
}

// ── Wheels ───────────────────────────────────────────────────────────────────────────

export interface WheelGeometries {
  tire: THREE.BufferGeometry;
  barrel: THREE.BufferGeometry;
  face: THREE.BufferGeometry;
  accent: THREE.BufferGeometry;
  disc: THREE.BufferGeometry;
  caliper: THREE.BufferGeometry;
}

/** Wheel facing +Z (outer face), axis along Z, centred at the origin. */
export function buildWheel(R: number, width: number, rimRatio: number, style: RimStyle, low = false): WheelGeometries {
  const seg = low ? 28 : 64;
  const r = R * rimRatio;
  const w = width / 2;
  // Tyre cross-section (radius, axial) swept around the axle.
  const prof: THREE.Vector2[] = [];
  const bulge = (R - r) * 0.08;
  const pts: [number, number][] = [
    [r * 0.99, -w * 0.86],
    [r + (R - r) * 0.35, -w - bulge],
    [R - (R - r) * 0.18, -w * 0.98],
    [R - 0.004, -w * 0.82],
    [R, -w * 0.5],
    [R, w * 0.5],
    [R - 0.004, w * 0.82],
    [R - (R - r) * 0.18, w * 0.98],
    [r + (R - r) * 0.35, w + bulge],
    [r * 0.99, w * 0.86],
  ];
  const curve = new THREE.CatmullRomCurve3(pts.map(([a, b]) => new THREE.Vector3(a, b, 0)));
  curve.getPoints(low ? 16 : 40).forEach((p) => prof.push(new THREE.Vector2(p.x, p.y)));
  const tire = new THREE.LatheGeometry(prof, seg).rotateX(Math.PI / 2);

  const barrel = new THREE.CylinderGeometry(r * 0.985, r * 0.985, width * 0.86, seg, 1, true).rotateX(Math.PI / 2);

  // Rim face: shallow dish (lathe) + style-specific spokes, on the outer side (+Z).
  const dish = new THREE.LatheGeometry(
    [new THREE.Vector2(0.0001, w * 0.62), new THREE.Vector2(r * 0.22, w * 0.62), new THREE.Vector2(r * 0.3, w * 0.5), new THREE.Vector2(r * 0.9, w * 0.52), new THREE.Vector2(r * 0.99, w * 0.78)],
    seg,
  ).rotateX(Math.PI / 2);
  const parts: THREE.BufferGeometry[] = [];
  const accents: THREE.BufferGeometry[] = [];
  const spoke = (angle: number, len: number, thick: number, twist = 0, z = w * 0.66) => {
    const g = new THREE.BoxGeometry(len, thick, 0.028);
    g.translate(r * 0.25 + len / 2, 0, 0);
    g.rotateY(-0.12);
    g.rotateZ(angle + twist);
    g.translate(0, 0, z);
    return g;
  };
  const span = r * 0.72;
  switch (style) {
    case "aero": {
      // Aero cover: near-flat disc with five dark slots near the rim.
      parts.push(new THREE.CircleGeometry(r * 0.97, seg).translate(0, 0, w * 0.7));
      for (let k = 0; k < 5; k++) {
        const g = new THREE.CircleGeometry(r * 0.12, 16);
        g.scale(1.9, 1, 1);
        g.translate(r * 0.74, 0, 0);
        g.rotateZ((k / 5) * Math.PI * 2 + 0.3);
        g.translate(0, 0, w * 0.705);
        accents.push(g);
      }
      break;
    }
    case "turbine":
      for (let k = 0; k < 10; k++) parts.push(spoke((k / 10) * Math.PI * 2, span, r * 0.11, 0.18));
      break;
    case "split":
      for (let k = 0; k < 5; k++) for (const o of [-0.09, 0.09]) parts.push(spoke((k / 5) * Math.PI * 2 + o, span, r * 0.08));
      break;
    case "twin":
      for (let k = 0; k < 10; k++) parts.push(spoke((k / 10) * Math.PI * 2, span, r * 0.085, 0.05));
      break;
    case "thin":
    default:
      for (let k = 0; k < 5; k++) parts.push(spoke((k / 5) * Math.PI * 2, span, r * 0.07));
  }
  parts.push(new THREE.CylinderGeometry(r * 0.24, r * 0.26, 0.04, 32).rotateX(Math.PI / 2).translate(0, 0, w * 0.7));
  const face = mergeGeometries([dish, ...parts].map((g) => (g.index ? g.toNonIndexed() : g)))!;
  const accent = accents.length ? mergeGeometries(accents)! : new THREE.CircleGeometry(r * 0.08, 16).translate(0, 0, w * 0.72);

  const disc = new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.028, seg).rotateX(Math.PI / 2).translate(0, 0, w * 0.18);
  const caliper = new THREE.TorusGeometry(r * 0.72, r * 0.09, 8, 16, Math.PI * 0.42).rotateZ(Math.PI * 0.29).translate(0, 0, w * 0.26);
  caliper.scale(1, 1, 2.2);
  return { tire, barrel, face, accent, disc, caliper };
}
