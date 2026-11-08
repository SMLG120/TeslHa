/**
 * Cabin packaging derived from the parametric body surface. Pure TypeScript (no three), shared by
 * the interior renderer, the interior camera presets and the geometry tests. Conventions and
 * body datums live in vehicle-frame.ts. Placement is constraint-based: each seat and control is
 * solved against the sampled CabinEnvelope rather than offset by hand.
 */
import type { CabinSpec } from "./designs";
import type { CarSurface } from "./surface";
import { CabinEnvelope } from "./cabin-envelope";
import { seatPartCorners, seatParts, steeringRimLocal, YOKE_TUBE, ROUND_TUBE, type SeatShape } from "./cabin-parts";
import { DRIVER_SIDE, PACKAGING, vehicleFrame, type Vec3, type VehicleFrame } from "./vehicle-frame";

export type { Vec3 };

export interface SeatPlacement extends SeatShape {
  /** Cushion top centre. */
  hip: Vec3;
  row: number;
}

export type CabinLight = "off" | "soft" | "bright";

export type InteriorView = "driver" | "passenger" | "rear" | "dashboard" | "steering" | "screen" | "console";

/** Seat views turn in place; inspection views orbit an object. */
export const SEAT_VIEWS: readonly InteriorView[] = ["driver", "passenger", "rear"];

export interface SteeringConfig {
  kind: CabinSpec["steering"];
  center: Vec3;
  /** Largest rim reach from the hub. */
  radius: number;
  /** Tube radius of the rim. */
  tube: number;
  tilt: number;
  columnLength: number;
  /** Where the column enters the dash face. */
  dashAnchor: Vec3;
  /** Driver cushion centre this wheel is packaged for. */
  driverRef: Vec3;
  /** Smallest gap from the rim to the windshield or roof. */
  windshieldClearance: number;
  /** Smallest gap from the rim to the nearest door card. */
  doorClearance: number;
}

export interface PanelPlacement {
  center: Vec3;
  w: number;
  h: number;
  yaw: number;
  tilt: number;
}

export interface DoorCard {
  /** Index into design.doors bands. */
  door: number;
  side: 1 | -1;
  armrest: { center: Vec3; size: Vec3 };
  speaker: Vec3;
  strip: { center: Vec3; length: number };
}

export interface CabinLayout {
  spec: CabinSpec;
  frame: VehicleFrame;
  envelope: CabinEnvelope;
  floorY: number;
  cowlX: number;
  dashX: number;
  dashFrontX: number;
  dashTopY: number;
  /** Dash half-width, flush with the door cards. */
  dashHalf: number;
  firewallX: number;
  /** Inner half-width at elbow height (door card surface). */
  halfIn: number;
  /** Rear bulkhead behind the last seats, x. */
  rearX: number;
  /** Lateral seat-rail centres (|z|) per row. */
  seatRails: number[];
  /** Seat centres along the car per row. */
  rowX: number[];
  seats: SeatPlacement[];
  steering: SteeringConfig;
  /** Alias of steering, for callers that only need the hub. */
  wheel: { center: Vec3; radius: number; tilt: number };
  screen: PanelPlacement | null;
  cluster: PanelPlacement | null;
  forwardDisplays: PanelPlacement[];
  console: { x0: number; x1: number; topY: number; width: number };
  doorCards: DoorCard[];
  /** Floor outline as [x, halfWidth] from firewall to bulkhead. */
  floorOutline: [number, number][];
  eyes: { driver: Vec3; passenger: Vec3; rear: Vec3 | null };
  views: Record<InteriorView, { pos: Vec3; target: Vec3 }>;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Tallest seat scale (≤ 1) whose back and head restraint clear the roof at every corner. */
function largestFit(env: CabinEnvelope, seat: SeatShape, floorY: number) {
  const clears = (fit: number) => {
    const trial = { ...seat, fit };
    return seatParts(trial, floorY)
      .filter((p) => p.parent === "back" && !p.detail)
      .every((p) => seatPartCorners(trial, p).every(([x, y, z]) => env.ceiling(x, z) - y >= PACKAGING.headClearance));
  };
  if (clears(1)) return 1;
  let lo = 0.4;
  let hi = 1;
  for (let i = 0; i < 14; i++) {
    const m = (lo + hi) / 2;
    if (clears(m)) lo = m;
    else hi = m;
  }
  return lo;
}

/** Seat width and lateral positions for one row, kept clear of doors, wheelhouses and the console. */
function rowLayout(env: CabinEnvelope, x: number, hipY: number, n: number, innerLimit: number) {
  const { seatWidth, doorArmrestDepth } = PACKAGING;
  const free = env.freeHalfWidth(x + 0.28, x - 0.3, hipY - 0.1, hipY + 0.55, doorArmrestDepth) - 0.015;
  if (n === 2) {
    const width = clamp(free - innerLimit - 0.015, seatWidth.min, seatWidth.max);
    const rail = clamp(free - width / 2, innerLimit + width / 2 + 0.015, 0.42);
    return { width, zs: [DRIVER_SIDE * rail, -DRIVER_SIDE * rail] };
  }
  const width = (free * 2) / n;
  return { width: width * 0.96, zs: Array.from({ length: n }, (_, i) => DRIVER_SIDE * free + -DRIVER_SIDE * width * (i + 0.5)) };
}

function solveRow(env: CabinEnvelope, frame: VehicleFrame, nominalX: number, maxForward: number, n: number, row: number, kind: SeatShape["kind"], innerLimit: number) {
  const lifts = frame.twoSeater ? PACKAGING.hipLift.twoSeater : PACKAGING.hipLift.standard;
  const minFit = frame.twoSeater ? 0.8 : 0.88;
  const reclines = row > 0 ? [0.2, 0.12] : frame.twoSeater ? [0.24, 0.16, 0.1] : [0.24];
  let best: { x: number; hipY: number; width: number; zs: number[]; fit: number; recline: number } | null = null;
  for (let shift = 0; shift <= maxForward + 1e-6; shift += 0.02) {
    for (const recline of reclines) {
      for (const lift of lifts) {
        const x = nominalX + shift;
        const hipY = frame.floorY + lift;
        const { width, zs } = rowLayout(env, x, hipY, n, innerLimit);
        const fit = Math.min(...zs.map((z) => largestFit(env, { hip: [x, hipY, z], width, fit: 1, kind, recline }, frame.floorY)));
        if (!best || fit > best.fit + 1e-3) best = { x, hipY, width, zs, fit, recline };
        if (fit >= minFit) return { x, hipY, width, zs, fit, recline };
      }
    }
  }
  return best!;
}

function steeringConfig(env: CabinEnvelope, frame: VehicleFrame, spec: CabinSpec, driver: SeatPlacement): SteeringConfig {
  const tilt = spec.steeringTilt;
  const kind = spec.steering;
  const local = steeringRimLocal(kind, 0.185);
  const radius = Math.max(...local.map(([, y, z]) => Math.hypot(y, z)));
  const center: Vec3 = [
    frame.dashX - PACKAGING.steeringReach,
    clamp(driver.hip[1] + 0.46, frame.floorY + 0.4, frame.dashTopY - 0.02),
    driver.hip[2],
  ];
  const tube = kind === "yoke" ? YOKE_TUBE : ROUND_TUBE;
  const world = local.map(([, y, z]): Vec3 => [center[0] + y * Math.sin(tilt), center[1] + y * Math.cos(tilt), center[2] + z]);
  const windshieldClearance = Math.min(...world.map(([x, y, z]) => env.ceiling(x, z) - y - tube));
  const doorClearance = Math.min(...world.map(([x, y, z]) => env.halfWidth(x, y) - Math.abs(z) - tube));
  // The column runs along the wheel axis (forward and down) to the dash face.
  const toDash = 0.02 + frame.dashX - center[0];
  const columnLength = toDash / Math.cos(tilt);
  const dashAnchor: Vec3 = [center[0] + toDash, center[1] - columnLength * Math.sin(tilt), center[2]];
  return { kind, center, radius, tube, tilt, columnLength, dashAnchor, driverRef: driver.hip, windshieldClearance, doorClearance };
}

function doorCards(s: CarSurface, floorY: number): DoorCard[] {
  const { doors } = s.design;
  const cards: DoorCard[] = [];
  const skin = (x: number, y: number) => s.bodyHalfWidthAtY(s.tAt(x), y);
  const depth = PACKAGING.doorCardDepth;
  for (let door = 0; door < doors.length - 1; door++) {
    const xFront = s.xAt(doors[door]);
    const xRear = s.xAt(doors[door + 1]);
    const midX = (xFront + xRear) / 2;
    const len = xFront - xRear;
    const topY = Math.min(s.beltPoint(doors[door])[1], s.beltPoint(doors[door + 1])[1]);
    const armY = Math.min(floorY + 0.4, topY - 0.1);
    const stripY = topY - 0.035;
    const armLen = Math.min(0.42, len - 0.14);
    for (const side of [1, -1] as const) {
      cards.push({
        door,
        side,
        armrest: { center: [midX, armY, side * (skin(midX, armY) - depth - 0.03)], size: [armLen, 0.045, 0.06] },
        speaker: [xFront - 0.2, floorY + 0.14, side * (skin(xFront - 0.2, floorY + 0.14) - depth - 0.003)],
        strip: { center: [midX, stripY, side * (skin(midX, stripY) - depth - 0.004)], length: len * 0.9 },
      });
    }
  }
  return cards;
}

export function cabinLayout(s: CarSurface): CabinLayout {
  const spec = s.design.cabin;
  const frame = vehicleFrame(s);
  const env = new CabinEnvelope(s, frame);
  const { floorY, cowlX, dashX, dashFrontX, dashTopY, firewallX, twoSeater } = frame;
  const consoleHalf = PACKAGING.consoleWidth / 2;

  // Seats, front to rear; each row solved against the roof and walls at its own station.
  const seats: SeatPlacement[] = [];
  const rowX: number[] = [];
  const seatRails: number[] = [];
  const { frontSeatSetback, rowPitch } = PACKAGING;
  spec.rows.forEach((n, r) => {
    const pitch = r === 1 ? rowPitch.second : rowPitch.third;
    const nominal = r === 0 ? dashX - (twoSeater ? frontSeatSetback.twoSeater : frontSeatSetback.standard) : rowX[r - 1] - pitch;
    const maxForward = r === 0 ? (twoSeater ? PACKAGING.twoSeaterForwardLimit : 0) : pitch - rowPitch.min;
    const kind = r === 0 ? "bucket" : "bench";
    const innerLimit = r === 0 ? consoleHalf : 0.05;
    const solved = solveRow(env, frame, nominal, maxForward, n, r, kind, innerLimit);
    rowX.push(solved.x);
    seatRails.push(Math.max(...solved.zs.map(Math.abs)));
    for (const z of solved.zs) seats.push({ hip: [solved.x, solved.hipY, z], width: solved.width, fit: solved.fit, kind, recline: solved.recline, row: r });
  });

  const driver = seats.find((p) => p.row === 0 && p.hip[2] * DRIVER_SIDE > 0)!;
  const passenger = seats.find((p) => p.row === 0 && p.hip[2] * DRIVER_SIDE < 0)!;

  // Rear bulkhead just behind the rearmost seat back.
  const seatCorners = seats.flatMap((seat) => seatParts(seat, floorY).filter((p) => !p.detail).flatMap((p) => seatPartCorners(seat, p)));
  const rearX = Math.max(Math.min(...seatCorners.map((p) => p[0])) - 0.04, frame.glassRearX + 0.02);

  const steering = steeringConfig(env, frame, spec, driver);
  const wheel = { center: steering.center, radius: steering.radius, tilt: steering.tilt };

  const elbowY = floorY + 0.5;
  const halfIn = Math.max(0.3, env.halfWidth(rowX[0], Math.min(elbowY, s.beltPoint(s.tAt(rowX[0]))[1] - 0.05)));
  const dashHalf = Math.max(0.3, Math.min(...[dashX, (dashX + dashFrontX) / 2, dashFrontX].map((x) => env.halfWidth(x, dashTopY, PACKAGING.doorCardDepth + 0.005))));

  let screen: PanelPlacement | null = null;
  if (spec.screen) {
    const diag = spec.screen.diagIn * 0.0254;
    const h = diag / Math.sqrt(1 + spec.screen.aspect ** 2);
    const w = h * spec.screen.aspect;
    const clearAt = (x: number) => Math.min(env.ceiling(x + 0.08, w / 2), env.ceiling(x + 0.08, 0)) - 0.02 - h;
    let x = dashX - 0.07;
    let bottom = dashTopY + 0.03;
    for (let i = 0; i < 20 && bottom > clearAt(x); i++) x -= 0.03;
    bottom = Math.min(bottom, clearAt(x));
    screen = { center: [x, bottom + h / 2, 0], w, h, yaw: 0.12, tilt: 0.12 };
  }

  // Driver displays stand on the dash top, not on the steering column.
  const hub = steering.center;
  const cluster: PanelPlacement | null = spec.cluster ? { center: [dashX + 0.03, dashTopY + 0.06, hub[2]], w: 0.3, h: 0.105, yaw: 0, tilt: 0.2 } : null;
  const forwardDisplays: PanelPlacement[] = spec.forwardDisplays
    ? [
        { center: [dashX - 0.015, dashTopY + 0.05, hub[2] + DRIVER_SIDE * 0.24], w: 0.09, h: 0.07, yaw: 0.25, tilt: 0.25 },
        { center: [dashX - 0.015, dashTopY + 0.05, hub[2] - DRIVER_SIDE * 0.17], w: 0.09, h: 0.07, yaw: -0.25, tilt: 0.25 },
      ]
    : [];

  const frontX = rowX[0];
  const cons = { x0: dashX + 0.02, x1: frontX - 0.28, topY: driver.hip[1] + 0.16, width: PACKAGING.consoleWidth };

  const floorOutline: [number, number][] = Array.from({ length: 41 }, (_, i) => {
    const x = firewallX + ((rearX - firewallX) * i) / 40;
    const inArch = [frame.frontAxleX, frame.rearAxleX].some((ax) => Math.abs(x - ax) < frame.archR + 0.01);
    return [x, inArch ? frame.wheelhouseZ : Math.max(0.3, env.halfWidth(x, floorY, 0.004))];
  });

  const eye = (p: SeatPlacement): Vec3 => {
    const x = p.hip[0] - 0.12;
    return [x, Math.min(p.hip[1] + 0.68 * p.fit + 0.06, env.ceiling(x, p.hip[2]) - 0.1), p.hip[2]];
  };
  const rearSeat = seats.find((p) => p.row === 1);
  const outerRear = rearSeat ? seats.filter((p) => p.row === 1).reduce((a, b) => (Math.abs(b.hip[2]) > Math.abs(a.hip[2]) ? b : a)) : null;
  // Rear view sits inboard of the outer seat, looking between the front seats rather than into a headrest.
  const rearEye = outerRear ? eye({ ...outerRear, hip: [outerRear.hip[0], outerRear.hip[1], Math.abs(outerRear.hip[2]) * 0.4] }) : null;

  const dE = eye(driver);
  const pE = eye(passenger);
  const ceil = (x: number, z: number) => env.ceiling(x, z) - 0.08;
  // Seat views look ahead from the eye; the orbit target sits close so dragging feels like turning your head.
  const fwd = (e: Vec3, dx = 0.14, dy = -0.04): Vec3 => [e[0] + dx, e[1] + dy, e[2]];
  const sc = screen?.center ?? [dashX - 0.05, dashTopY + 0.08, 0];
  const midConsole = (cons.x0 + cons.x1) / 2;
  const views: CabinLayout["views"] = {
    driver: { pos: dE, target: fwd(dE) },
    passenger: { pos: pE, target: fwd(pE) },
    rear: rearEye ? { pos: rearEye, target: [rearEye[0] + 0.14, rearEye[1] - 0.03, rearEye[2] * 0.7] } : { pos: dE, target: fwd(dE) },
    dashboard: { pos: [dashX - 0.62, Math.min(dashTopY + 0.22, ceil(dashX - 0.62, 0.12)), 0.12], target: [dashX, dashTopY - 0.02, 0] },
    steering: { pos: [hub[0] - 0.42, Math.min(hub[1] + 0.1, ceil(hub[0] - 0.42, hub[2])), hub[2] + 0.05], target: hub },
    screen: { pos: [sc[0] - 0.5, Math.min(sc[1] + 0.04, ceil(sc[0] - 0.5, 0.12)), -0.12], target: sc },
    console: { pos: [midConsole - 0.35, Math.min(cons.topY + 0.42, ceil(midConsole - 0.35, 0.18)), 0.18], target: [midConsole, cons.topY, 0] },
  };

  return {
    spec,
    frame,
    envelope: env,
    floorY,
    cowlX,
    dashX,
    dashFrontX,
    dashTopY,
    dashHalf,
    firewallX,
    halfIn,
    rearX,
    seatRails,
    rowX,
    seats,
    steering,
    wheel,
    screen,
    cluster,
    forwardDisplays,
    console: cons,
    doorCards: doorCards(s, floorY),
    floorOutline,
    eyes: { driver: dE, passenger: pE, rear: rearEye },
    views,
  };
}

const cache = new WeakMap<CarSurface, CabinLayout>();
/** Memoised per surface (surfaces are themselves cached per body). */
export function cabinFor(s: CarSurface): CabinLayout {
  let c = cache.get(s);
  if (!c) cache.set(s, (c = cabinLayout(s)));
  return c;
}
