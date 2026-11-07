"use client";

import { useEffect, useMemo } from "react";
import { useStudio } from "@/stores/studio";
import { Stage, CameraRig } from "@/components/three/stage";
import { ProceduralVehicle } from "@/components/three/procedural-vehicle";
import { computeLayout } from "@/components/three/vehicle-geometry";
import type { BodyGeometry } from "@/types/vehicle";

export interface VehicleSceneProps {
  body: BodyGeometry;
  name: string;
  motors: number;
  lowPower: boolean;
  /** Engineering mode: components visible, camera focuses on selection. */
  engineering?: boolean;
  onReady?: () => void;
}

/** Store-driven vehicle viewer shared by the 3D Studio and the Engineering Lab. */
export default function VehicleScene({ body, name, motors, lowPower, engineering = false, onReady }: VehicleSceneProps) {
  const s = useStudio();
  const layout = useMemo(() => computeLayout(body), [body]);
  const focus = engineering && s.selected ? layout.cameraTargets[s.selected] : null;

  // Leaving the page should never leave a pointer cursor behind from a hovered component.
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  return (
    <Stage
      className="absolute inset-0"
      environment={s.environment}
      quality={lowPower ? "low" : "high"}
      camera={{ position: [6, 2, 7], fov: 32 }}
      ariaLabel={`Interactive 3D procedural representation of the ${name}. Use the control panel or drag to orbit.`}
      onReady={onReady}
    >
      <group onPointerMissed={() => engineering && s.set({ selected: null })}>
        <ProceduralVehicle
          body={body}
          paint={s.paint}
          mode={s.mode}
          headlights={s.headlights}
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
        />
      </group>
      <CameraRig view={s.view} nonce={s.viewNonce} layout={layout} focus={focus} autoRotate={s.autoRotate} minDistance={s.view === "interior" ? 0.01 : 1.5} />
    </Stage>
  );
}
