"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Info, SlidersHorizontal, X } from "lucide-react";
import { WithWebGL } from "@/components/three/webgl-guard";
import { SceneSkeleton } from "@/components/ui/primitives";
import { useLowPower } from "@/hooks/use-device";
import { useStudio } from "@/stores/studio";
import { bodyFor, families, getConfigurations, getFamily } from "@/data/vehicles";
import { StudioControls } from "./studio-controls";
import { cn } from "@/lib/utils";

const VehicleScene = dynamic(() => import("./vehicle-scene"), { ssr: false, loading: () => <SceneSkeleton /> });

export function StudioView({ familyId }: { familyId: string }) {
  const family = getFamily(familyId)!;
  const [generation, setGeneration] = useState(family.generations[family.generations.length - 1].id);
  const body = bodyFor(family, generation);
  const motors = Math.max(...getConfigurations(family.id).map((c) => c.motors));
  const lowPower = useLowPower();
  const [panelOpen, setPanelOpen] = useState(true);
  const reset = useStudio((s) => s.reset);

  useEffect(() => reset(), [familyId, reset]);

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-ink">
      <WithWebGL loading={<SceneSkeleton />}>
        <VehicleScene key={`${family.id}-${generation}`} body={body} name={family.name} motors={motors} lowPower={lowPower} />
      </WithWebGL>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-8">
        <div className="pointer-events-auto">
          <Link href={`/vehicles/${family.id}`} className="inline-flex items-center gap-1 text-xs text-mist hover:text-white">
            <ChevronLeft className="h-3.5 w-3.5" /> {family.name} specifications
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-4xl">{family.name} · 3D Studio</h1>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-amber">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            Procedural representation: proportions from published dimensions, not production CAD
          </p>
          {family.generations.length > 1 && (
            <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Generation">
              {family.generations.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={generation === g.id}
                  onClick={() => setGeneration(g.id)}
                  className={cn("rounded-full px-3 py-1 text-xs ring-1 ring-white/10", generation === g.id ? "bg-white/10 text-white" : "text-mist")}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <nav aria-label="Studio vehicles" className="pointer-events-auto glass flex gap-1 overflow-x-auto rounded-full p-1">
          {families.map((f) => (
            <Link
              key={f.id}
              href={`/studio/${f.id}`}
              aria-current={f.id === family.id ? "page" : undefined}
              className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs text-fog hover:text-white", f.id === family.id && "bg-volt text-white")}
            >
              {f.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Control panel */}
      <aside
        className={cn(
          "glass absolute z-10 rounded-2xl p-5 transition-transform duration-300",
          "inset-x-3 bottom-3 max-h-[52svh] overflow-y-auto sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[340px] sm:max-h-[calc(100svh-12rem)]",
          !panelOpen && "translate-y-[calc(100%+2rem)] sm:translate-x-[calc(100%+3rem)] sm:translate-y-0",
        )}
        aria-label="Studio controls"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium">Controls</p>
          <button type="button" className="rounded-full p-1 text-mist hover:text-white" onClick={() => setPanelOpen(false)} aria-label="Hide controls">
            <X className="h-4 w-4" />
          </button>
        </div>
        <StudioControls body={body} />
        {family.rigLevel !== "full" && (
          <p className="mt-4 text-[11px] leading-relaxed text-mist">
            This vehicle uses the shared procedural rig. Model S is the reference implementation. A licensed GLB can replace the rig through the asset registry without changing these controls.
          </p>
        )}
      </aside>
      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="glass absolute bottom-6 right-6 z-10 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm"
        >
          <SlidersHorizontal className="h-4 w-4" /> Controls
        </button>
      )}

      <p className="pointer-events-none absolute bottom-6 left-6 z-10 hidden font-mono text-[11px] text-mist lg:block">
        Drag to orbit · Scroll / pinch to zoom · Right-drag to pan
      </p>
    </div>
  );
}
