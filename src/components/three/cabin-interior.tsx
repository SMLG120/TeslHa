"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { CarSurface } from "@/lib/car-design/surface";
import type { CabinLayout, CabinLight, SeatPlacement } from "@/lib/car-design/cabin";
import { BACK_PIVOT, seatParts, YOKE_RIM, type BoxPart } from "@/lib/car-design/cabin-parts";
import type { CarMeshes } from "./car-mesh";

export type { CabinLight };

const LIGHT_INTENSITY: Record<CabinLight, number> = { off: 0, soft: 1.4, bright: 3.6 };

/* ── Display textures (drawn once, shared by every car) ───────────────────── */

let screenTex: THREE.CanvasTexture | null = null;
let clusterTex: THREE.CanvasTexture | null = null;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** Generic infotainment UI: vehicle panel on the left, map with a route on the right. Not a copy of Tesla's UI. */
function getScreenTexture() {
  if (screenTex) return screenTex;
  const [c, g] = canvas(1024, 600);
  g.fillStyle = "#0d0f12";
  g.fillRect(0, 0, 1024, 600);
  // Map
  g.fillStyle = "#1a1d22";
  g.fillRect(380, 0, 644, 600);
  g.strokeStyle = "#2a2f37";
  g.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    g.moveTo(380 + i * 52, 0);
    g.lineTo(330 + i * 60, 600);
    g.stroke();
    g.beginPath();
    g.moveTo(380, i * 48);
    g.lineTo(1024, i * 44 + 30);
    g.stroke();
  }
  g.strokeStyle = "#3e8bff";
  g.lineWidth = 10;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(560, 560);
  g.lineTo(600, 380);
  g.lineTo(760, 300);
  g.lineTo(820, 90);
  g.stroke();
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(560, 540, 14, 0, Math.PI * 2);
  g.fill();
  // Vehicle panel
  g.fillStyle = "#e9ecf1";
  g.font = "600 44px system-ui, sans-serif";
  g.fillText("P", 40, 70);
  g.fillStyle = "#6c727c";
  g.fillText("R N D", 80, 70);
  g.fillStyle = "#c9ced6";
  g.beginPath();
  g.roundRect(120, 160, 140, 300, 60);
  g.fill();
  g.fillStyle = "#0d0f12";
  g.beginPath();
  g.roundRect(140, 230, 100, 120, 30);
  g.fill();
  g.fillStyle = "#3ddc97";
  g.fillRect(40, 520, 220, 16);
  g.fillStyle = "#6c727c";
  g.font = "500 30px system-ui, sans-serif";
  g.fillText("80%", 280, 536);
  // Dock
  g.fillStyle = "#16181c";
  g.fillRect(0, 556, 1024, 44);
  screenTex = new THREE.CanvasTexture(c);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 4;
  return screenTex;
}

function getClusterTexture() {
  if (clusterTex) return clusterTex;
  const [c, g] = canvas(512, 180);
  g.fillStyle = "#0d0f12";
  g.fillRect(0, 0, 512, 180);
  g.fillStyle = "#e9ecf1";
  g.font = "600 96px system-ui, sans-serif";
  g.textAlign = "center";
  g.fillText("0", 256, 118);
  g.font = "500 26px system-ui, sans-serif";
  g.fillStyle = "#8a9099";
  g.fillText("MPH", 256, 156);
  g.textAlign = "left";
  g.fillText("P", 40, 100);
  g.fillStyle = "#3ddc97";
  g.fillRect(380, 84, 90, 10);
  clusterTex = new THREE.CanvasTexture(c);
  clusterTex.colorSpace = THREE.SRGBColorSpace;
  return clusterTex;
}

/* ── Materials ─────────────────────────────────────────────────────────────── */

export function useCabinMaterials(cabin: CabinLayout, glassRoof: boolean) {
  const { base, accent } = cabin.spec.upholstery;
  const mats = useMemo(() => {
    const light = new THREE.Color(base).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
    return {
      seat: new THREE.MeshPhysicalMaterial({ color: base, roughness: 0.62, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(base) }),
      accent: new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.85, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(accent) }),
      stitch: new THREE.MeshStandardMaterial({ color: light ? "#8d8b86" : "#4a4c51", roughness: 0.8 }),
      dash: new THREE.MeshStandardMaterial({ color: "#17181b", roughness: 0.78 }),
      trimPanel: new THREE.MeshStandardMaterial({ color: light ? "#cfccc6" : "#1b1c1f", roughness: 0.8, side: THREE.DoubleSide }),
      dashDark: new THREE.MeshStandardMaterial({ color: "#121316", roughness: 0.8 }),
      band: new THREE.MeshPhysicalMaterial({ color: "#2b2c30", roughness: 0.35, metalness: 0.15, clearcoat: 0.5 }),
      gloss: new THREE.MeshPhysicalMaterial({ color: "#050506", roughness: 0.12, clearcoat: 1, metalness: 0.2 }),
      metal: new THREE.MeshStandardMaterial({ color: "#a6abb3", roughness: 0.3, metalness: 0.9 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#141517", roughness: 0.55 }),
      carpet: new THREE.MeshStandardMaterial({ color: "#0f1012", roughness: 1 }),
      carpetDouble: new THREE.MeshStandardMaterial({ color: "#0f1012", roughness: 1, side: THREE.DoubleSide }),
      ambient: new THREE.MeshStandardMaterial({ color: "#3a0507", emissive: "#ff2a36", emissiveIntensity: 1.2 }),
      screen: new THREE.MeshBasicMaterial({ map: getScreenTexture() }),
      cluster: new THREE.MeshBasicMaterial({ map: getClusterTexture() }),
      dial: new THREE.MeshStandardMaterial({ color: "#0b0c0e", emissive: "#9fb4cc", emissiveIntensity: 0.12, roughness: 0.4 }),
      // Inside faces of the greenhouse: a faint tint for side glass, a dark tint or headliner for the roof.
      glassInside: new THREE.MeshPhysicalMaterial({ color: "#0b0e13", roughness: 0.05, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false }),
      roofInside: glassRoof
        ? new THREE.MeshPhysicalMaterial({ color: "#0a0c10", roughness: 0.05, transparent: true, opacity: 0.55, side: THREE.BackSide, depthWrite: false })
        : new THREE.MeshStandardMaterial({ color: "#1d1e22", roughness: 0.95, side: THREE.BackSide }),
    };
  }, [base, accent, glassRoof]);
  // Shared display textures are kept for the session; only per-cabin materials are disposed.
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

type Mats = ReturnType<typeof useCabinMaterials>;

/* ── Parts ─────────────────────────────────────────────────────────────────── */

function SeatBox({ part, mats, low }: { part: BoxPart; mats: Mats; low: boolean }) {
  const material = part.material === "frame" ? mats.dashDark : mats[part.material];
  const rotation: [number, number, number] = [0, 0, part.rotZ ?? 0];
  if (part.radius > 0) return <RoundedBox args={part.size} radius={part.radius} smoothness={low ? 2 : 4} position={part.pos} rotation={rotation} material={material} />;
  return (
    <mesh material={material} position={part.pos} rotation={rotation}>
      <boxGeometry args={part.size} />
    </mesh>
  );
}

/** One seat: parts from cabin-parts.ts in a seat frame and a reclined child frame. */
function Seat({ seat, mats, floorY, low }: { seat: SeatPlacement; mats: Mats; floorY: number; low: boolean }) {
  const parts = seatParts(seat, floorY).filter((p) => !(low && p.detail));
  return (
    <group position={seat.hip}>
      {parts.filter((p) => p.parent === "seat").map((p) => <SeatBox key={p.id} part={p} mats={mats} low={low} />)}
      <group position={BACK_PIVOT} rotation={[0, 0, seat.recline]}>
        {parts.filter((p) => p.parent === "back").map((p) => <SeatBox key={p.id} part={p} mats={mats} low={low} />)}
      </group>
    </group>
  );
}

function SteeringWheel({ cabin, mats }: { cabin: CabinLayout; mats: Mats }) {
  const { center, radius: R, tilt, columnLength, tube, kind } = cabin.steering;
  const yoke = kind === "yoke";
  const yokeGeo = useMemo(() => {
    if (!yoke) return null;
    const pts = YOKE_RIM;
    const curve = new THREE.CatmullRomCurve3(pts.map(([y, z]) => new THREE.Vector3(0, y, z)));
    return new THREE.TubeGeometry(curve, 64, tube, 10, false);
  }, [yoke, tube]);
  useEffect(() => () => yokeGeo?.dispose(), [yokeGeo]);
  return (
    <group position={center} rotation={[0, 0, -tilt]}>
      {/* Column into the dash */}
      <mesh material={mats.dashDark} position={[columnLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.032, 0.045, columnLength, 16]} />
      </mesh>
      {yokeGeo ? (
        <>
          <mesh geometry={yokeGeo} material={mats.rubber} />
          <RoundedBox args={[0.045, 0.1, 0.17]} radius={0.02} position={[0.01, -0.035, 0]} material={mats.gloss} />
        </>
      ) : (
        <>
          <mesh material={mats.rubber} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[R, tube, 12, 48]} />
          </mesh>
          <mesh material={mats.gloss} position={[0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.06, 0.04, 24]} />
          </mesh>
          {[Math.PI / 2, -Math.PI / 2, Math.PI].map((a) => (
            <mesh key={a} material={mats.dashDark} position={[0.005, Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5]} rotation={[a, 0, 0]}>
              <boxGeometry args={[0.012, R * 0.82, 0.03]} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/** A display panel facing the rear of the car, yawed toward the driver. */
function Display({ center, w, h, yaw, tilt, mats, material }: { center: [number, number, number]; w: number; h: number; yaw: number; tilt: number; mats: Mats; material: THREE.Material }) {
  return (
    <group position={center} rotation={new THREE.Euler(-tilt, -Math.PI / 2 - yaw, 0, "YXZ")}>
      <RoundedBox args={[w + 0.018, h + 0.018, 0.02]} radius={0.008} position={[0, 0, -0.011]} material={mats.gloss} />
      <mesh material={material} position={[0, 0, 0.0005]}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  );
}

function Dashboard({ cabin, mats }: { cabin: CabinLayout; mats: Mats }) {
  const { dashX, dashFrontX, dashTopY, floorY, spec, dashHalf: half, firewallX, envelope } = cabin;
  const depth = dashFrontX - dashX;
  const firewallHalf = Math.min(half, envelope.freeHalfWidth(firewallX, firewallX, floorY, dashTopY - 0.16, 0.01));
  return (
    <group>
      <RoundedBox args={[depth, 0.16, half * 2]} radius={0.04} position={[dashX + depth / 2, dashTopY - 0.08, 0]} material={mats.dash} />
      {/* Firewall / footwell front */}
      <mesh material={mats.dashDark} position={[firewallX, (floorY + dashTopY - 0.16) / 2, 0]}>
        <boxGeometry args={[0.04, Math.max(0.05, dashTopY - 0.16 - floorY), firewallHalf * 2]} />
      </mesh>
      {/* Knee panel */}
      <RoundedBox args={[0.2, 0.12, half * 2 - 0.02]} radius={0.03} position={[dashX + 0.08, dashTopY - 0.2, 0]} material={mats.dashDark} />
      {/* Fascia band, hidden vent slot and ambient strip */}
      <mesh material={mats.band} position={[dashX - 0.006, dashTopY - 0.075, 0]}>
        <boxGeometry args={[0.014, 0.045, half * 2 * 0.97]} />
      </mesh>
      <mesh material={mats.gloss} position={[dashX - 0.008, dashTopY - 0.035, 0]}>
        <boxGeometry args={[0.012, 0.011, half * 2 * 0.9]} />
      </mesh>
      {spec.ambient && (
        <mesh material={mats.ambient} position={[dashX - 0.011, dashTopY - 0.104, 0]}>
          <boxGeometry args={[0.006, 0.006, half * 2 * 0.95]} />
        </mesh>
      )}

      {cabin.screen && (
        <>
          <Display {...cabin.screen} mats={mats} material={mats.screen} />
          <mesh material={mats.gloss} position={[cabin.screen.center[0] + 0.05, (dashTopY + cabin.screen.center[1] - cabin.screen.h / 2) / 2, 0]}>
            <boxGeometry args={[0.05, Math.max(0.02, cabin.screen.center[1] - cabin.screen.h / 2 - dashTopY + 0.02), 0.08]} />
          </mesh>
        </>
      )}
      {cabin.cluster && <Display {...cabin.cluster} mats={mats} material={mats.cluster} />}
      {cabin.forwardDisplays.map((d, i) => (
        <Display key={i} {...d} mats={mats} material={mats.cluster} />
      ))}
      {spec.binnacle && (
        <group>
          <RoundedBox args={[0.18, 0.1, 0.34]} radius={0.04} position={[dashX + 0.05, dashTopY + 0.03, cabin.steering.center[2]]} material={mats.dashDark} />
          {[-1, 1].map((sd) => (
            <mesh key={sd} material={mats.dial} position={[dashX - 0.042, dashTopY + 0.03, cabin.steering.center[2] + sd * 0.075]} rotation={[0, -Math.PI / 2, 0]}>
              <circleGeometry args={[0.045, 32]} />
            </mesh>
          ))}
        </group>
      )}
      {/* Keyed by type: reusing the yoke's mesh for a torus (or back) leaves the rim without geometry when switching cars. */}
      <SteeringWheel key={cabin.steering.kind} cabin={cabin} mats={mats} />
    </group>
  );
}

function Console({ cabin, mats }: { cabin: CabinLayout; mats: Mats }) {
  const { x0, x1, topY, width } = cabin.console;
  const len = x0 - x1;
  const h = topY - cabin.floorY;
  const mid = (x0 + x1) / 2;
  return (
    <group>
      <RoundedBox args={[len, h, width]} radius={0.04} position={[mid, cabin.floorY + h / 2, 0]} material={mats.dashDark} />
      <mesh material={mats.gloss} position={[x0 - len * 0.3, topY + 0.004, 0]}>
        <boxGeometry args={[len * 0.55, 0.008, width * 0.92]} />
      </mesh>
      {/* Wireless charging pads and cup holders */}
      {[-1, 1].map((sd) => (
        <mesh key={`pad${sd}`} material={mats.rubber} position={[x0 - 0.16, topY + 0.009, sd * width * 0.23]}>
          <boxGeometry args={[0.17, 0.004, width * 0.4]} />
        </mesh>
      ))}
      {[-1, 1].map((sd) => (
        <mesh key={`cup${sd}`} material={mats.carpet} position={[x0 - 0.36, topY + 0.009, sd * width * 0.22]}>
          <cylinderGeometry args={[0.04, 0.04, 0.006, 24]} />
        </mesh>
      ))}
      <RoundedBox args={[Math.min(0.34, len * 0.4), 0.07, width + 0.02]} radius={0.03} position={[x1 + Math.min(0.17, len * 0.2), topY + 0.035, 0]} material={mats.seat} />
      {cabin.spec.rearScreen && (
        <Display center={[x1 - 0.012, topY - 0.11, 0]} w={0.2} h={0.12} yaw={0} tilt={0} mats={mats} material={mats.screen} />
      )}
    </group>
  );
}

/** Armrest, speaker and light strip: rendered inside the door's own transform so they travel with it. */
export function DoorCardDetails({ cabin, door, side, mats }: { cabin: CabinLayout; door: number; side: 1 | -1; mats: Mats }) {
  const card = cabin.doorCards.find((c) => c.door === door && c.side === side);
  if (!card) return null;
  return (
    <group>
      <RoundedBox args={card.armrest.size} radius={0.02} position={card.armrest.center} material={mats.accent} />
      <mesh material={mats.metal} position={card.speaker} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.004, 28]} />
      </mesh>
      {cabin.spec.ambient && (
        <mesh material={mats.ambient} position={card.strip.center}>
          <boxGeometry args={[card.strip.length, 0.005, 0.005]} />
        </mesh>
      )}
    </group>
  );
}

/** Horizontal sheet from an [x, halfWidth] outline, so the floor meets the sills and wheelhouses. */
function useOutlineSheet(outline: [number, number][], y: number) {
  const geo = useMemo(() => {
    const pos: number[] = [];
    const idx: number[] = [];
    outline.forEach(([x, h], i) => {
      pos.push(x, y, -h, x, y, h);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [outline, y]);
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

function Bulkhead({ s, cabin, mats }: { s: CarSurface; cabin: CabinLayout; mats: Mats }) {
  const { rearX, floorY, envelope } = cabin;
  const top = s.beltPoint(s.tAt(rearX))[1] - 0.01;
  const half = envelope.freeHalfWidth(rearX, rearX, floorY, top, 0.01);
  return (
    <mesh material={mats.dashDark} position={[rearX, (floorY + top) / 2, 0]}>
      <boxGeometry args={[0.02, top - floorY, half * 2]} />
    </mesh>
  );
}

/* ── Cabin ─────────────────────────────────────────────────────────────────── */

export function CabinInterior({ surface, cabin, mats, car, light, low }: { surface: CarSurface; cabin: CabinLayout; mats: Mats; car: CarMeshes; light: CabinLight; low: boolean }) {
  const floor = useOutlineSheet(cabin.floorOutline, cabin.floorY);
  const lightY = Math.min(...cabin.seats.map((p) => surface.roofAt(surface.tAt(p.hip[0])))) - 0.12;
  const intensity = LIGHT_INTENSITY[light];
  return (
    <group>
      <mesh geometry={floor} material={mats.carpetDouble} receiveShadow />
      {/* Inside faces of the greenhouse (groups: side glass, roof) */}
      <mesh geometry={car.glass} material={[mats.glassInside, mats.roofInside]} renderOrder={-1} />
      <Dashboard cabin={cabin} mats={mats} />
      <Console cabin={cabin} mats={mats} />
      <Bulkhead s={surface} cabin={cabin} mats={mats} />
      {cabin.seats.map((seat, i) => (
        <Seat key={i} seat={seat} mats={mats} floorY={cabin.floorY} low={low} />
      ))}
      {intensity > 0 &&
        [...new Set(cabin.seats.map((p) => p.hip[0]))].map((x) => (
          <pointLight key={x} position={[x + 0.1, lightY, 0]} intensity={intensity} distance={2.4} decay={2} color="#fff4e6" />
        ))}
    </group>
  );
}
