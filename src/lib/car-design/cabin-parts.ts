/**
 * Local-space definitions of seats and steering controls: plain numbers shared by the renderer and
 * the validator, so the tested shape is the drawn shape. A seat has two parent frames: "seat" at
 * the cushion centre and "back", a child frame hinged at the cushion's rear edge and reclined
 * about Z. All dimensions are packaging approximations, not measured Tesla seats.
 */
import type { Vec3 } from "./vehicle-frame";

export type SeatMaterial = "seat" | "accent" | "stitch" | "frame";

export interface BoxPart {
  id: string;
  parent: "seat" | "back";
  size: Vec3;
  pos: Vec3;
  rotZ?: number;
  /** Corner radius; 0 draws a plain box. */
  radius: number;
  material: SeatMaterial;
  /** Fine detail, dropped on low-detail devices and ignored by containment checks. */
  detail?: boolean;
}

export interface SeatShape {
  hip: Vec3;
  width: number;
  fit: number;
  kind: "bucket" | "bench";
  recline: number;
}

/** Hinge of the back frame in the seat frame. */
export const BACK_PIVOT: Vec3 = [-0.2, 0, 0];

export function seatParts(seat: SeatShape, floorY: number): BoxPart[] {
  const { width: w, fit, kind } = seat;
  const bucket = kind === "bucket";
  const backH = 0.6 * fit;
  const baseH = Math.max(0.02, seat.hip[1] - floorY - 0.1);
  const parts: BoxPart[] = [
    { id: "pedestal", parent: "seat", size: [0.4, baseH, w * 0.7], pos: [0.02, -0.1 - baseH / 2, 0], radius: 0, material: "frame" },
    { id: "cushion", parent: "seat", size: [0.5, 0.1, w * (bucket ? 0.82 : 0.96)], pos: [0.04, -0.05, 0], rotZ: 0.06, radius: 0.035, material: "seat" },
    { id: "backrest", parent: "back", size: [0.11, backH, w * (bucket ? 0.8 : 0.94)], pos: [-0.03, backH / 2 + 0.02, 0], radius: 0.035, material: "seat" },
    { id: "headrest", parent: "back", size: [0.1, 0.2 * fit, w * 0.52], pos: [-0.04, backH + 0.14 * fit, 0], radius: 0.04, material: "seat" },
  ];
  for (const sd of [-1, 1] as const) {
    if (bucket) {
      parts.push({ id: `cushion-bolster${sd}`, parent: "seat", size: [0.46, 0.08, 0.085], pos: [0.04, -0.01, sd * (w / 2 - 0.045)], radius: 0.03, material: "accent" });
      parts.push({ id: `back-bolster${sd}`, parent: "back", size: [0.15, backH * 0.82, 0.085], pos: [-0.01, backH * 0.43 + 0.02, sd * (w / 2 - 0.045)], radius: 0.03, material: "accent" });
    }
    parts.push({ id: `cushion-stitch${sd}`, parent: "seat", size: [0.4, 0.004, 0.004], pos: [0.05, 0.002, sd * w * 0.19], radius: 0, material: "stitch", detail: true });
    parts.push({ id: `back-stitch${sd}`, parent: "back", size: [0.004, backH * 0.8, 0.004], pos: [0.026, backH / 2 + 0.02, sd * w * 0.17], radius: 0, material: "stitch", detail: true });
  }
  return parts;
}

const rotZ = ([x, y, z]: Vec3, a: number): Vec3 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Box corners in car space, by simple composition (the validator repeats this with Matrix4). */
export function seatPartCorners(seat: SeatShape, part: BoxPart): Vec3[] {
  const corners: Vec3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        let p: Vec3 = [(sx * part.size[0]) / 2, (sy * part.size[1]) / 2, (sz * part.size[2]) / 2];
        p = add(rotZ(p, part.rotZ ?? 0), part.pos);
        if (part.parent === "back") p = add(rotZ(p, seat.recline), BACK_PIVOT);
        corners.push(add(p, seat.hip));
      }
  return corners;
}

/** Yoke rim centreline in the wheel plane as [y, z], symmetric about y-axis. */
export const YOKE_RIM: readonly (readonly [number, number])[] = [
  [0.1, -0.11],
  [0.07, -0.168],
  [-0.03, -0.178],
  [-0.1, -0.15],
  [-0.125, -0.06],
  [-0.125, 0.06],
  [-0.1, 0.15],
  [-0.03, 0.178],
  [0.07, 0.168],
  [0.1, 0.11],
];
export const YOKE_TUBE = 0.021;
export const ROUND_TUBE = 0.018;

/** Steering-rim sample points in the wheel's local frame (axis along +X, plane = YZ). */
export function steeringRimLocal(kind: "round" | "yoke", radius: number): Vec3[] {
  if (kind === "yoke") return YOKE_RIM.map(([y, z]) => [0, y, z]);
  return Array.from({ length: 32 }, (_, i): Vec3 => {
    const a = (i / 32) * Math.PI * 2;
    return [0, Math.cos(a) * radius, Math.sin(a) * radius];
  });
}
