import * as THREE from "three";
import type { BodyGeometry } from "@/types/vehicle";
import type { ComponentId } from "@/data/components";

/** Derived, metre-scale layout for a procedural vehicle. Front of the car faces +X, ground is y = 0, right side is +Z. */
export interface VehicleLayout {
  L: number;
  W: number;
  H: number;
  wheelR: number;
  tireW: number;
  frontAxleX: number;
  rearAxleX: number;
  beltY: number;
  hood: { from: THREE.Vector2; to: THREE.Vector2 };
  deck: { from: THREE.Vector2; to: THREE.Vector2 };
  doorSpan: { x0: number; x1: number; y0: number; y1: number };
  components: Record<ComponentId, ComponentPlacement[]>;
  cameraTargets: Record<ComponentId, THREE.Vector3>;
}

export interface ComponentPlacement {
  kind: "box" | "cylinder" | "ring" | "spring" | "sphere";
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  explode: [number, number, number];
}

const toWorld = (L: number, H: number) => ([x, y]: [number, number]) => new THREE.Vector2((0.5 - x) * L, y * H);

export function computeLayout(body: BodyGeometry): VehicleLayout {
  const L = body.lengthMm / 1000;
  const W = body.widthMm / 1000;
  const H = body.heightMm / 1000;
  const wheelR = body.wheelDiameterMm / 2000;
  const tireW = Math.min(0.28, W * 0.13);
  const WB = body.wheelbaseMm / 1000;
  // Center the wheelbase slightly forward of the body midpoint (typical EV packaging).
  const frontAxleX = WB / 2 + L * 0.01;
  const rearAxleX = -WB / 2 + L * 0.01;
  const w = toWorld(L, H);

  const cabin = body.cabin.map(w);
  const profile = body.profile.map(w);
  const top = profile.filter((p) => p.y > H * 0.42);
  const beltY = Math.min(...cabin.map((p) => p.y));

  const hoodFrom = top.reduce((a, b) => (b.x > a.x ? b : a)); // front-most high point
  const hood = { from: new THREE.Vector2(hoodFrom.x - 0.08, hoodFrom.y), to: cabin[0].clone() };
  const deckEnd = top.reduce((a, b) => (b.x < a.x ? b : a));
  const deck = { from: cabin[cabin.length - 1].clone(), to: new THREE.Vector2(deckEnd.x + 0.05, deckEnd.y) };

  const doorSpan = {
    x0: rearAxleX + wheelR * 1.15,
    x1: frontAxleX - wheelR * 1.15,
    y0: H * 0.22,
    y1: beltY - 0.02,
  };

  const floorY = H * 0.16;
  const packLen = WB - wheelR * 2.2;
  const midX = (frontAxleX + rearAxleX) / 2;
  const motorY = wheelR;
  const sideZ = W / 2 - tireW - 0.12;

  const components: Record<ComponentId, ComponentPlacement[]> = {
    battery: [{ kind: "box", position: [midX, floorY, 0], size: [packLen, 0.13, W * 0.78], explode: [0, -0.55, 0] }],
    motors: [
      { kind: "cylinder", position: [rearAxleX, motorY, 0], size: [0.17, 0.17, 0.42], rotation: [Math.PI / 2, 0, 0], explode: [-0.5, 0.15, 0] },
      { kind: "cylinder", position: [frontAxleX, motorY, 0], size: [0.15, 0.15, 0.36], rotation: [Math.PI / 2, 0, 0], explode: [0.5, 0.15, 0] },
    ],
    inverter: [
      { kind: "box", position: [rearAxleX + 0.24, motorY + 0.13, 0], size: [0.22, 0.1, 0.32], explode: [-0.3, 0.6, 0] },
      { kind: "box", position: [frontAxleX - 0.22, motorY + 0.12, 0], size: [0.2, 0.09, 0.28], explode: [0.3, 0.6, 0] },
    ],
    regen: [frontAxleX, rearAxleX].flatMap((x) =>
      [1, -1].map<ComponentPlacement>((side) => ({
        kind: "ring",
        position: [x, wheelR, side * (W / 2 - tireW - 0.04)],
        size: [wheelR * 0.62, 0.03, 0],
        explode: [0, 0, side * 0.45],
      })),
    ),
    thermal: [
      { kind: "box", position: [L / 2 - 0.22, H * 0.3, 0], size: [0.05, 0.28, W * 0.62], explode: [0.6, 0, 0] },
      { kind: "box", position: [midX + packLen * 0.05, floorY + 0.1, sideZ - 0.08], size: [packLen * 0.9, 0.035, 0.035], explode: [0, -0.3, 0.35] },
      { kind: "box", position: [midX + packLen * 0.05, floorY + 0.1, -sideZ + 0.08], size: [packLen * 0.9, 0.035, 0.035], explode: [0, -0.3, -0.35] },
    ],
    charging: [{ kind: "box", position: [rearAxleX - wheelR * 1.25, H * 0.5, -W / 2 + 0.02], size: [0.12, 0.08, 0.06], explode: [0, 0, -0.45] }],
    "power-distribution": [
      { kind: "box", position: [midX + packLen / 2 - 0.1, floorY + 0.13, 0], size: [0.24, 0.12, 0.34], explode: [0.25, 0.35, 0] },
      { kind: "box", position: [midX, floorY + 0.09, 0], size: [packLen * 0.85, 0.025, 0.05], explode: [0, 0.2, 0] },
    ],
    suspension: [frontAxleX, rearAxleX].flatMap((x) =>
      [1, -1].map<ComponentPlacement>((side) => ({
        kind: "spring",
        position: [x, wheelR + 0.2, side * (W / 2 - tireW - 0.16)],
        size: [0.07, 0.32, 0],
        explode: [0, 0.4, side * 0.3],
      })),
    ),
    sensors: [
      { kind: "sphere", position: [cabin[0].x - 0.12, cabin[0].y + (cabin[1].y - cabin[0].y) * 0.8, 0], size: [0.045, 0, 0], explode: [0.2, 0.35, 0] },
      { kind: "sphere", position: [midX + 0.15, beltY + 0.12, W / 2 - 0.03], size: [0.03, 0, 0], explode: [0, 0.2, 0.35] },
      { kind: "sphere", position: [midX + 0.15, beltY + 0.12, -W / 2 + 0.03], size: [0.03, 0, 0], explode: [0, 0.2, -0.35] },
      { kind: "sphere", position: [frontAxleX + wheelR * 1.3, H * 0.5, W / 2 - 0.03], size: [0.028, 0, 0], explode: [0.15, 0, 0.35] },
      { kind: "sphere", position: [frontAxleX + wheelR * 1.3, H * 0.5, -W / 2 + 0.03], size: [0.028, 0, 0], explode: [0.15, 0, -0.35] },
      { kind: "sphere", position: [-L / 2 + 0.03, H * 0.42, 0], size: [0.03, 0, 0], explode: [-0.4, 0, 0] },
    ],
    computer: [{ kind: "box", position: [cabin[0].x - 0.25, beltY - 0.08, W * 0.18], size: [0.26, 0.05, 0.22], explode: [0, 0.65, 0.2] }],
  };

  const cameraTargets = Object.fromEntries(
    (Object.keys(components) as ComponentId[]).map((id) => {
      const list = components[id];
      const c = new THREE.Vector3();
      list.forEach((p) => c.add(new THREE.Vector3(...p.position)));
      return [id, c.divideScalar(list.length)];
    }),
  ) as Record<ComponentId, THREE.Vector3>;

  return { L, W, H, wheelR, tireW, frontAxleX, rearAxleX, beltY, hood, deck, doorSpan, components, cameraTargets };
}

/** Extrude a closed silhouette into a rounded slab of the given width, centred on z = 0. */
export function extrudeSilhouette(points: THREE.Vector2[], width: number, bevel: number) {
  const shape = new THREE.Shape(points);
  const depth = Math.max(width - bevel * 2, 0.01);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.55,
    bevelSegments: 8,
    curveSegments: 24,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Smooth a polyline silhouette with a centripetal Catmull-Rom spline (keeps the hard bottom edge). */
export function smoothSilhouette(points: THREE.Vector2[], samples = 96) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p.x, p.y, 0)),
    true,
    "centripetal",
    0.5,
  );
  return curve.getPoints(samples).map((p) => new THREE.Vector2(p.x, p.y));
}

export function silhouettePoints(body: BodyGeometry, which: "profile" | "cabin") {
  const L = body.lengthMm / 1000;
  const H = body.heightMm / 1000;
  const w = toWorld(L, H);
  return body[which].map(w);
}
