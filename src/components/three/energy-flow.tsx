"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { VehicleLayout } from "./vehicle-geometry";

const PER_PATH = 28;

/**
 * Educational energy-flow visualisation.
 * drive: battery → inverter → motor → wheels (red)
 * regen: wheels → motor (as generator) → inverter → battery (green)
 */
export function EnergyFlow({ layout, mode, motors, intensity = 1 }: { layout: VehicleLayout; mode: "drive" | "regen"; motors: number; intensity?: number }) {
  const curves = useMemo(() => buildCurves(layout, motors), [layout, motors]);
  const tubes = useMemo(() => curves.map((c) => new THREE.TubeGeometry(c, 64, 0.012, 8, false)), [curves]);
  useEffect(() => () => tubes.forEach((t) => t.dispose()), [tubes]);

  const count = curves.length * PER_PATH;
  const inst = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = mode === "drive" ? "#ff2a36" : "#3ddc97";

  useFrame((state) => {
    const mesh = inst.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime * 0.35 * Math.max(0.2, intensity);
    let k = 0;
    curves.forEach((curve) => {
      for (let i = 0; i < PER_PATH; i++) {
        let u = (i / PER_PATH + t) % 1;
        if (mode === "regen") u = 1 - u;
        curve.getPointAt(u, dummy.position);
        const s = 0.6 + 0.4 * Math.sin(u * Math.PI);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(k++, dummy.matrix);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
        </mesh>
      ))}
      <instancedMesh ref={inst} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function buildCurves(l: VehicleLayout, motors: number) {
  const battery = new THREE.Vector3((l.frontAxleX + l.rearAxleX) / 2, l.H * 0.16 + 0.08, 0);
  const axles = motors >= 2 ? [l.rearAxleX, l.frontAxleX] : [l.rearAxleX];
  const curves: THREE.CatmullRomCurve3[] = [];
  axles.forEach((ax) => {
    const toward = Math.sign(ax - battery.x);
    const inverter = new THREE.Vector3(ax - toward * 0.23, l.wheelR + 0.13, 0);
    const motor = new THREE.Vector3(ax, l.wheelR, 0);
    [1, -1].forEach((side) => {
      const wheel = new THREE.Vector3(ax, l.wheelR, side * (l.W / 2 - l.tireW));
      curves.push(
        new THREE.CatmullRomCurve3([
          battery.clone().setZ(side * 0.08),
          new THREE.Vector3((battery.x + inverter.x) / 2, battery.y + 0.04, side * 0.08),
          inverter.clone().setZ(side * 0.06),
          motor.clone().setZ(side * 0.12),
          wheel,
        ]),
      );
    });
  });
  return curves;
}
