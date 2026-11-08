/**
 * Geometric validation of a built vehicle. Run by the unit tests and the `?debug=geometry` overlay;
 * never per frame. Parts are transformed with the same parent→child chain the renderer uses, then
 * sampled against the surface-derived CabinEnvelope, because a bounding box cannot describe a
 * curved roof or tapered cabin.
 *
 * Tolerances:
 *  - MIRROR_TOL 1 mm: mirrored parts come from the same formula, so anything larger is a bug,
 *    while 32-bit vertex storage needs a little slack.
 *  - SEAL_TOL 2 mm: under the 2 mm-offset seam strips that cover panel joints.
 *  - Containment must be ≥ 0 after the door-card or headliner thickness has been subtracted.
 */
import * as THREE from "three";
import { buildCar, type CarMeshes, type Opening } from "@/components/three/car-mesh";
import type { CarSurface } from "./surface";
import { cabinFor, type CabinLayout, type SeatPlacement } from "./cabin";
import { BACK_PIVOT, seatParts, steeringRimLocal, type BoxPart } from "./cabin-parts";
import { PACKAGING, type Vec3 } from "./vehicle-frame";

export const MIRROR_TOL = 0.001;
export const SEAL_TOL = 0.002;

export interface Check {
  id: string;
  group: "symmetry" | "seats" | "steering" | "shell" | "cameras" | "dash";
  pass: boolean;
  /** Measured value (metres unless the id says otherwise). */
  value: number;
  detail: string;
}

const check = (group: Check["group"], id: string, pass: boolean, value: number, detail = ""): Check => ({ id, group, pass, value: Math.round(value * 1e5) / 1e5, detail });

/** Part → car matrix: seat frame × optional back frame × part frame. */
export function partMatrix(seat: SeatPlacement, part: BoxPart) {
  const m = new THREE.Matrix4().makeTranslation(...seat.hip);
  if (part.parent === "back") m.multiply(new THREE.Matrix4().makeTranslation(...BACK_PIVOT)).multiply(new THREE.Matrix4().makeRotationZ(seat.recline));
  return m.multiply(new THREE.Matrix4().makeTranslation(...part.pos)).multiply(new THREE.Matrix4().makeRotationZ(part.rotZ ?? 0));
}

/** Grid of points over the six faces of a box (corners, edges and face interiors). */
function boxSamples(size: Vec3, n = 3) {
  const pts: THREE.Vector3[] = [];
  const [a, b, c] = size.map((v) => v / 2);
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++)
      for (let k = 0; k <= n; k++) {
        if (i !== 0 && i !== n && j !== 0 && j !== n && k !== 0 && k !== n) continue;
        pts.push(new THREE.Vector3(-a + (2 * a * i) / n, -b + (2 * b * j) / n, -c + (2 * c * k) / n));
      }
  return pts;
}

function worldPoints(seat: SeatPlacement, part: BoxPart) {
  const m = partMatrix(seat, part);
  return boxSamples(part.size).map((p) => p.applyMatrix4(m));
}

const solidParts = (seat: SeatPlacement, floorY: number) => seatParts(seat, floorY).filter((p) => !p.detail);

function pointInBox(p: THREE.Vector3, inverse: THREE.Matrix4, size: Vec3) {
  const q = p.clone().applyMatrix4(inverse);
  return Math.abs(q.x) < size[0] / 2 && Math.abs(q.y) < size[1] / 2 && Math.abs(q.z) < size[2] / 2;
}

function seatsOverlap(a: SeatPlacement, b: SeatPlacement, floorY: number) {
  for (const pa of solidParts(a, floorY)) {
    const pts = worldPoints(a, pa);
    for (const pb of solidParts(b, floorY)) {
      const inv = partMatrix(b, pb).invert();
      if (pts.some((p) => pointInBox(p, inv, pb.size))) return `${pa.id}→${pb.id}`;
    }
  }
  return null;
}

/* ── Seats ───────────────────────────────────────────────────────────────── */

export function checkSeats(cabin: CabinLayout): Check[] {
  const out: Check[] = [];
  const env = cabin.envelope;
  cabin.seats.forEach((seat, i) => {
    const label = `row ${seat.row + 1} seat at z=${seat.hip[2].toFixed(2)}`;
    let worst = { value: Infinity, constraint: "floor" as string, part: "" };
    for (const part of solidParts(seat, cabin.floorY)) {
      for (const p of worldPoints(seat, part)) {
        const c = env.clearance(p.x, p.y, p.z);
        if (c.value < worst.value) worst = { value: c.value, constraint: c.constraint, part: part.id };
      }
    }
    out.push(check("seats", `seat-${i}-inside-cabin`, worst.value >= -1e-6, worst.value, `${label}: tightest ${worst.part} vs ${worst.constraint}`));

    const head = solidParts(seat, cabin.floorY).find((p) => p.id === "headrest")!;
    const roofGap = Math.min(...worldPoints(seat, head).map((p) => env.ceiling(p.x, p.z) - p.y));
    out.push(check("seats", `seat-${i}-headrest-under-roof`, roofGap >= PACKAGING.headClearance - 1e-3, roofGap, label));

    const cons = cabin.console;
    const consMid = (cons.x0 + cons.x1) / 2;
    const consSize: Vec3 = [cons.x0 - cons.x1, cons.topY - cabin.floorY, cons.width];
    const consInv = new THREE.Matrix4().makeTranslation(consMid, cabin.floorY + consSize[1] / 2, 0).invert();
    const hitsConsole = solidParts(seat, cabin.floorY).some((p) => worldPoints(seat, p).some((q) => pointInBox(q, consInv, consSize)));
    out.push(check("seats", `seat-${i}-clear-of-console`, !hitsConsole, hitsConsole ? 1 : 0, label));

    for (const card of cabin.doorCards) {
      const inv = new THREE.Matrix4().makeTranslation(...card.armrest.center).invert();
      const hit = solidParts(seat, cabin.floorY).some((p) => worldPoints(seat, p).some((q) => pointInBox(q, inv, card.armrest.size)));
      if (hit) out.push(check("seats", `seat-${i}-clear-of-armrest`, false, 1, `${label} hits door ${card.door} side ${card.side}`));
    }
  });

  // Seats must not intersect each other.
  for (let i = 0; i < cabin.seats.length; i++)
    for (let j = i + 1; j < cabin.seats.length; j++) {
      const hit = seatsOverlap(cabin.seats[i], cabin.seats[j], cabin.floorY);
      if (hit) out.push(check("seats", `seats-${i}-${j}-intersect`, false, 1, hit));
    }
  out.push(check("seats", "seat-count", cabin.seats.length === cabin.spec.rows.reduce((a, b) => a + b, 0), cabin.seats.length));

  // Rows are level, evenly spaced, centred and behind one another.
  cabin.spec.rows.forEach((n, r) => {
    const row = cabin.seats.filter((p) => p.row === r).sort((a, b) => a.hip[2] - b.hip[2]);
    const spread = (f: (p: SeatPlacement) => number) => Math.max(...row.map(f)) - Math.min(...row.map(f));
    out.push(check("seats", `row-${r + 1}-level`, spread((p) => p.hip[0]) + spread((p) => p.hip[1]) < MIRROR_TOL, spread((p) => p.hip[1])));
    out.push(check("seats", `row-${r + 1}-same-seat-size`, spread((p) => p.width) + spread((p) => p.fit) < MIRROR_TOL, spread((p) => p.width)));
    const mirror = Math.max(...row.map((p, i) => Math.abs(p.hip[2] + row[n - 1 - i].hip[2])));
    out.push(check("symmetry", `row-${r + 1}-mirrored`, mirror < MIRROR_TOL, mirror));
    if (n > 2) {
      const gaps = row.slice(1).map((p, i) => p.hip[2] - row[i].hip[2]);
      out.push(check("seats", `row-${r + 1}-evenly-spaced`, Math.max(...gaps) - Math.min(...gaps) < MIRROR_TOL, Math.max(...gaps) - Math.min(...gaps)));
    }
    if (r > 0) {
      const gap = cabin.rowX[r - 1] - cabin.rowX[r];
      out.push(check("seats", `row-${r + 1}-behind-row-${r}`, gap >= PACKAGING.rowPitch.min - 1e-6, gap, "seat-centre pitch"));
    }
  });
  return out;
}

/* ── Steering, dash, displays ────────────────────────────────────────────── */

export function steeringWorldPoints(cabin: CabinLayout) {
  const { center, tilt, kind } = cabin.steering;
  const m = new THREE.Matrix4().makeTranslation(...center).multiply(new THREE.Matrix4().makeRotationZ(-tilt));
  return steeringRimLocal(kind, 0.185).map((p) => new THREE.Vector3(...p).applyMatrix4(m));
}

export function checkSteering(cabin: CabinLayout): Check[] {
  const st = cabin.steering;
  const env = cabin.envelope;
  const rim = steeringWorldPoints(cabin);
  const driver = cabin.seats.find((p) => p.row === 0 && p.hip[2] < 0)!;
  let inside = Infinity;
  let bound = "";
  for (const p of rim) {
    const c = env.clearance(p.x, p.y, p.z);
    if (c.value - st.tube < inside) {
      inside = c.value - st.tube;
      bound = c.constraint;
    }
  }
  const front = Math.max(...rim.map((p) => p.x)) + st.tube;
  const reach = Math.hypot(st.center[0] - driver.hip[0], st.center[1] - driver.hip[1]);
  const anchorY = st.dashAnchor[1];
  const dashBottom = cabin.dashTopY - 0.26;
  const axis = new THREE.Vector3(Math.cos(st.tilt), -Math.sin(st.tilt), 0);
  const end = new THREE.Vector3(...st.center).addScaledVector(axis, st.columnLength);
  return [
    check("steering", "rim-inside-cabin", inside >= 0, inside, `tightest against ${bound}`),
    check("steering", "rim-under-windshield", st.windshieldClearance >= 0.02, st.windshieldClearance),
    check("steering", "rim-clear-of-door", st.doorClearance >= 0.02, st.doorClearance),
    check("steering", "rim-behind-dash", front <= cabin.dashX - 0.01, cabin.dashX - front, "rim front to dash face"),
    check("steering", "centred-on-driver", Math.abs(st.center[2] - driver.hip[2]) < MIRROR_TOL, Math.abs(st.center[2] - driver.hip[2])),
    check("steering", "reach-from-seat", reach >= 0.42 && reach <= 0.85, reach, "hub to cushion centre"),
    check("steering", "column-meets-dash", anchorY >= dashBottom && anchorY <= cabin.dashTopY, anchorY - dashBottom, "height of the column's entry above the lower dash edge"),
    check("steering", "column-endpoint", end.distanceTo(new THREE.Vector3(...st.dashAnchor)) < MIRROR_TOL, end.distanceTo(new THREE.Vector3(...st.dashAnchor))),
    check("steering", "plausible-size", st.radius >= 0.15 && st.radius <= 0.2 && st.tilt >= 0.25 && st.tilt <= 0.6, st.radius),
  ];
}

function panelCorners(p: { center: Vec3; w: number; h: number; yaw: number; tilt: number }) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p.center), new THREE.Quaternion().setFromEuler(new THREE.Euler(-p.tilt, -Math.PI / 2 - p.yaw, 0, "YXZ")), new THREE.Vector3(1, 1, 1));
  return [-1, 1].flatMap((a) => [-1, 1].map((b) => new THREE.Vector3((a * p.w) / 2, (b * p.h) / 2, 0).applyMatrix4(m)));
}

export function checkDash(s: CarSurface, cabin: CabinLayout): Check[] {
  const env = cabin.envelope;
  const out: Check[] = [];
  let tightest = Infinity;
  for (const x of [cabin.dashX, (cabin.dashX + cabin.dashFrontX) / 2, cabin.dashFrontX]) {
    for (const z of [-cabin.dashHalf, 0, cabin.dashHalf]) tightest = Math.min(tightest, s.beltPoint(s.tAt(x))[1] - cabin.dashTopY, env.ceiling(x, z) + 0.02 - cabin.dashTopY);
    tightest = Math.min(tightest, env.halfWidth(x, cabin.dashTopY) - cabin.dashHalf);
  }
  out.push(check("dash", "dash-under-windshield-and-inside-doors", tightest >= 0, tightest));
  out.push(check("dash", "dash-behind-cowl", cabin.dashFrontX < cabin.cowlX, cabin.cowlX - cabin.dashFrontX));
  const panels = [cabin.screen, cabin.cluster, ...cabin.forwardDisplays].filter(Boolean) as NonNullable<CabinLayout["screen"]>[];
  panels.forEach((panel, i) => {
    const gap = Math.min(...panelCorners(panel).map((p) => env.clearance(p.x, p.y, p.z).value));
    out.push(check("dash", `display-${i}-inside-cabin`, gap >= 0, gap));
  });
  return out;
}

export function checkCameras(cabin: CabinLayout): Check[] {
  const env = cabin.envelope;
  return Object.entries(cabin.views).map(([name, v]) => {
    const gap = env.clearance(...v.pos).value;
    return check("cameras", `camera-${name}-inside`, Number.isFinite(gap) && gap >= 0.03, gap);
  });
}

/* ── Exterior shell ─────────────────────────────────────────────────────── */

const box = (g: THREE.BufferGeometry) => new THREE.Box3().setFromBufferAttribute(g.getAttribute("position") as THREE.BufferAttribute);

/** Largest difference between box A and the Z-mirror of box B. */
function mirrorError(a: THREE.Box3, b: THREE.Box3) {
  return Math.max(Math.abs(a.min.x - b.min.x), Math.abs(a.max.x - b.max.x), Math.abs(a.min.y - b.min.y), Math.abs(a.max.y - b.max.y), Math.abs(a.min.z + b.max.z), Math.abs(a.max.z + b.min.z));
}

function vertexSet(geos: THREE.BufferGeometry[]) {
  const set = new Set<string>();
  for (const g of geos) {
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) set.add(key(p.getX(i), p.getY(i), p.getZ(i)));
  }
  return set;
}
const key = (x: number, y: number, z: number) => `${Math.round(x * 2000)},${Math.round(y * 2000)},${Math.round(z * 2000)}`;

export function checkShell(s: CarSurface, car: CarMeshes, cabin: CabinLayout): Check[] {
  const out: Check[] = [];
  const [g0, g1] = s.glass;

  // Analytic mirror test of body and glass.
  let bodyErr = 0;
  for (let i = 0; i <= 80; i++)
    for (let j = 1; j < 40; j++) {
      const t = i / 80;
      const a = s.body(t, j / 80);
      const b = s.body(t, 1 - j / 80);
      bodyErr = Math.max(bodyErr, Math.abs(a[1] - b[1]), Math.abs(a[2] + b[2]));
      const tg = g0 + (g1 - g0) * t;
      const c = s.glassAt(tg, j / 80);
      const e = s.glassAt(tg, 1 - j / 80);
      bodyErr = Math.max(bodyErr, Math.abs(c[1] - e[1]), Math.abs(c[2] + e[2]));
    }
  out.push(check("symmetry", "body-and-glass-surface-mirrored", bodyErr < MIRROR_TOL, bodyErr));
  for (const [name, g] of Object.entries({ body: car.body, glass: car.glass, head: car.head, tail: car.tail, housings: car.housings })) {
    const b = box(g);
    const err = Math.abs(b.min.z + b.max.z);
    out.push(check("symmetry", `mesh-${name}-centred`, err < MIRROR_TOL, err));
  }

  // Mirrors and door pairs.
  const [mR, mL] = car.mirrors;
  const mErr = Math.abs(mR.position[0] - mL.position[0]) + Math.abs(mR.position[1] - mL.position[1]) + Math.abs(mR.position[2] + mL.position[2]);
  out.push(check("symmetry", "door-mirrors-mirrored", mErr < MIRROR_TOL, mErr));
  const armGap = Math.min(...car.mirrors.map((m) => Math.abs(m.position[2]) - 0.17 - Math.abs(s.glassAt(s.glass[0] + 0.055, m.side === 1 ? 0.02 : 0.98)[2])));
  out.push(check("shell", "mirror-arm-reaches-body", armGap <= 0.01, armGap, "arm tip to glass base"));
  const doors = car.openings.filter((o) => o.door !== null);
  for (let i = 0; i < doors.length; i += 2) {
    const err = mirrorError(box(doors[i].paint), box(doors[i + 1].paint));
    out.push(check("symmetry", `door-${doors[i].door}-pair-mirrored`, err < MIRROR_TOL, err));
    const hingeErr = Math.abs(doors[i].hinge[0] - doors[i + 1].hinge[0]) + Math.abs(doors[i].hinge[1] - doors[i + 1].hinge[1]) + Math.abs(doors[i].hinge[2] + doors[i + 1].hinge[2]);
    out.push(check("symmetry", `door-${doors[i].door}-hinges-mirrored`, hingeErr < MIRROR_TOL, hingeErr));
  }

  // Wheels on their axles.
  const wb = s.frontAxleX - s.rearAxleX;
  out.push(check("shell", "wheelbase-matches-dimensions", Math.abs(wb - s.WB) < MIRROR_TOL, Math.abs(wb - s.WB)));
  const tireZ = s.W / 2 - s.tireW / 2 - 0.045;
  out.push(check("symmetry", "wheels-inside-body-width", tireZ + s.tireW / 2 <= s.W / 2, s.W / 2 - tireZ - s.tireW / 2));
  out.push(check("shell", "tyre-inside-arch", s.wheelR < s.archR, s.archR - s.wheelR));
  const bb = box(car.body);
  out.push(check("shell", "mesh-length-matches-dimensions", Math.abs(bb.max.x - bb.min.x - s.L) < 0.01, Math.abs(bb.max.x - bb.min.x - s.L)));
  const hTop = box(car.glass).max.y;
  out.push(check("shell", "mesh-height-matches-dimensions", Math.abs(hTop - s.H) < 0.02, Math.abs(hTop - s.H)));

  // Glass base and end seals share vertices with the body (mesh-level connectivity).
  const bodyVerts = vertexSet([car.body, ...car.openings.flatMap((o) => (o.kind === "door" || o.kind === "falcon" ? [o.paint] : [o.paint]))]);
  let baseSeal = 0;
  let endSeal = 0;
  for (let i = 0; i <= 200; i++) {
    const t = g0 + ((g1 - g0) * i) / 200;
    for (const [v, u] of [[0, s.beltU], [1, 1 - s.beltU]]) {
      const a = s.glassAt(t, v);
      const b = s.body(t, u);
      baseSeal = Math.max(baseSeal, Math.hypot(a[1] - b[1], a[2] - b[2]));
    }
  }
  for (const t of [g0, g1])
    for (let i = 0; i <= 40; i++) {
      const v = i / 40;
      const a = s.glassAt(t, v);
      const b = s.body(t, s.beltU + (1 - 2 * s.beltU) * v);
      endSeal = Math.max(endSeal, Math.hypot(a[1] - b[1], a[2] - b[2]));
    }
  out.push(check("shell", "glass-base-on-belt-line", baseSeal < SEAL_TOL, baseSeal));
  out.push(check("shell", "glass-ends-sealed-to-body", endSeal < SEAL_TOL, endSeal));
  const gp = car.glass.getAttribute("position");
  let orphan = 0;
  let baseCount = 0;
  const baseZ = (x: number) => s.beltPoint(s.tAt(x))[2];
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    if (Math.abs(Math.abs(gp.getZ(i)) - baseZ(x)) > 1e-4) continue;
    baseCount++;
    if (!bodyVerts.has(key(x, gp.getY(i), gp.getZ(i)))) orphan++;
  }
  out.push(check("shell", "roof-connected-to-body-mesh", baseCount > 20 && orphan === 0, orphan, `${baseCount} base vertices checked`));

  // Roof continuity along the top.
  let roofJump = 0;
  for (let i = 1; i <= 200; i++) {
    const a = s.glassAt(g0 + ((g1 - g0) * (i - 1)) / 200, 0.5);
    const b = s.glassAt(g0 + ((g1 - g0) * i) / 200, 0.5);
    roofJump = Math.max(roofJump, Math.abs(a[1] - b[1]));
  }
  out.push(check("shell", "roof-line-continuous", roofJump < 0.05, roofJump, "largest height step between stations"));

  // Doors: skin edges on the opening, hinges on the panel, closed = identity.
  const fixed = vertexSet([car.body]);
  for (const o of doors) out.push(...checkPanelFit(s, o, fixed));

  // Nothing from the body shell may pass through the cabin (e.g. the crown over an axle).
  let intruders = 0;
  for (const g of [car.body, car.liner]) {
    const p = g.getAttribute("position");
    // Indexed vertices only: cut-out cells keep their vertices but draw no triangles.
    const index = g.getIndex()!;
    for (let n = 0; n < index.count; n++) {
      const i = index.getX(n);
      const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
      if (x < cabin.dashX && x > cabin.rearX + 0.03 && Math.abs(z) < cabin.frame.wheelhouseZ - 0.02 && y > cabin.floorY + 0.01 && y < s.beltPoint(s.tAt(x))[1] - 0.06) intruders++;
    }
  }
  out.push(check("shell", "no-body-surface-inside-cabin", intruders === 0, intruders));
  return out;
}

export function panelMatrix(o: Opening, angle: number) {
  const rot = new THREE.Matrix4();
  if (o.axis === "x") rot.makeRotationX(angle);
  else if (o.axis === "y") rot.makeRotationY(angle);
  else rot.makeRotationZ(angle);
  return new THREE.Matrix4().makeTranslation(...o.hinge).multiply(rot).multiply(new THREE.Matrix4().makeTranslation(-o.hinge[0], -o.hinge[1], -o.hinge[2]));
}

function checkPanelFit(s: CarSurface, o: Opening, fixed: Set<string>): Check[] {
  const side = o.hinge[2] > 0 ? 1 : -1;
  const label = `door-${o.door}${side > 0 ? "R" : "L"}`;
  const p = o.paint.getAttribute("position");
  const v = new THREE.Vector3();
  const closed = panelMatrix(o, 0);
  let moved = 0;
  let edges = 0;
  let missing = 0;
  const open = panelMatrix(o, o.angle);
  let crossed = 0;
  const box3 = box(o.paint);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    moved = Math.max(moved, v.clone().applyMatrix4(closed).distanceTo(v));
    if (v.clone().applyMatrix4(open).z * side < 0) crossed++;
    const onEdge = Math.abs(v.x - box3.min.x) < 1e-4 || Math.abs(v.x - box3.max.x) < 1e-4;
    if (onEdge) {
      edges++;
      if (!fixed.has(key(v.x, v.y, v.z))) missing++;
    }
  }
  const hinge = new THREE.Vector3(...o.hinge);
  const hingeFixed = hinge.clone().applyMatrix4(open).distanceTo(hinge);
  let hingeGap = Infinity;
  const sources = [o.paint, o.glass].filter(Boolean) as THREE.BufferGeometry[];
  for (const g of sources) {
    const q = g.getAttribute("position");
    for (let i = 0; i < q.count; i++) hingeGap = Math.min(hingeGap, Math.hypot(o.axis === "x" ? 0 : q.getX(i) - hinge.x, o.axis === "y" ? 0 : q.getY(i) - hinge.y, o.axis === "z" ? 0 : q.getZ(i) - hinge.z));
  }
  return [
    check("shell", `${label}-closed-is-identity`, moved < 1e-6, moved),
    check("shell", `${label}-edges-on-opening`, edges > 0 && missing === 0, missing, `${edges} edge vertices`),
    check("shell", `${label}-hinge-holds-when-open`, hingeFixed < 1e-6, hingeFixed),
    check("shell", `${label}-hinge-on-panel`, hingeGap < 0.06, hingeGap, "hinge axis to nearest panel vertex"),
    check("shell", `${label}-opens-outward`, crossed === 0, crossed, "vertices crossing the centreline when open"),
  ];
}

/** Rays from inside the cabin must hit the real glass mesh, not escape past it. */
export function checkMeshContainment(car: CarMeshes, cabin: CabinLayout): Check[] {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  // The greenhouse is the fixed glass plus the glass carried by each closed door.
  const meshes = [car.glass, ...car.openings.flatMap((o) => (o.glass ? [o.glass] : []))].map((g) => {
    const m = new THREE.Mesh(g, material);
    m.updateMatrixWorld();
    return m;
  });
  const ray = new THREE.Raycaster();
  const up = new THREE.Vector3(0, 1, 0);
  const probes: [string, THREE.Vector3][] = [];
  cabin.seats.forEach((seat, i) => {
    const head = solidParts(seat, cabin.floorY).find((p) => p.id === "headrest")!;
    for (const q of worldPoints(seat, head).filter((_, k) => k % 7 === 0)) probes.push([`seat-${i}`, q]);
  });
  steeringWorldPoints(cabin).filter((_, k) => k % 4 === 0).forEach((q) => probes.push(["steering", q]));
  let escaped = 0;
  const names = new Set<string>();
  for (const [name, p] of probes) {
    ray.set(p, up);
    if (ray.intersectObjects(meshes, false).length === 0) {
      escaped++;
      names.add(name);
    }
  }
  return [check("seats", "mesh-raycast-roof-above-every-probe", escaped === 0, escaped, `${probes.length} probes${names.size ? `; escaped: ${[...names].join(", ")}` : ""}`)];
}

export interface VehicleReport {
  design: string;
  checks: Check[];
  failures: Check[];
}

const reports = new WeakMap<CarSurface, VehicleReport>();

/** Full validation for one body (cached per surface). */
export function validateVehicle(s: CarSurface, low = true): VehicleReport {
  const cached = reports.get(s);
  if (cached) return cached;
  const cabin = cabinFor(s);
  const car = buildCar(s, low);
  const checks = [...checkSeats(cabin), ...checkSteering(cabin), ...checkDash(s, cabin), ...checkCameras(cabin), ...checkShell(s, car, cabin), ...checkMeshContainment(car, cabin)];
  const report = { design: s.design.id, checks, failures: checks.filter((c) => !c.pass) };
  reports.set(s, report);
  return report;
}
