import * as THREE from "three";
import type { BodyGeometry } from "@/types/vehicle";
import type { VehicleAsset } from "@/types/asset";
import { DRIVER_SIDE } from "./vehicle-frame";

/**
 * Broad-phase geometry checks for a licensed GLB in the teslha-v1 frame, from the world-space
 * bounds of each semantic group ("Exterior/Body", "Doors/FrontLeft", ...). Runs in tests and
 * tooling only. Boxes cannot see curved cabin surfaces, so a pass here is necessary, not
 * sufficient: interiors still need the screenshot review in docs/assets/asset-manifest.md.
 */
export type GroupBounds = ReadonlyMap<string, THREE.Box3>;

export interface AssetIssue {
  check: string;
  detail: string;
}

export const ASSET_TOLERANCE = {
  /** The pipeline scales length exactly; slack is for quantisation. */
  lengthM: 0.005,
  /** Width/height of a community model vs the dataset (approximate for announced cars). */
  proportion: 0.04,
  centreM: 0.005,
  groundM: 0.005,
  /** Mirrored parts (doors) must match within this. */
  mirrorM: 0.015,
  /** Steering must sit this far inside the body side and below the roof. */
  steeringInsetM: 0.15,
  /** Rendered wheel height vs dataset wheel diameter. */
  wheel: 0.1,
} as const;

export const REQUIRED_GROUPS = ["Exterior/Body", "Exterior/Glass", "Wheels"] as const;

const mm = (m: number) => `${Math.round(m * 1000)} mm`;

export function validateAssetGeometry(groups: GroupBounds, body: BodyGeometry, asset: VehicleAsset): AssetIssue[] {
  const issues: AssetIssue[] = [];
  const fail = (check: string, detail: string) => issues.push({ check, detail });
  const T = ASSET_TOLERANCE;

  for (const g of REQUIRED_GROUPS) if (!groups.get(g)) fail("groups", `missing ${g}`);
  if (asset.coverage.separateDoors) for (const g of ["Doors/FrontLeft", "Doors/FrontRight"]) if (!groups.get(g)) fail("groups", `missing ${g}`);
  if (asset.coverage.interior !== "none" && !groups.get("Interior/SteeringSystem")) fail("groups", "missing Interior/SteeringSystem");

  const all = new THREE.Box3();
  for (const b of groups.values()) all.union(b);
  const size = all.getSize(new THREE.Vector3());
  const centre = all.getCenter(new THREE.Vector3());
  const L = body.lengthMm / 1000;
  const W = body.widthMm / 1000;
  const H = body.heightMm / 1000;

  // Frame normalisation
  if (Math.abs(size.x - L) > T.lengthM) fail("frame", `length ${mm(size.x)} vs dataset ${mm(L)}`);
  if (Math.abs(centre.x) > T.centreM || Math.abs(centre.z) > T.centreM) fail("frame", `not centred (x ${mm(centre.x)}, z ${mm(centre.z)})`);
  if (Math.abs(all.min.y) > T.groundM) fail("frame", `lowest point at y = ${mm(all.min.y)}, expected 0`);
  // Mirrors may be folded or absent in the dataset width, so width is checked on the body only.
  const bodyBox = groups.get("Exterior/Body");
  if (bodyBox) {
    const bw = bodyBox.max.z - bodyBox.min.z;
    if (Math.abs(bw - W) / W > T.proportion) fail("proportion", `body width ${mm(bw)} vs dataset ${mm(W)}`);
  }
  if (Math.abs(size.y - H) / H > T.proportion) fail("proportion", `height ${mm(size.y)} vs dataset ${mm(H)}`);

  // Wheels sit on the floor and match the dataset diameter.
  const wheels = groups.get("Wheels");
  if (wheels) {
    if (Math.abs(wheels.min.y) > T.groundM) fail("wheels", `tyres at y = ${mm(wheels.min.y)}, not on the floor`);
    const d = wheels.max.y - wheels.min.y;
    const D = body.wheelDiameterMm / 1000;
    if (Math.abs(d - D) / D > T.wheel) fail("wheels", `wheel height ${mm(d)} vs dataset diameter ${mm(D)}`);
  }

  // Doors are mirror images and closed inside the body outline.
  const fl = groups.get("Doors/FrontLeft");
  const fr = groups.get("Doors/FrontRight");
  if (fl && fr) {
    const a = fl.getCenter(new THREE.Vector3());
    const b = fr.getCenter(new THREE.Vector3());
    if (Math.abs(a.x - b.x) > T.mirrorM || Math.abs(a.y - b.y) > T.mirrorM || Math.abs(a.z + b.z) > T.mirrorM)
      fail("symmetry", `front doors not mirrored (Δx ${mm(a.x - b.x)}, Δy ${mm(a.y - b.y)}, Σz ${mm(a.z + b.z)})`);
    if (Math.sign(a.z) !== DRIVER_SIDE) fail("symmetry", "Doors/FrontLeft is not on the left (−Z) side");
  }
  for (const [name, door] of [["Doors/FrontLeft", fl], ["Doors/FrontRight", fr]] as const) {
    if (door && !all.containsBox(door)) fail("doors", `${name} extends outside the vehicle bounds`);
  }

  // Steering: inside the cabin, on the driver's side, under the roof.
  const steering = groups.get("Interior/SteeringSystem");
  if (steering) {
    const c = steering.getCenter(new THREE.Vector3());
    if (Math.sign(c.z) !== DRIVER_SIDE) fail("steering", `steering centre at z = ${mm(c.z)}, not on the driver side`);
    const inset = Math.min(steering.min.z - all.min.z, all.max.z - steering.max.z);
    if (inset < T.steeringInsetM) fail("steering", `steering ${mm(inset)} from the body side (needs ${mm(T.steeringInsetM)})`);
    if (all.max.y - steering.max.y < T.steeringInsetM) fail("steering", `steering top ${mm(all.max.y - steering.max.y)} below the roof`);
    const tub = groups.get("Interior/Tub");
    if (tub && !tub.clone().expandByScalar(0.05).containsBox(steering)) fail("steering", "steering protrudes from the cabin tub");
  }
  return issues;
}
