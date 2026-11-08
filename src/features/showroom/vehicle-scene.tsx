"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useStudio } from "@/stores/studio";
import { Stage, CameraRig } from "@/components/three/stage";
import { ProceduralVehicle } from "@/components/three/procedural-vehicle";
import { computeLayout } from "@/components/three/vehicle-geometry";
import { DebugBridge, debugRequested } from "@/components/three/debug-bridge";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/use-device";
import type { BodyGeometry } from "@/types/vehicle";

export interface VehicleSceneProps {
  body: BodyGeometry;
  name: string;
  motors: number;
  lowPower: boolean;
  /** Engineering mode: components always visible. */
  engineering?: boolean;
  onReady?: () => void;
}

const GeometryOverlay = dynamic(() => import("@/components/three/geometry-overlay"), { ssr: false });

/** Store-driven vehicle viewer shared by the 3D Studio and the Engineering Lab. */
export default function VehicleScene({ body, name, motors, lowPower, engineering = false, onReady }: VehicleSceneProps) {
  const s = useStudio();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(body);
  const layout = useMemo(() => computeLayout(shown), [shown]);
  const focus = (engineering || s.showComponents || s.mode === "xray") && s.selected ? layout.cameraTargets[s.selected] : null;

  // Leaving the page should never leave a pointer cursor behind from a hovered component.
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  const exterior = s.view !== "interior";
  const [debug] = useState(debugRequested);
  return (
    <Stage
      className="absolute inset-0"
      environment={s.environment}
      quality={lowPower ? "low" : "high"}
      camera={{ position: [6, 2, 7], fov: 30 }}
      ariaLabel={`Interactive 3D procedural representation of the ${name}. Drag to orbit, scroll or pinch to zoom.`}
      onReady={onReady}
      bloom={exterior}
    >
      <Swap target={body} shown={shown} onSwap={setShown} reduced={reduced}>
        <group onPointerMissed={() => (engineering || s.showComponents) && s.set({ selected: null })}>
          <ProceduralVehicle
            body={shown}
            paint={s.paint}
            mode={s.mode}
            headlights={s.headlights}
            taillights={s.taillights}
            doorsOpen={s.doorsOpen}
            frunkOpen={s.frunkOpen}
            trunkOpen={s.trunkOpen}
            showComponents={engineering || s.showComponents}
            exploded={s.exploded}
            selected={s.selected}
            onSelect={(id) => s.set({ selected: id })}
            flow={s.flow}
            motors={motors}
            lowDetail={lowPower}
            // Cabin lamps only when inside (or a door is open), as in a parked car.
            cabinLight={s.view === "interior" || s.doorsOpen ? s.cabinLight : "off"}
          />
        </group>
      </Swap>
      <CameraRig
        view={s.view}
        interiorView={s.interiorView}
        nonce={s.viewNonce}
        layout={layout}
        focus={focus}
        autoRotate={s.autoRotate}
        minDistance={exterior ? Math.max(2.2, layout.L * 0.55) : 0.01}
        maxDistance={exterior ? layout.L * 2.6 : 3}
      />
      {debug && <DebugBridge layout={layout} />}
      {debug === "geometry" && <GeometryOverlay layout={layout} />}
    </Stage>
  );
}

/**
 * Model switch transition: the current car glides out along its length while the next one
 * glides in from the other side, so the canvas (and WebGL context) never remounts.
 */
function Swap({ target, shown, onSwap, reduced, children }: { target: BodyGeometry; shown: BodyGeometry; onSwap: (b: BodyGeometry) => void; reduced: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const phase = useRef<"idle" | "out" | "in">("idle");
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (target !== shown && phase.current !== "out") phase.current = "out";
    if (phase.current === "out") {
      if (reduced) {
        onSwap(target);
        phase.current = "idle";
        return;
      }
      g.position.x = THREE.MathUtils.damp(g.position.x, -9, 4.5, dt);
      if (g.position.x < -7.5) {
        onSwap(target);
        phase.current = "in";
        g.position.x = 9;
      }
    } else if (phase.current === "in") {
      g.position.x = THREE.MathUtils.damp(g.position.x, 0, 4, dt);
      if (Math.abs(g.position.x) < 0.002) {
        g.position.x = 0;
        phase.current = "idle";
      }
    }
  });
  return <group ref={ref}>{children}</group>;
}
