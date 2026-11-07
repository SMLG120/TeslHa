"use client";

import { useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-device";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Stage, CameraRig } from "@/components/three/stage";
import { ProceduralVehicle } from "@/components/three/procedural-vehicle";
import { computeLayout } from "@/components/three/vehicle-geometry";
import { getFamily, bodyFor } from "@/data/vehicles";
import type { VehicleId } from "@/types/vehicle";
import type { PaintId } from "@/stores/studio";

export interface HeroSceneProps {
  vehicleId: VehicleId;
  paint: PaintId;
  lowPower: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onProgress: (stage: string, pct: number) => void;
}

/** Turntable hero. Swapping vehicles plays a sink → swap → rise transition rather than a hard cut. */
export default function HeroScene({ vehicleId, paint, lowPower, reducedMotion, onReady, onProgress }: HeroSceneProps) {
  const [shown, setShown] = useState(vehicleId);
  const family = getFamily(shown)!;
  const body = bodyFor(family, family.id === "roadster" ? "gen2" : undefined);
  const layout = useMemo(() => computeLayout(body), [body]);
  const wide = useMediaQuery("(min-width: 1024px)");

  return (
    <Stage
      className="absolute inset-0"
      quality={lowPower ? "low" : "high"}
      onReady={onReady}
      onProgress={onProgress}
      camera={{ position: [5.5, 1.6, 5.8], fov: 30 }}
      ariaLabel={`Rotating 3D procedural representation of the ${family.name}`}
    >
      <Swapper target={vehicleId} shown={shown} onSwap={setShown} reducedMotion={reducedMotion}>
        <ProceduralVehicle body={body} paint={paint} headlights lowDetail={lowPower} />
      </Swapper>
      <CameraRig view="hero" nonce={0} layout={layout} autoRotate={!reducedMotion} minDistance={4} maxDistance={12} focalOffset={wide ? [-1.1, 0.2, 0] : [0, -0.5, 0]} />
    </Stage>
  );
}

function Swapper({
  target,
  shown,
  onSwap,
  reducedMotion,
  children,
}: {
  target: VehicleId;
  shown: VehicleId;
  onSwap: (id: VehicleId) => void;
  reducedMotion: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const phase = useRef<"idle" | "out" | "in">("idle");

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (target !== shown && phase.current !== "out") phase.current = "out";
    if (reducedMotion && phase.current === "out") {
      onSwap(target);
      phase.current = "idle";
      return;
    }
    if (phase.current === "out") {
      g.position.y = THREE.MathUtils.damp(g.position.y, -1.8, 7, dt);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, 0.6, 7, dt);
      if (g.position.y < -1.6) {
        onSwap(target);
        phase.current = "in";
        g.rotation.y = -0.6;
      }
    } else {
      g.position.y = THREE.MathUtils.damp(g.position.y, 0, 5, dt);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, 0, 5, dt);
      if (Math.abs(g.position.y) < 0.001) phase.current = "idle";
    }
  });

  return <group ref={ref}>{children}</group>;
}
