/**
 * The one coordinate frame and body-derived datum set used by the mesh builder, the cabin
 * packaging, the renderer and the geometry tests.
 *
 *   +X  forward (front bumper at +L/2, rear bumper at −L/2, origin at mid-length)
 *   +Y  up (ground at y = 0)
 *   +Z  right-hand flank; the car is left-hand drive, so the driver sits at −Z
 *
 * Left/right pairs mirror in Z about the centreline z = 0. Published values are the exterior
 * length, width, height, wheelbase and wheel size in the vehicle data; every cabin datum below
 * is DERIVED from that body or is a packaging approximation, not a measured Tesla value.
 */
import type { CarSurface } from "./surface";

export type Vec3 = [number, number, number];

export const FORWARD: Vec3 = [1, 0, 0];
export const UP: Vec3 = [0, 1, 0];
export const RIGHT: Vec3 = [0, 0, 1];
/** Side of the car the driver sits on (Z sign). */
export const DRIVER_SIDE = -1;

/** Packaging approximations in metres. Conventional automotive proportions, not Tesla measurements. */
export const PACKAGING = {
  /** Floor pan above the underbody (battery and structure). */
  floorAboveClearance: 0.13,
  /** Door card thickness inside the skin. */
  doorCardDepth: 0.03,
  /** Skin to the inboard face of the door armrest. */
  doorArmrestDepth: 0.1,
  dashDepth: 0.26,
  /** Windshield base to the rear face of the dash: limits for long and short windshields. */
  dashSetback: { min: 0.32, max: 0.8, twoSeater: 0.22 },
  /** Dash face to the centre of the front seat cushion. */
  frontSeatSetback: { standard: 0.82, twoSeater: 0.8 },
  /** How far a two-seater's seats may move forward to bring the head under a short roof. */
  twoSeaterForwardLimit: 0.2,
  /** Row spacing: nominal, then the minimum left for knees when a low roof pulls the row forward. */
  rowPitch: { second: 0.88, third: 0.8, min: 0.72 },
  /** Cushion top above the floor: candidates, highest first. */
  hipLift: { standard: [0.3, 0.27, 0.24, 0.21], twoSeater: [0.18, 0.16, 0.14, 0.12] },
  seatWidth: { min: 0.42, max: 0.53 },
  headClearance: 0.025,
  /** Dash face to steering hub. */
  steeringReach: 0.3,
  consoleWidth: 0.26,
} as const;

export interface VehicleFrame {
  L: number;
  W: number;
  H: number;
  wheelbase: number;
  frontAxleX: number;
  rearAxleX: number;
  wheelR: number;
  archR: number;
  /** Inner face of the wheelhouse, |z|. */
  wheelhouseZ: number;
  floorY: number;
  /** Windshield base (start of the greenhouse), x. */
  cowlX: number;
  /** Rear end of the greenhouse, x. */
  glassRearX: number;
  /** Rear face of the dashboard, x. */
  dashX: number;
  /** Front edge of the dashboard, where it tucks under the cowl, x. */
  dashFrontX: number;
  dashTopY: number;
  firewallX: number;
  twoSeater: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function vehicleFrame(s: CarSurface): VehicleFrame {
  const d = s.design;
  const [g0, g1] = s.glass;
  const cowlX = s.xAt(g0);
  const twoSeater = d.cabin.rows.length === 1;
  const roofMax = Math.max(...Array.from({ length: 40 }, (_, i) => s.roofAt(g0 + ((g1 - g0) * i) / 39)));
  // Dash face sits under the windshield where the glass has risen ~45% of the way to the roof.
  let dashT = g0;
  for (let t = g0; t < g1; t += 0.002) {
    if (s.roofAt(t) >= s.beltAt(g0) + 0.45 * (roofMax - s.beltAt(g0))) {
      dashT = t;
      break;
    }
  }
  const { min, max, twoSeater: sportSetback } = PACKAGING.dashSetback;
  const dashX = twoSeater ? cowlX - sportSetback : clamp(s.xAt(dashT) - 0.04, cowlX - max, cowlX - min);
  const dashFrontX = Math.min(dashX + PACKAGING.dashDepth, cowlX - 0.02);
  // The dash tucks beneath the cowl panel, whose lowest line is the belt junction.
  const dashTopY = Math.min(s.beltPoint(s.tAt(dashFrontX))[1], s.beltPoint(s.tAt(dashX))[1]) - 0.012;
  return {
    L: s.L,
    W: s.W,
    H: s.H,
    wheelbase: s.WB,
    frontAxleX: s.frontAxleX,
    rearAxleX: s.rearAxleX,
    wheelR: s.wheelR,
    archR: s.archR,
    wheelhouseZ: wheelhouseInnerZ(s),
    floorY: d.groundClearance + PACKAGING.floorAboveClearance,
    cowlX,
    glassRearX: s.xAt(g1),
    dashX,
    dashFrontX,
    dashTopY,
    firewallX: dashX + 0.3,
    twoSeater,
  };
}

/** Inner face of the wheelhouse: the tyre's inner sidewall plus a small running clearance. */
export function wheelhouseInnerZ(s: CarSurface) {
  return s.W / 2 - 0.045 - s.tireW - 0.02;
}
