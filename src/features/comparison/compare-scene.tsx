"use client";

import { useMemo, useRef } from "react";
import { ScreenLabelProjector } from "@/components/three/screen-labels";
import { Stage, CameraRig } from "@/components/three/stage";
import { ProceduralVehicle } from "@/components/three/procedural-vehicle";
import { computeLayout } from "@/components/three/vehicle-geometry";
import type { BodyGeometry } from "@/types/vehicle";
import type { CameraView } from "@/stores/studio";

export interface CompareItem {
  id: string;
  label: string;
  body: BodyGeometry;
  motors: number;
  color: string;
}

/**
 * All selected vehicles share ONE scene and ONE camera, lined up side by side at true
 * relative scale, so orbiting/zooming changes every vehicle's perspective together.
 */
export default function CompareScene({ items, view, nonce, lowPower }: { items: CompareItem[]; view: CameraView; nonce: number; lowPower: boolean }) {
  const spacing = Math.max(...items.map((i) => i.body.widthMm / 1000)) + 1.7;
  const offsets = items.map((_, i) => (i - (items.length - 1) / 2) * spacing);
  // Frame the whole row: a virtual layout as long as the row is wide.
  const frame = useMemo(() => {
    const base = computeLayout(items.reduce((a, b) => (b.body.lengthMm > a.body.lengthMm ? b : a)).body);
    const rowWidth = spacing * items.length;
    return { ...base, L: Math.max(base.L, rowWidth * 0.62) };
  }, [items, spacing]);

  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const anchors = items.map((item, i) => [0, item.body.heightMm / 1000 + 0.12, offsets[i]] as [number, number, number]);

  return (
    <>
    <Stage className="absolute inset-0" quality={lowPower ? "low" : "medium"} camera={{ position: [8, 3, 9], fov: 32 }} ariaLabel={`Side-by-side 3D comparison of ${items.map((i) => i.label).join(", ")}`}>
      {items.map((item, i) => (
        <group key={item.id} position={[0, 0, offsets[i]]}>
          <ProceduralVehicle body={item.body} paint="graphite" motors={item.motors} lowDetail={lowPower || items.length > 3} />
        </group>
      ))}
      <CameraRig view={view} nonce={nonce} layout={frame} maxDistance={30} />
      <ScreenLabelProjector anchors={anchors} targets={labelRefs} />
    </Stage>
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {items.map((item, i) => (
        <span
          key={item.id}
          ref={(el) => { labelRefs.current[i] = el; }}
          className="absolute left-0 top-0 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] text-white opacity-0 transition-opacity"
          style={{ background: item.color }}
        >
          {item.label}
        </span>
      ))}
    </div>
    </>
  );
}
