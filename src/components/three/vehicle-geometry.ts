import * as THREE from "three";
import type { BodyGeometry } from "@/types/vehicle";
import { CarSurface, surfaceFor } from "@/lib/car-design/surface";
import { cabinFor, type CabinLayout } from "@/lib/car-design/cabin";
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
  cabin: CabinLayout;
  surface: CarSurface;
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

export function computeLayout(body: BodyGeometry): VehicleLayout {
  const sf = surfaceFor(body);
  const { L, W, H, wheelR, tireW, frontAxleX, rearAxleX } = sf;
  const d = sf.design;
  const WB = frontAxleX - rearAxleX;
  const [g0] = sf.glass;
  const beltY = sf.beltAt((g0 + sf.glass[1]) / 2);

  const floorY = d.groundClearance + 0.07;
  const packLen = WB - wheelR * 2.2;
  const midX = (frontAxleX + rearAxleX) / 2;
  const motorY = wheelR;
  const sideZ = W / 2 - tireW - 0.12;
  const nose = sf.section(0.06);
  const dashX = sf.xAt(g0) - 0.25;
  const camPos = sf.glassAt(g0 + 0.09, 0.5);
  const portT = d.lights.tail[0].t[0] - 0.035;
  const port = sf.body(portT, 0.66);
  const mirror = sf.glassAt(g0 + 0.055, 0.02);

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
      { kind: "box", position: [nose.x - 0.05, nose.shoulder - 0.06, 0], size: [0.05, 0.24, nose.halfWidth * 1.3], explode: [0.6, 0, 0] },
      { kind: "box", position: [midX + packLen * 0.05, floorY + 0.1, sideZ - 0.08], size: [packLen * 0.9, 0.035, 0.035], explode: [0, -0.3, 0.35] },
      { kind: "box", position: [midX + packLen * 0.05, floorY + 0.1, -sideZ + 0.08], size: [packLen * 0.9, 0.035, 0.035], explode: [0, -0.3, -0.35] },
    ],
    charging: [{ kind: "box", position: [port[0], port[1], port[2] + 0.04], size: [0.1, 0.07, 0.06], explode: [0, 0, -0.45] }],
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
      { kind: "sphere", position: [camPos[0] - 0.06, camPos[1] - 0.06, 0], size: [0.045, 0, 0], explode: [0.2, 0.35, 0] },
      { kind: "sphere", position: [mirror[0] - 0.9, beltY + 0.05, W / 2 - 0.06], size: [0.03, 0, 0], explode: [0, 0.2, 0.35] },
      { kind: "sphere", position: [mirror[0] - 0.9, beltY + 0.05, -W / 2 + 0.06], size: [0.03, 0, 0], explode: [0, 0.2, -0.35] },
      { kind: "sphere", position: [frontAxleX + wheelR * 1.3, sf.section(sf.tAt(frontAxleX + wheelR * 1.3)).shoulder, W / 2 - 0.08], size: [0.028, 0, 0], explode: [0.15, 0, 0.35] },
      { kind: "sphere", position: [frontAxleX + wheelR * 1.3, sf.section(sf.tAt(frontAxleX + wheelR * 1.3)).shoulder, -W / 2 + 0.08], size: [0.028, 0, 0], explode: [0.15, 0, -0.35] },
      { kind: "sphere", position: [-L / 2 + 0.12, sf.section(0.97).shoulder, 0], size: [0.03, 0, 0], explode: [-0.4, 0, 0] },
    ],
    computer: [{ kind: "box", position: [dashX, beltY - 0.1, W * 0.18], size: [0.26, 0.05, 0.22], explode: [0, 0.65, 0.2] }],
  };

  const cameraTargets = Object.fromEntries(
    (Object.keys(components) as ComponentId[]).map((id) => {
      const list = components[id];
      const c = new THREE.Vector3();
      list.forEach((p) => c.add(new THREE.Vector3(...p.position)));
      return [id, c.divideScalar(list.length)];
    }),
  ) as Record<ComponentId, THREE.Vector3>;

  return { L, W, H, wheelR, tireW, frontAxleX, rearAxleX, beltY, cabin: cabinFor(sf), surface: sf, components, cameraTargets };
}
