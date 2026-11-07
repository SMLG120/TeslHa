"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
      <StudioEnvironment night={night} intensity={night ? 0.4 : 1} />
      {night && <pointLight position={[0, 0.3, -3]} color="#ff2a36" intensity={6} distance={8} />}
    </>
  );
}

function Floor({ quality, night }: { quality: Quality; night: boolean }) {
  return (
    <group>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.8} scale={14} blur={2.4} far={2.5} resolution={quality === "low" ? 256 : 1024} />
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

/** Camera presets derived from vehicle dimensions. */
export function cameraPreset(view: CameraView, l: VehicleLayout): { pos: [number, number, number]; target: [number, number, number] } {
  const { L, H, W, frontAxleX, rearAxleX } = l;
  const mid = (frontAxleX + rearAxleX) / 2;
  switch (view) {
    case "front":
      return { pos: [L * 1.35, H * 0.7, 0.01], target: [0, H * 0.45, 0] };
    case "rear":
      return { pos: [-L * 1.35, H * 0.75, 0.01], target: [0, H * 0.45, 0] };
    case "side":
      return { pos: [0, H * 0.6, L * 1.5], target: [0, H * 0.45, 0] };
    case "top":
      return { pos: [0.01, L * 1.9, 0.01], target: [0, 0, 0] };
    case "interior":
      return { pos: [mid - 0.1, H * 0.78, -W * 0.18], target: [L / 2, H * 0.6, -W * 0.18] };
    case "hero":
    default:
      return { pos: [L * 1.3, H * 1.3, L * 1.55], target: [0, H * 0.4, 0] };
  }
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
  // Portrait viewports see less horizontally; pull preset cameras back so the car fits.
  const aspect = useThree((st) => st.size.width / Math.max(st.size.height, 1));
  const fit = aspect < 1 ? Math.min(2.2, 1 / aspect) : 1;

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
    const p = cameraPreset(view, layout);
    const t = new THREE.Vector3(...p.target);
    const pos = view === "interior" ? new THREE.Vector3(...p.pos) : new THREE.Vector3(...p.pos).sub(t).multiplyScalar(fit).add(t);
    void c.setLookAt(pos.x, pos.y, pos.z, t.x, t.y, t.z, true);
  }, [view, nonce, layout, focus, fit]);

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
