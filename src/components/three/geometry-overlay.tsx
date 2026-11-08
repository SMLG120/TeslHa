"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { seatParts } from "@/lib/car-design/cabin-parts";
import { partMatrix, steeringWorldPoints, validateVehicle } from "@/lib/car-design/geometry-validation";
import { buildCar } from "./car-mesh";
import type { VehicleLayout } from "./vehicle-geometry";

type P = [number, number, number];

function Lines({ points, color }: { points: P[]; color: string }) {
  const geo = useMemo(() => new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3)), [points]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <lineSegments geometry={geo} renderOrder={20}>
      <lineBasicMaterial color={color} depthTest={false} transparent toneMapped={false} />
    </lineSegments>
  );
}

const polyline = (pts: P[], closed = false) => pts.flatMap((p, i): P[] => (i < pts.length - 1 ? [p, pts[i + 1]] : closed ? [p, pts[0]] : []));
const cross = ([x, y, z]: P, r = 0.04): P[] => [[x - r, y, z], [x + r, y, z], [x, y - r, z], [x, y + r, z], [x, y, z - r], [x, y, z + r]];

/**
 * `?debug=geometry`: vehicle centreline, seat boxes and anchors, steering centre and rim, sampled
 * cabin sections, roof clearance lines and door hinge axes. Loaded on demand, validated once.
 */
export default function GeometryOverlay({ layout }: { layout: VehicleLayout }) {
  const { surface: s, cabin } = layout;
  const data = useMemo(() => {
    const env = cabin.envelope;
    const centre: P[] = [[-s.L / 2, 0.02, 0], [s.L / 2, 0.02, 0], [-s.L / 2, s.H + 0.05, 0], [s.L / 2, s.H + 0.05, 0]];
    const seatBoxes: P[] = [];
    const anchors: P[] = [];
    for (const seat of cabin.seats) {
      anchors.push(...cross(seat.hip));
      const box = new THREE.Box3();
      for (const part of seatParts(seat, cabin.floorY).filter((p) => !p.detail)) {
        const m = partMatrix(seat, part);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) box.expandByPoint(new THREE.Vector3((sx * part.size[0]) / 2, (sy * part.size[1]) / 2, (sz * part.size[2]) / 2).applyMatrix4(m));
      }
      const { min: a, max: b } = box;
      const c: P[] = [[a.x, a.y, a.z], [b.x, a.y, a.z], [b.x, a.y, b.z], [a.x, a.y, b.z], [a.x, b.y, a.z], [b.x, b.y, a.z], [b.x, b.y, b.z], [a.x, b.y, b.z]];
      for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) seatBoxes.push(c[i], c[j]);
    }
    const rim = polyline(steeringWorldPoints(cabin).map((p): P => [p.x, p.y, p.z]), cabin.steering.kind === "round");
    const steering: P[] = [...rim, ...cross(cabin.steering.center, 0.05), cabin.steering.center, cabin.steering.dashAnchor];
    const sections: P[] = [];
    for (let i = 0; i <= 12; i++) {
      const x = cabin.dashX + ((cabin.rearX - cabin.dashX) * i) / 12;
      const top = env.ceiling(x, 0);
      const right: P[] = Array.from({ length: 13 }, (_, j) => {
        const y = cabin.floorY + ((top - cabin.floorY) * j) / 12;
        return [x, y, env.halfWidth(x, y)];
      });
      sections.push(...polyline([...right, ...[...right].reverse().map(([a, b, c]): P => [a, b, -c])], true));
    }
    const roof: P[] = cabin.seatRails.flatMap((z) =>
      [z, -z].flatMap((zz) => polyline(Array.from({ length: 40 }, (_, i): P => {
        const x = cabin.dashX + ((cabin.rearX - cabin.dashX) * i) / 39;
        return [x, env.ceiling(x, zz), zz];
      }))),
    );
    const car = buildCar(s, true);
    const hinges = car.openings.flatMap((o): P[] => {
      const a: P = [...o.hinge];
      const b: P = [...o.hinge];
      const i = { x: 0, y: 1, z: 2 }[o.axis];
      a[i] -= 0.5;
      b[i] += 0.5;
      return [a, b];
    });
    const report = validateVehicle(s);
    Object.values(car).forEach((g) => g instanceof THREE.BufferGeometry && g.dispose());
    car.openings.forEach((o) => [o.paint, o.glass, o.detail, o.inner].forEach((g) => g?.dispose()));
    return { centre, seatBoxes, anchors, steering, sections, roof, hinges, report };
  }, [s, cabin]);

  useEffect(() => {
    document.documentElement.dataset.geometry = JSON.stringify({ design: data.report.design, checks: data.report.checks.length, failures: data.report.failures.map((f) => f.id) });
  }, [data]);

  return (
    <group>
      <Lines points={data.centre} color="#3ddc97" />
      <Lines points={data.seatBoxes} color="#ffd84f" />
      <Lines points={data.anchors} color="#ffffff" />
      <Lines points={data.steering} color="#ff7a45" />
      <Lines points={data.sections} color="#4fd1ff" />
      <Lines points={data.roof} color="#c38bff" />
      <Lines points={data.hinges} color="#ff2a36" />
    </group>
  );
}
