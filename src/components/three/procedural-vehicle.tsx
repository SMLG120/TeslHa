"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type { BodyGeometry } from "@/types/vehicle";
import type { ComponentId } from "@/data/components";
import { PAINTS, type FlowMode, type PaintId, type RenderMode } from "@/stores/studio";
import { surfaceFor, type CarSurface } from "@/lib/car-design/surface";
import { buildCar, buildWheel, type CarMeshes, type Opening, type WheelGeometries } from "./car-mesh";
import { computeLayout, type ComponentPlacement, type VehicleLayout } from "./vehicle-geometry";
import { EnergyFlow } from "./energy-flow";
import { CabinInterior, DoorCardDetails, useCabinMaterials, type CabinLight } from "./cabin-interior";
import { cabinFor } from "@/lib/car-design/cabin";
import { wheelhouseInnerZ } from "@/lib/car-design/vehicle-frame";

export interface ProceduralVehicleProps {
  body: BodyGeometry;
  paint?: PaintId;
  mode?: RenderMode;
  headlights?: boolean;
  taillights?: boolean;
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
  cabinLight?: CabinLight;
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
/** Tinted but see-through, so the modelled cabin reads from outside. */
const GLASS_OPACITY = 0.8;

function disposeAll(list: (THREE.BufferGeometry | THREE.Material | null | undefined)[]) {
  list.forEach((x) => x?.dispose());
}

export function ProceduralVehicle({
  body,
  paint = "volt-red",
  mode = "solid",
  headlights = true,
  taillights = true,
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
  cabinLight = "soft",
}: ProceduralVehicleProps) {
  const surface = surfaceFor(body);
  const layout = useMemo(() => computeLayout(body), [body]);
  const car = useMemo(() => buildCar(surface, lowDetail), [surface, lowDetail]);
  const wheel = useMemo(
    () => buildWheel(surface.wheelR, surface.tireW, surface.design.rimRatio, surface.design.rim, lowDetail),
    [surface, lowDetail],
  );

  useEffect(
    () => () =>
      disposeAll([
        car.body,
        car.liner,
        car.glass,
        car.seams,
        car.trim,
        car.housings,
        car.head,
        car.drl,
        car.tail,
        ...car.openings.flatMap((o) => [o.paint, o.glass, o.detail, o.inner]),
      ]),
    [car],
  );
  useEffect(() => () => disposeAll(Object.values(wheel)), [wheel]);

  const p = PAINTS.find((x) => x.id === paint) ?? PAINTS[0];
  const xray = mode === "xray";
  const wire = mode === "wireframe";

  const mats = useMemo(() => {
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: p.color,
      metalness: p.metalness,
      roughness: p.roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.35,
    });
    const paintDouble = paintMat.clone();
    paintDouble.side = THREE.DoubleSide;
    return {
      paint: paintMat,
      paintDouble,
      under: new THREE.MeshStandardMaterial({ color: "#0b0c0e", roughness: 0.85, metalness: 0.2 }),
      liner: new THREE.MeshStandardMaterial({ color: "#121316", roughness: 0.9, side: THREE.BackSide }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#0b0e13",
        metalness: 0.3,
        roughness: 0.03,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        transparent: true,
        opacity: GLASS_OPACITY,
        envMapIntensity: 1.7,
      }),
      glassDouble: new THREE.MeshPhysicalMaterial({ color: "#0b0e13", metalness: 0.3, roughness: 0.03, transparent: true, opacity: GLASS_OPACITY, envMapIntensity: 1.7 }),
      roof: new THREE.MeshPhysicalMaterial({ color: "#040506", metalness: 0.4, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.7 }),
      // Pulled toward the camera so the thin strips never fight the panel they sit on.
      seam: new THREE.MeshStandardMaterial({ color: "#050505", roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      trim: new THREE.MeshPhysicalMaterial({ color: "#07080a", roughness: 0.32, metalness: 0.2, clearcoat: 0.6 }),
      housing: new THREE.MeshPhysicalMaterial({ color: "#0c0d10", roughness: 0.08, metalness: 0.5, clearcoat: 1, envMapIntensity: 1.8 }),
      handle: new THREE.MeshStandardMaterial({ color: "#2a2d33", metalness: 0.9, roughness: 0.3 }),
      tire: new THREE.MeshStandardMaterial({ color: "#121315", roughness: 0.88, metalness: 0 }),
      rim: new THREE.MeshStandardMaterial({ color: "#c9ced6", metalness: 0.85, roughness: 0.28, envMapIntensity: 1.8, side: THREE.DoubleSide }),
      rimDark: new THREE.MeshStandardMaterial({ color: "#1b1d21", metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }),
      disc: new THREE.MeshStandardMaterial({ color: "#6c7078", metalness: 0.9, roughness: 0.45 }),
      caliper: new THREE.MeshStandardMaterial({ color: surface.design.caliper, metalness: 0.4, roughness: 0.4 }),
    };
  }, [p.color, p.metalness, p.roughness, surface.design.caliper]);
  useEffect(() => () => disposeAll(Object.values(mats)), [mats]);

  // Render modes mutate shared materials instead of rebuilding them.
  useEffect(() => {
    const shell = [mats.paint, mats.paintDouble, mats.glass, mats.glassDouble, mats.roof, mats.trim, mats.housing, mats.under];
    for (const m of shell) {
      const isGlass = m === mats.glass || m === mats.glassDouble;
      m.wireframe = wire && !isGlass;
      m.transparent = xray || isGlass;
      m.opacity = xray ? (isGlass ? 0.05 : 0.1) : isGlass ? GLASS_OPACITY : 1;
      m.depthWrite = !xray;
      m.needsUpdate = true;
    }
    mats.glass.visible = !wire;
    mats.glassDouble.visible = !wire;
    mats.liner.visible = !xray && !wire;
  }, [mats, xray, wire]);

  const componentsVisible = showComponents || xray;
  const showCabin = !componentsVisible && !wire;
  const cabin = cabinFor(surface);
  const cabinMats = useCabinMaterials(cabin, cabin.spec.glassRoof);
  const openFor = (o: Opening) => (o.kind === "frunk" ? frunkOpen : o.kind === "trunk" ? trunkOpen : doorsOpen);

  return (
    <group>
      <mesh geometry={car.body} material={[mats.paint, mats.under]} castShadow receiveShadow />
      <mesh geometry={car.liner} material={mats.liner} />
      <mesh geometry={car.glass} material={[mats.glass, mats.roof]} />
      <mesh geometry={car.seams} material={mats.seam} />
      <mesh geometry={car.trim} material={mats.trim} />
      <mesh geometry={car.housings} material={mats.housing} />
      <Lamps car={car} surface={surface} headlights={headlights} taillights={taillights} />

      {car.openings.map((o, i) => (
        <OpeningPanel key={i} opening={o} open={openFor(o)} paint={mats.paintDouble} glass={o.kind === "falcon" ? [mats.glassDouble, mats.roof] : mats.glassDouble} detail={mats.handle}>
          {showCabin && o.inner && (
            <>
              <mesh geometry={o.inner} material={cabinMats.trimPanel} />
              <DoorCardDetails cabin={cabin} door={o.door!} side={o.hinge[2] > 0 ? 1 : -1} mats={cabinMats} />
            </>
          )}
        </OpeningPanel>
      ))}

      <Mirrors car={car} paint={mats.paint} trim={mats.trim} />
      <WheelWells layout={layout} material={mats.under} />
      <Wheels layout={layout} geo={wheel} mats={mats} spinning={flow} />

      {showCabin && <CabinInterior surface={surface} cabin={cabin} mats={cabinMats} car={car} light={cabinLight} low={lowDetail} />}

      {componentsVisible && <Components layout={layout} exploded={exploded} selected={selected} onSelect={onSelect} motors={motors} />}
      {flow !== "off" && <EnergyFlow layout={layout} mode={flow} motors={motors} />}
    </group>
  );
}

function Lamps({ car, surface, headlights, taillights }: { car: CarMeshes; surface: CarSurface; headlights: boolean; taillights: boolean }) {
  const lamp = useMemo(
    () => ({
      head: new THREE.MeshStandardMaterial({ color: "#f4f8ff", emissive: "#e3eeff", emissiveIntensity: 5, toneMapped: false, roughness: 0.2 }),
      tail: new THREE.MeshStandardMaterial({ color: "#3a0507", emissive: "#ff1a24", emissiveIntensity: 3.5, toneMapped: false, roughness: 0.25 }),
    }),
    [],
  );
  useEffect(() => () => disposeAll(Object.values(lamp)), [lamp]);
  useFrame((_, dt) => {
    lamp.head.emissiveIntensity = damp(lamp.head.emissiveIntensity, headlights ? 5 : 0.02, 6, dt);
    lamp.head.color.lerp(new THREE.Color(headlights ? "#f4f8ff" : "#30343a"), Math.min(1, dt * 6));
    lamp.tail.emissiveIntensity = damp(lamp.tail.emissiveIntensity, taillights ? 3.5 : 0.12, 6, dt);
  });

  const d = surface.design;
  const h = d.lights.head[0];
  const hp = surface.body((h.t[0] + h.t[1]) / 2, (h.u[0] + h.u[1]) / 2);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(hp[0] + 8, 0, 0);
    return o;
  }, [hp[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group>
      <mesh geometry={car.head} material={lamp.head} />
      {car.drl && <mesh geometry={car.drl} material={lamp.head} />}
      <mesh geometry={car.tail} material={lamp.tail} />
      <primitive object={target} />
      {headlights &&
        [1, -1].map((side) => (
          <spotLight
            key={side}
            position={[hp[0] + 0.05, hp[1], hp[2] * side]}
            target={target}
            angle={0.45}
            penumbra={0.85}
            intensity={18}
            distance={12}
            color="#e6f0ff"
          />
        ))}
    </group>
  );
}

function OpeningPanel({ opening, open, paint, glass, detail, children }: { opening: Opening; open: boolean; paint: THREE.Material; glass: THREE.Material | THREE.Material[]; detail: THREE.Material; children?: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const [hx, hy, hz] = opening.hinge;
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const target = open ? opening.angle : 0;
    g.rotation[opening.axis] = damp(g.rotation[opening.axis], target, 3.6, dt);
  });
  return (
    <group ref={ref} position={[hx, hy, hz]}>
      <group position={[-hx, -hy, -hz]}>
        <mesh geometry={opening.paint} material={paint} castShadow />
        {opening.glass && <mesh geometry={opening.glass} material={glass} />}
        {opening.detail && <mesh geometry={opening.detail} material={detail} />}
        {children}
      </group>
    </group>
  );
}

function Mirrors({ car, paint, trim }: { car: CarMeshes; paint: THREE.Material; trim: THREE.Material }) {
  return (
    <group>
      {car.mirrors.map(({ position, side }) => (
        <group key={side} position={position}>
          <mesh material={paint} scale={[0.055, 0.045, 0.095]} castShadow>
            <sphereGeometry args={[1, 24, 16]} />
          </mesh>
          <mesh material={trim} position={[-0.012, -0.004, 0]} scale={[0.047, 0.038, 0.085]}>
            <sphereGeometry args={[1, 20, 12]} />
          </mesh>
          <mesh material={trim} position={[0.02, -0.03, -side * 0.08]} rotation={[side * 0.5, 0, 0]}>
            <boxGeometry args={[0.05, 0.02, 0.09]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Wheel-well liners: a half-cylinder that follows the arch cut-out (so it can never poke through
 * the hood) plus inner half-disc walls, so the arches read as openings rather than see-through gaps.
 */
function WheelWells({ layout, material }: { layout: VehicleLayout; material: THREE.Material }) {
  const { surface: s, W } = layout;
  const inner = wheelhouseInnerZ(s);
  const r = s.archR - 0.012;
  // One short shell per wheel, inner wall to flank; it must not span the cabin between them.
  const span = W / 2 - inner;
  const geo = useMemo(() => {
    const shell = new THREE.CylinderGeometry(r, r, span, 40, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2);
    const wall = new THREE.CircleGeometry(r, 40, 0, Math.PI);
    return { shell, wall };
  }, [r, span]);
  useEffect(() => () => disposeAll([geo.shell, geo.wall]), [geo]);
  const wellMat = useMemo(() => {
    const m = (material as THREE.MeshStandardMaterial).clone();
    m.side = THREE.DoubleSide;
    return m;
  }, [material]);
  useEffect(() => () => wellMat.dispose(), [wellMat]);
  return (
    <group>
      {[s.frontAxleX, s.rearAxleX].map((x) => (
        <group key={x} position={[x, s.wheelR, 0]}>
          <mesh geometry={geo.shell} material={wellMat} position={[0, 0, inner + span / 2]} />
          <mesh geometry={geo.shell} material={wellMat} position={[0, 0, -inner - span / 2]} />
          <mesh geometry={geo.wall} material={wellMat} position={[0, 0, inner]} />
          <mesh geometry={geo.wall} material={wellMat} position={[0, 0, -inner]} />
        </group>
      ))}
    </group>
  );
}

function Wheels({
  layout,
  geo,
  mats,
  spinning,
}: {
  layout: VehicleLayout;
  geo: WheelGeometries;
  mats: Record<string, THREE.Material>;
  spinning: FlowMode;
}) {
  const { frontAxleX, rearAxleX, wheelR, tireW, W } = layout;
  const spin = useRef<THREE.Group[]>([]);
  useFrame((_, dt) => {
    const v = spinning === "drive" ? 6 : spinning === "regen" ? 3 : 0;
    spin.current.forEach((g) => g && (g.rotation.z -= v * dt));
  });
  const z = W / 2 - tireW / 2 - 0.045;
  const positions: [number, 1 | -1][] = [
    [frontAxleX, 1],
    [frontAxleX, -1],
    [rearAxleX, 1],
    [rearAxleX, -1],
  ];
  return (
    <group>
      {positions.map(([x, side], i) => (
        <group key={i} position={[x, wheelR, side * z]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
          <mesh geometry={geo.caliper} material={mats.caliper} />
          <group ref={(g) => void (g && (spin.current[i] = g))}>
            <mesh geometry={geo.tire} material={mats.tire} castShadow />
            <mesh geometry={geo.barrel} material={mats.rimDark} />
            <mesh geometry={geo.face} material={mats.rim} castShadow />
            <mesh geometry={geo.accent} material={mats.rimDark} />
            <mesh geometry={geo.disc} material={mats.disc} />
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
