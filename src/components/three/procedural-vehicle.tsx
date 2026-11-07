"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type { BodyGeometry } from "@/types/vehicle";
import type { ComponentId } from "@/data/components";
import { PAINTS, type FlowMode, type PaintId, type RenderMode } from "@/stores/studio";
import { computeLayout, extrudeSilhouette, silhouettePoints, smoothSilhouette, type ComponentPlacement, type VehicleLayout } from "./vehicle-geometry";
import { EnergyFlow } from "./energy-flow";

export interface ProceduralVehicleProps {
  body: BodyGeometry;
  paint?: PaintId;
  mode?: RenderMode;
  headlights?: boolean;
  doorsOpen?: boolean;
  frunkOpen?: boolean;
  trunkOpen?: boolean;
  showComponents?: boolean;
  exploded?: boolean;
  selected?: ComponentId | null;
  onSelect?: (id: ComponentId | null) => void;
  flow?: FlowMode;
  motors?: number;
  /** Simplified geometry for mobile / low-power devices. */
  lowDetail?: boolean;
}

const COMPONENT_COLORS: Record<ComponentId, string> = {
  battery: "#4fd1ff",
  motors: "#ff2a36",
  inverter: "#ffb547",
  regen: "#3ddc97",
  thermal: "#5aa9ff",
  charging: "#ffffff",
  "power-distribution": "#ff7a45",
  suspension: "#b8bec8",
  sensors: "#c38bff",
  computer: "#ffd84f",
};

const damp = THREE.MathUtils.damp;

export function ProceduralVehicle({
  body,
  paint = "volt-red",
  mode = "solid",
  headlights = true,
  doorsOpen = false,
  frunkOpen = false,
  trunkOpen = false,
  showComponents = false,
  exploded = false,
  selected = null,
  onSelect,
  flow = "off",
  motors = 2,
  lowDetail = false,
}: ProceduralVehicleProps) {
  const layout = useMemo(() => computeLayout(body), [body]);
  const segs = lowDetail ? 48 : 120;

  const geometries = useMemo(() => {
    const bodyPts = smoothSilhouette(silhouettePoints(body, "profile"), segs);
    const cabinPts = smoothSilhouette(silhouettePoints(body, "cabin"), segs);
    return {
      body: extrudeSilhouette(bodyPts, layout.W, 0.14),
      cabin: extrudeSilhouette(cabinPts, layout.W * 0.8, 0.12),
    };
  }, [body, layout.W, segs]);

  useEffect(() => () => Object.values(geometries).forEach((g) => g.dispose()), [geometries]);

  const p = PAINTS.find((x) => x.id === paint) ?? PAINTS[0];
  const xray = mode === "xray";
  const wire = mode === "wireframe";

  const materials = useMemo(() => {
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: p.color,
      metalness: p.metalness,
      roughness: p.roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.25,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#07090c",
      metalness: 0.4,
      roughness: 0.04,
      clearcoat: 1,
      transparent: true,
      opacity: 0.55,
      envMapIntensity: 1.6,
    });
    const trim = new THREE.MeshStandardMaterial({ color: "#0a0a0b", metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide });
    const tire = new THREE.MeshStandardMaterial({ color: "#111214", roughness: 0.92 });
    const rim = new THREE.MeshStandardMaterial({ color: "#8d939c", metalness: 1, roughness: 0.22 });
    const interior = new THREE.MeshStandardMaterial({ color: "#1a1b1e", roughness: 0.8 });
    const screen = new THREE.MeshStandardMaterial({ color: "#0b1622", emissive: "#3aa3ff", emissiveIntensity: 0.6 });
    return { paintMat, glass, trim, tire, rim, interior, screen };
  }, [p.color, p.metalness, p.roughness]);

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  // Apply render mode without rebuilding materials.
  useEffect(() => {
    const shell = [materials.paintMat, materials.glass];
    for (const m of shell) {
      m.wireframe = wire;
      m.transparent = xray || m === materials.glass;
      m.opacity = xray ? 0.1 : m === materials.glass ? 0.55 : 1;
      m.depthWrite = !xray;
      m.needsUpdate = true;
    }
    materials.trim.wireframe = wire;
    materials.trim.transparent = xray;
    materials.trim.opacity = xray ? 0.15 : 1;
    materials.trim.needsUpdate = true;
  }, [materials, xray, wire]);

  const componentsVisible = showComponents || xray;

  return (
    <group>
      <mesh geometry={geometries.body} material={materials.paintMat} castShadow receiveShadow />
      <mesh geometry={geometries.cabin} material={materials.glass} castShadow />

      <Underbody layout={layout} material={materials.trim} />
      <Lights layout={layout} on={headlights} />
      {/* The interior would occlude components in x-ray / engineering views. */}
      {!lowDetail && !componentsVisible && <Interior layout={layout} materials={materials} />}

      <Doors layout={layout} style={body.doorStyle} open={doorsOpen} material={materials.paintMat} trim={materials.trim} />
      {body.hasFrunk && <Lid layout={layout} which="hood" open={frunkOpen} material={materials.paintMat} />}
      <Lid layout={layout} which="deck" open={trunkOpen} material={materials.paintMat} />

      <Wheels layout={layout} tire={materials.tire} rim={materials.rim} trim={materials.trim} spinning={flow} lowDetail={lowDetail} />

      {componentsVisible && (
        <Components layout={layout} exploded={exploded} selected={selected} onSelect={onSelect} motors={motors} />
      )}
      {flow !== "off" && <EnergyFlow layout={layout} mode={flow} motors={motors} />}
    </group>
  );
}

function Underbody({ layout, material }: { layout: VehicleLayout; material: THREE.Material }) {
  const { L, W, H } = layout;
  return (
    <group>
      {/* Front fascia intake and rear diffuser read as dark trim. */}
      <mesh position={[L / 2 - 0.02, H * 0.2, 0]} material={material}>
        <boxGeometry args={[0.06, H * 0.08, W * 0.6]} />
      </mesh>
      <mesh position={[-L / 2 + 0.03, H * 0.17, 0]} material={material}>
        <boxGeometry args={[0.08, H * 0.07, W * 0.72]} />
      </mesh>
    </group>
  );
}

function Lights({ layout, on }: { layout: VehicleLayout; on: boolean }) {
  const { L, W, H } = layout;
  const mats = useMemo(
    () => ({
      head: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#dfefff", emissiveIntensity: 6, toneMapped: false }),
      tail: new THREE.MeshStandardMaterial({ color: "#300", emissive: "#ff1a24", emissiveIntensity: 4, toneMapped: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useFrame((_, dt) => {
    mats.head.emissiveIntensity = damp(mats.head.emissiveIntensity, on ? 6 : 0.05, 6, dt);
    mats.tail.emissiveIntensity = damp(mats.tail.emissiveIntensity, on ? 4 : 0.3, 6, dt);
  });
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(L / 2 + 6, 0, 0);
    return o;
  }, [L]);
  return (
    <group>
      {[1, -1].map((side) => (
        <mesh key={side} material={mats.head} position={[L / 2 - 0.05, H * 0.46, side * W * 0.33]} rotation={[0, side * 0.35, 0]}>
          <boxGeometry args={[0.04, 0.035, W * 0.2]} />
        </mesh>
      ))}
      <mesh material={mats.tail} position={[-L / 2 + 0.02, H * 0.5, 0]}>
        <boxGeometry args={[0.03, 0.025, W * 0.86]} />
      </mesh>
      <primitive object={target} />
      {on && <spotLight position={[L / 2 + 0.1, H * 0.46, 0]} target={target} angle={0.5} penumbra={0.8} intensity={30} distance={14} color="#e6f0ff" />}
    </group>
  );
}

function Interior({ layout, materials }: { layout: VehicleLayout; materials: Record<string, THREE.Material> }) {
  const { W, beltY, frontAxleX, rearAxleX, H } = layout;
  const mid = (frontAxleX + rearAxleX) / 2;
  const seatY = H * 0.3;
  const seats: [number, number][] = [
    [mid + 0.25, W * 0.2],
    [mid + 0.25, -W * 0.2],
    [mid - 0.55, W * 0.2],
    [mid - 0.55, -W * 0.2],
  ];
  return (
    <group>
      {seats.map(([x, z], i) => (
        <group key={i} position={[x, seatY, z]}>
          <mesh material={materials.interior} position={[0, 0.05, 0]}>
            <boxGeometry args={[0.45, 0.1, 0.45]} />
          </mesh>
          <mesh material={materials.interior} position={[-0.22, 0.32, 0]} rotation={[0, 0, -0.18]}>
            <boxGeometry args={[0.1, 0.55, 0.44]} />
          </mesh>
        </group>
      ))}
      <mesh material={materials.interior} position={[mid + 0.85, beltY - 0.08, 0]}>
        <boxGeometry args={[0.35, 0.14, W * 0.82]} />
      </mesh>
      <mesh material={materials.screen} position={[mid + 0.68, beltY + 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.38, 0.24]} />
      </mesh>
      <mesh material={materials.trim} position={[mid + 0.68, beltY + 0.02, -W * 0.2]} rotation={[0, Math.PI / 2, 0.35]}>
        <torusGeometry args={[0.17, 0.018, 12, 40]} />
      </mesh>
    </group>
  );
}

function Doors({
  layout,
  style,
  open,
  material,
  trim,
}: {
  layout: VehicleLayout;
  style: BodyGeometry["doorStyle"];
  open: boolean;
  material: THREE.Material;
  trim: THREE.Material;
}) {
  const { W, doorSpan, H } = layout;
  const { x0, x1, y0, y1 } = doorSpan;
  const h = y1 - y0;
  const midX = (x0 + x1) / 2;
  const panels: { from: number; to: number; falcon: boolean }[] =
    style === "coupe"
      ? [{ from: x0 + (x1 - x0) * 0.25, to: x1, falcon: false }]
      : [
          { from: midX + 0.02, to: x1, falcon: false },
          { from: x0, to: midX - 0.02, falcon: style === "falcon" },
        ];

  return (
    <group>
      {panels.map((panel, i) =>
        [1, -1].map((side) => (
          <DoorPanel
            key={`${i}-${side}`}
            side={side}
            from={panel.from}
            to={panel.to}
            y0={y0}
            h={panel.falcon ? H - y0 - 0.02 : h}
            z={side * (W / 2 + 0.004)}
            falcon={panel.falcon}
            open={open}
            material={material}
            trim={trim}
          />
        )),
      )}
    </group>
  );
}

function DoorPanel({
  side,
  from,
  to,
  y0,
  h,
  z,
  falcon,
  open,
  material,
  trim,
}: {
  side: number;
  from: number;
  to: number;
  y0: number;
  h: number;
  z: number;
  falcon: boolean;
  open: boolean;
  material: THREE.Material;
  trim: THREE.Material;
}) {
  const ref = useRef<THREE.Group>(null);
  const len = to - from;
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (falcon) {
      // Falcon-wing: hinge along the roof line, swings up and out around X.
      ref.current.rotation.x = damp(ref.current.rotation.x, open ? -side * 1.25 : 0, 4, dt);
    } else {
      // Conventional: hinge at the front edge, swings outward around Y.
      ref.current.rotation.y = damp(ref.current.rotation.y, open ? side * 1.05 : 0, 4, dt);
    }
  });

  if (falcon) {
    const hingeY = y0 + h;
    return (
      <group ref={ref} position={[(from + to) / 2, hingeY, z - side * 0.25]}>
        <mesh material={material} position={[0, -h / 2, side * 0.25]} castShadow>
          <boxGeometry args={[len, h, 0.02]} />
        </mesh>
        <mesh material={trim} position={[0, -h / 2, side * 0.262]}>
          <boxGeometry args={[len + 0.01, 0.006, 0.004]} />
        </mesh>
      </group>
    );
  }
  return (
    <group ref={ref} position={[to, y0, z]}>
      <mesh material={material} position={[-len / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[len, h, 0.02]} />
      </mesh>
      {/* Panel gap lines + flush handle */}
      <mesh material={trim} position={[-len, h / 2, side * 0.011]}>
        <boxGeometry args={[0.006, h, 0.004]} />
      </mesh>
      <mesh material={trim} position={[-len * 0.25, h * 0.78, side * 0.012]}>
        <boxGeometry args={[0.16, 0.018, 0.006]} />
      </mesh>
    </group>
  );
}

function Lid({ layout, which, open, material }: { layout: VehicleLayout; which: "hood" | "deck"; open: boolean; material: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  const seg = layout[which];
  const len = seg.from.distanceTo(seg.to);
  const angle = Math.atan2(seg.to.y - seg.from.y, seg.to.x - seg.from.x);
  // Hood hinges at the windshield end; deck lid hinges at the rear-glass end.
  const hinge = which === "hood" ? seg.to : seg.from;
  const mid = seg.from.clone().add(seg.to).multiplyScalar(0.5).sub(hinge);
  const openAngle = which === "hood" ? 0.9 : -0.9;
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z = damp(ref.current.rotation.z, open ? openAngle : 0, 4, dt);
  });
  return (
    <group ref={ref} position={[hinge.x, hinge.y + 0.014, 0]}>
      <mesh material={material} position={[mid.x, mid.y, 0]} rotation={[0, 0, angle]} castShadow>
        <boxGeometry args={[len, 0.02, layout.W * 0.74]} />
      </mesh>
    </group>
  );
}

function Wheels({
  layout,
  tire,
  rim,
  trim,
  spinning,
  lowDetail,
}: {
  layout: VehicleLayout;
  tire: THREE.Material;
  rim: THREE.Material;
  trim: THREE.Material;
  spinning: FlowMode;
  lowDetail: boolean;
}) {
  const { frontAxleX, rearAxleX, wheelR, tireW, W } = layout;
  const spin = useRef<THREE.Group[]>([]);
  useFrame((_, dt) => {
    const v = spinning === "drive" ? -6 : spinning === "regen" ? -3 : 0;
    spin.current.forEach((g) => g && (g.rotation.z += v * dt));
  });
  const spokes = lowDetail ? 0 : 5;
  const positions: [number, number][] = [
    [frontAxleX, 1],
    [frontAxleX, -1],
    [rearAxleX, 1],
    [rearAxleX, -1],
  ];
  return (
    <group>
      {positions.map(([x, side], i) => (
        <group key={i} position={[x, wheelR, side * (W / 2 - tireW / 2 + 0.02)]}>
          {/* Wheel-arch liner: a dark disc behind the tyre reads as the arch opening. */}
          <mesh position={[0, 0.02, side * (tireW / 2 - 0.012)]} material={trim}>
            <circleGeometry args={[wheelR * 1.12, 40, 0, Math.PI]} />
          </mesh>
          <group ref={(g) => { if (g) spin.current[i] = g; }}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={tire} castShadow>
              <cylinderGeometry args={[wheelR, wheelR, tireW, lowDetail ? 24 : 48]} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, side * 0.006]} material={rim}>
              <cylinderGeometry args={[wheelR * 0.68, wheelR * 0.68, tireW + 0.004, lowDetail ? 24 : 48]} />
            </mesh>
            {Array.from({ length: spokes }).map((_, s) => (
              <mesh key={s} rotation={[0, 0, (s / spokes) * Math.PI * 2]} position={[0, 0, side * (tireW / 2 + 0.006)]} material={trim}>
                <boxGeometry args={[wheelR * 1.15, 0.035, 0.012]} />
              </mesh>
            ))}
            <mesh position={[0, 0, side * (tireW / 2 + 0.01)]} rotation={[Math.PI / 2, 0, 0]} material={trim}>
              <cylinderGeometry args={[wheelR * 0.14, wheelR * 0.14, 0.01, 24]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

function Components({
  layout,
  exploded,
  selected,
  onSelect,
  motors,
}: {
  layout: VehicleLayout;
  exploded: boolean;
  selected: ComponentId | null;
  onSelect?: (id: ComponentId | null) => void;
  motors: number;
}) {
  return (
    <group>
      {(Object.keys(layout.components) as ComponentId[]).map((id) => {
        let placements = layout.components[id];
        // Single-motor (RWD) configurations have no front drive unit / inverter.
        if (motors < 2 && (id === "motors" || id === "inverter")) placements = placements.slice(0, 1);
        return placements.map((pl, i) => (
          <ComponentMesh
            key={`${id}-${i}`}
            id={id}
            placement={pl}
            exploded={exploded}
            dimmed={selected !== null && selected !== id}
            active={selected === id}
            onSelect={onSelect}
          />
        ));
      })}
    </group>
  );
}

function ComponentMesh({
  id,
  placement,
  exploded,
  dimmed,
  active,
  onSelect,
}: {
  id: ComponentId;
  placement: ComponentPlacement;
  exploded: boolean;
  dimmed: boolean;
  active: boolean;
  onSelect?: (id: ComponentId | null) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const base = useMemo(() => new THREE.Vector3(...placement.position), [placement.position]);
  const offset = useMemo(() => new THREE.Vector3(...placement.explode), [placement.explode]);
  const hovered = useRef(false);

  useFrame((state, dt) => {
    if (ref.current) {
      const target = exploded ? base.clone().add(offset) : base;
      ref.current.position.x = damp(ref.current.position.x, target.x, 5, dt);
      ref.current.position.y = damp(ref.current.position.y, target.y, 5, dt);
      ref.current.position.z = damp(ref.current.position.z, target.z, 5, dt);
    }
    if (mat.current) {
      const pulse = active ? 1.4 + Math.sin(state.clock.elapsedTime * 4) * 0.5 : hovered.current ? 1 : 0.35;
      mat.current.emissiveIntensity = damp(mat.current.emissiveIntensity, pulse, 8, dt);
      mat.current.opacity = damp(mat.current.opacity, dimmed ? 0.25 : 1, 8, dt);
    }
  });

  const color = COMPONENT_COLORS[id];
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.(active ? null : id);
  };
  const [a, b, c] = placement.size;

  return (
    <group ref={ref} position={placement.position}>
      <mesh
        rotation={placement.rotation}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          hovered.current = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hovered.current = false;
          document.body.style.cursor = "";
        }}
      >
        {placement.kind === "box" && <boxGeometry args={[a, b, c]} />}
        {placement.kind === "cylinder" && <cylinderGeometry args={[a, b, c, 32]} />}
        {placement.kind === "ring" && <torusGeometry args={[a, b, 12, 48]} />}
        {placement.kind === "spring" && <cylinderGeometry args={[a, a, b, 16, 8, true]} />}
        {placement.kind === "sphere" && <sphereGeometry args={[a, 20, 20]} />}
        <meshStandardMaterial
          ref={mat}
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          metalness={0.4}
          roughness={0.35}
          transparent
          wireframe={placement.kind === "spring"}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
