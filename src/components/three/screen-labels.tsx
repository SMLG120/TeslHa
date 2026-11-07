"use client";

import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Projects 3D anchor points to screen space every frame and writes the result straight to
 * DOM elements rendered OUTSIDE the Canvas. Unlike drei's <Html>, this creates no nested
 * React roots, so mounting/unmounting scenes never triggers synchronous root unmounts.
 */
export function ScreenLabelProjector({ anchors, targets }: { anchors: [number, number, number][]; targets: RefObject<(HTMLElement | null)[]> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useRef(new THREE.Vector3());
  useFrame(() => {
    anchors.forEach((a, i) => {
      const el = targets.current?.[i];
      if (!el) return;
      v.current.set(...a).project(camera);
      const visible = v.current.z < 1 && Math.abs(v.current.x) < 1.1 && Math.abs(v.current.y) < 1.1;
      const x = ((v.current.x + 1) / 2) * size.width;
      const y = ((1 - v.current.y) / 2) * size.height;
      el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.opacity = visible ? "1" : "0";
    });
  });
  return null;
}
