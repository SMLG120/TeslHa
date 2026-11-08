"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { CameraControls } from "@react-three/drei";
import * as THREE from "three";
import { useStudio } from "@/stores/studio";
import { cameraPreset } from "./stage";
import type { VehicleLayout } from "./vehicle-geometry";

export const DEBUG_SHOTS = ["hero", "front", "rear", "right", "left", "top", "driver", "passenger", "rearseat", "dashboard", "rearcabin"] as const;
export type DebugShot = (typeof DEBUG_SHOTS)[number];

declare global {
  interface Window {
    __teslhaDebug?: { go: (shot: DebugShot) => boolean; doors: (open: boolean) => void; shots: readonly DebugShot[] };
  }
}

/** True when the page was opened with `?debug=…` (screenshots and geometry review only). */
export function debugRequested(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("debug");
}

/**
 * `?debug=1`: exposes a camera jump for scripts/geometry-shots.mjs. It only moves the camera,
 * using the same presets as the UI, so screenshots show exactly what a visitor can reach.
 */
export function DebugBridge({ layout }: { layout: VehicleLayout }) {
  const controls = useThree((st) => st.controls) as unknown as CameraControls | null;
  const camera = useThree((st) => st.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((st) => st.size.width / Math.max(st.size.height, 1));
  useEffect(() => {
    if (!controls) return;
    window.__teslhaDebug = {
      shots: DEBUG_SHOTS,
      doors: (open) => useStudio.getState().set({ doorsOpen: open }),
      go(shot) {
        const st = useStudio.getState();
        const interior = shot === "driver" || shot === "passenger" || shot === "rearseat" || shot === "dashboard" || shot === "rearcabin";
        if (shot === "rearseat" && !layout.cabin.eyes.rear) return false;
        if (interior) st.setInteriorView(shot === "rearseat" ? "rear" : shot === "rearcabin" ? "driver" : shot);
        else st.setView(shot === "right" || shot === "left" ? "side" : shot === "hero" ? "hero" : shot);
        // Let the rig apply lens and limits first, then land without the smoothing animation.
        requestAnimationFrame(() => {
          const view = interior ? "interior" : shot === "right" || shot === "left" ? "side" : shot;
          const p = cameraPreset(view, layout, aspect, 30, shot === "rearseat" ? "rear" : shot === "passenger" || shot === "dashboard" ? shot : "driver");
          if (shot === "rearcabin") {
            // Looks back from the front row, for reviewing seat rows (not a visitor preset).
            const c = layout.cabin;
            const x = c.rowX[0] + 0.35;
            const y = Math.min(c.dashTopY + 0.32, c.envelope.ceiling(x, 0) - 0.06);
            void controls.setLookAt(x, y, 0, c.rearX, c.floorY + 0.35, 0, false);
            camera.updateProjectionMatrix();
            return;
          }
          const flip = shot === "left" ? -1 : 1;
          void controls.setLookAt(p.pos[0], p.pos[1], p.pos[2] * flip, p.target[0], p.target[1], p.target[2] * flip, false);
          camera.updateProjectionMatrix();
        });
        return true;
      },
    };
    return () => void delete window.__teslhaDebug;
  }, [controls, camera, aspect, layout]);
  return null;
}
