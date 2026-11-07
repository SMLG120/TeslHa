"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { CameraControls, ContactShadows, MeshReflectorMaterial, PerformanceMonitor } from "@react-three/drei";
import { StudioEnvironment } from "./studio-environment";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { CameraView, Environment as Env } from "@/stores/studio";
import type { VehicleLayout } from "./vehicle-geometry";

export type Quality = "high" | "medium" | "low";

interface StageProps {
  children: ReactNode;
  environment?: Env;
  quality?: Quality;
  className?: string;
  /** Fired once the renderer has compiled the scene's materials. */
  onReady?: () => void;
  onProgress?: (stage: string, pct: number) => void;
  camera?: { position: [number, number, number]; fov?: number };
  ariaLabel: string;
  frameloop?: "always" | "demand";
}

/** `?q=low|medium|high` forces a render quality (debugging, screenshots, slow GPUs). */
function qualityOverride(): Quality | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search).get("q");
  return q === "low" || q === "medium" || q === "high" ? q : null;
}

export function Stage({ children, environment = "studio", quality: requestedQuality = "high", className, onReady, onProgress, camera, ariaLabel, frameloop = "always" }: StageProps) {
  const [initialQuality] = useState<Quality>(() => qualityOverride() ?? requestedQuality);
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [dpr, setDpr] = useState<number>(initialQuality === "low" ? 1 : 1.5);
  const night = environment === "night";

  return (
    <div className={className} role="img" aria-label={ariaLabel}>
      <Canvas
        shadows={quality !== "low" ? "percentage" : false}
        dpr={[1, dpr]}
        frameloop={frameloop}
        camera={{ position: camera?.position ?? [5, 2, 6], fov: camera?.fov ?? 32, near: 0.05, far: 200 }}
        gl={{ antialias: quality !== "high", powerPreference: "high-performance", preserveDrawingBuffer: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = night ? 0.85 : 1.05;
          onProgress?.("Initialising WebGL renderer", 25);
        }}
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr(1);
            setQuality((q) => (q === "high" ? "medium" : "low"));
          }}
          onIncline={() => setDpr((d) => Math.min(d + 0.25, 2))}
        />
        <color attach="background" args={[night ? "#020203" : "#08090b"]} />
        <fog attach="fog" args={[night ? "#020203" : "#08090b", 14, 34]} />

        <StudioLights night={night} quality={quality} />
        {children}
        <Floor quality={quality} night={night} />

        {quality === "high" && (
          <EffectComposer multisampling={4}>
            {/* N8AO was removed: n8ao 2.0.1's multi-render-target subclass is incompatible with three r187
                (renderTarget.textures is undefined → crash every frame). Contact shadows provide grounding. */}
            <Bloom mipmapBlur luminanceThreshold={1} intensity={night ? 1.1 : 0.7} />
            <Vignette eskil={false} offset={0.18} darkness={0.75} />
          </EffectComposer>
        )}
        {quality === "medium" && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur luminanceThreshold={1} intensity={0.6} />
          </EffectComposer>
        )}
        <ReadySignal onReady={onReady} onProgress={onProgress} />
      </Canvas>
    </div>
  );
}

function ReadySignal({ onReady, onProgress }: { onReady?: () => void; onProgress?: (stage: string, pct: number) => void }) {
  const { gl, scene, camera } = useThree();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    onProgress?.("Building procedural geometry", 55);
    let cancelled = false;
    const run = async () => {
      onProgress?.("Compiling physically-based materials", 80);
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        gl.compile(scene, camera);
      }
      if (cancelled) return;
      requestAnimationFrame(() => {
        onProgress?.("Ready", 100);
        onReady?.();
      });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, onReady, onProgress]);
  return null;
}

function StudioLights({ night, quality }: { night: boolean; quality: Quality }) {
  return (
    <>
      <ambientLight intensity={night ? 0.04 : 0.15} />
      <directionalLight
        position={[4, 8, 3]}
        intensity={night ? 0.25 : 1.4}
        castShadow={quality !== "low"}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <StudioEnvironment night={night} intensity={night ? 0.45 : 1} />
      {/* Red accent rim light from behind, the showroom's signature colour. */}
      <spotLight position={[-5.5, 1.6, -5]} color="#ff2a36" intensity={night ? 70 : 28} angle={0.7} penumbra={1} distance={18} />
      <spotLight position={[5.5, 1.2, -5.5]} color="#ff2a36" intensity={night ? 40 : 12} angle={0.6} penumbra={1} distance={16} />
    </>
  );
}

function Floor({ quality, night }: { quality: Quality; night: boolean }) {
  return (
    <group>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.85} scale={14} blur={2.2} far={2.2} resolution={quality === "low" ? 256 : 1024} />
      <FloorGlow night={night} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        {quality === "high" ? (
          <MeshReflectorMaterial
            resolution={1024}
            mixBlur={1}
            mixStrength={night ? 6 : 3}
            blur={[300, 80]}
            roughness={0.9}
            depthScale={1}
            minDepthThreshold={0.6}
            maxDepthThreshold={1.2}
            color={night ? "#050506" : "#0c0d10"}
            metalness={0.6}
            mirror={0.5}
          />
        ) : (
          <meshStandardMaterial color={night ? "#050506" : "#0c0d10"} roughness={0.85} metalness={0.3} />
        )}
      </mesh>
    </group>
  );
}

/** Soft pool of light under the car, like an overhead softbox hitting a studio floor. */
function FloorGlow({ night }: { night: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,255,255,0.55)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.16)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.0015, 0]} scale={[1.6, 1, 1]} renderOrder={-1}>
      <planeGeometry args={[11, 7]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} opacity={night ? 0.12 : 0.3} toneMapped={false} />
    </mesh>
  );
}

const VIEW_DIRS: Record<Exclude<CameraView, "interior">, [number, number, number]> = {
  hero: [1.15, 0.36, 1.35],
  front: [1, 0.22, 0.0001],
  rear: [-1, 0.24, 0.0001],
  side: [0.0001, 0.18, 1],
  top: [0.02, 1, 0.01],
};
const VIEW_MARGIN: Record<Exclude<CameraView, "interior">, number> = { hero: 1.12, front: 1.3, rear: 1.3, side: 1.08, top: 1.12 };

/**
 * Camera presets derived from vehicle dimensions: each exterior view fits the vehicle's
 * bounding box to the actual canvas aspect and field of view, so every model is fully
 * visible and similarly sized on any screen.
 */
export function cameraPreset(view: CameraView, l: VehicleLayout, aspect = 16 / 9, fovDeg = 30): { pos: [number, number, number]; target: [number, number, number] } {
  const { L, H, W, frontAxleX, rearAxleX } = l;
  if (view === "interior") {
    const mid = (frontAxleX + rearAxleX) / 2;
    return { pos: [mid - 0.1, H * 0.74, -W * 0.18], target: [L / 2, H * 0.6, -W * 0.18] };
  }
  const target = new THREE.Vector3(0, view === "top" ? 0 : H * 0.42, 0);
  const dir = new THREE.Vector3(...VIEW_DIRS[view]).normalize();
  const f = dir.clone().negate();
  const upRef = Math.abs(f.y) > 0.98 ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(f, upRef).normalize();
  const up = new THREE.Vector3().crossVectors(right, f).normalize();
  const vf = THREE.MathUtils.degToRad(fovDeg);
  const tanV = Math.tan(vf / 2);
  const tanH = tanV * aspect;
  const m = VIEW_MARGIN[view];
  let D = 0;
  for (const x of [-L / 2, L / 2])
    for (const y of [0, H])
      for (const z of [-W / 2, W / 2]) {
        const rel = new THREE.Vector3(x, y, z).sub(target);
        const depth = rel.dot(f);
        D = Math.max(D, (Math.abs(rel.dot(right)) * m) / tanH - depth, (Math.abs(rel.dot(up)) * m) / tanV - depth);
      }
  const pos = target.clone().add(dir.multiplyScalar(D));
  return { pos: [pos.x, pos.y, pos.z], target: [target.x, target.y, target.z] };
}

/** Smoothly animated orbit camera. `focus` overrides presets (used for component selection). */
export function CameraRig({
  view,
  nonce,
  layout,
  focus,
  autoRotate = false,
  minDistance = 1.2,
  maxDistance = 16,
  enabled = true,
  focalOffset,
}: {
  view: CameraView;
  nonce: number;
  layout: VehicleLayout;
  focus?: THREE.Vector3 | null;
  autoRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  enabled?: boolean;
  /** Screen-space framing offset in metres (e.g. push the subject right of a headline). */
  focalOffset?: [number, number, number];
}) {
  const ref = useRef<CameraControls>(null);
  const [fx, fy, fz] = focalOffset ?? [0, 0, 0];
  const aspect = useThree((st) => st.size.width / Math.max(st.size.height, 1));
  const fov = useThree((st) => (st.camera as THREE.PerspectiveCamera).fov ?? 30);

  useEffect(() => {
    void ref.current?.setFocalOffset(fx, fy, fz, true);
  }, [fx, fy, fz]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (focus) {
      // Look down from outside the body so the cabin never sits between camera and component.
      const dir = new THREE.Vector3(0.75, 1.05, 1).normalize();
      const pos = focus.clone().add(dir.multiplyScalar(Math.max(4.6, layout.L * 1.05)));
      void c.setLookAt(pos.x, pos.y, pos.z, focus.x, focus.y, focus.z, true);
      return;
    }
    const p = cameraPreset(view, layout, aspect, fov);
    void c.setLookAt(...p.pos, ...p.target, true);
  }, [view, nonce, layout, focus, aspect, fov]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !autoRotate) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!c.active) void c.rotate(dt * 0.12, 0, false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate]);

  return (
    <CameraControls
      ref={ref}
      enabled={enabled}
      makeDefault
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={view === "interior" ? Math.PI : Math.PI / 2.05}
      smoothTime={0.6}
      draggingSmoothTime={0.15}
    />
  );
}
