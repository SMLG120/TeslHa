"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Boxes, Layers, Link2, X, Zap } from "lucide-react";
import { COMPONENTS, getComponent, type ComponentId } from "@/data/components";
import { bodyFor, families, getFamily } from "@/data/vehicles";
import { useStudio, type FlowMode, type RenderMode } from "@/stores/studio";
import { WithWebGL } from "@/components/three/webgl-guard";
import { SceneSkeleton } from "@/components/ui/primitives";
import { useLowPower } from "@/hooks/use-device";
import { Segmented } from "@/features/showroom/studio-controls";
import { cn } from "@/lib/utils";
import type { VehicleId } from "@/types/vehicle";

const VehicleScene = dynamic(() => import("@/features/showroom/vehicle-scene"), { ssr: false, loading: () => <SceneSkeleton label="Loading engineering scene" /> });

const SHELL: { id: RenderMode; label: string }[] = [
  { id: "solid", label: "Body" },
  { id: "xray", label: "Transparent" },
  { id: "wireframe", label: "Wireframe" },
];
const FLOW: { id: FlowMode; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "drive", label: "Accelerate" },
  { id: "regen", label: "Regen" },
];

export function EngineeringLab() {
  const params = useSearchParams();
  const initialVehicle = (getFamily(params.get("vehicle") ?? "")?.id ?? "model-s") as VehicleId;
  const [vehicle, setVehicle] = useState<VehicleId>(initialVehicle);
  const family = getFamily(vehicle)!;
  const body = bodyFor(family, family.generations[0].id);
  const lowPower = useLowPower();
  const s = useStudio();

  // Enter the lab in transparent mode with the deep-linked component (if any) selected.
  useEffect(() => {
    const c = params.get("component");
    const valid = COMPONENTS.some((x) => x.id === c);
    useStudio.getState().reset();
    useStudio.getState().set({ mode: "xray", selected: valid ? (c as ComponentId) : null });
  }, [params]);

  const selected = s.selected ? getComponent(s.selected) : null;

  return (
    <div className="relative grid min-h-[100svh] grid-rows-[1fr_auto] lg:grid-cols-[300px_1fr] lg:grid-rows-1">
      {/* Component index */}
      <aside className="order-2 border-t border-line bg-carbon p-4 pt-6 lg:order-1 lg:border-r lg:border-t-0 lg:pt-24" aria-label="Components">
        <p className="hud-label mb-3 px-2">Systems</p>
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
          {COMPONENTS.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={s.selected === c.id}
                onClick={() => s.set({ selected: s.selected === c.id ? null : c.id })}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-fog transition hover:bg-white/5 hover:text-white",
                  s.selected === c.id && "bg-volt/15 text-white ring-1 ring-volt/40",
                )}
              >
                <span className="font-mono text-[10px] text-mist">{String(i + 1).padStart(2, "0")}</span>
                {c.shortName}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-4 px-1">
          <div>
            <label htmlFor="eng-vehicle" className="hud-label mb-2 block">Vehicle</label>
            <select
              id="eng-vehicle"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value as VehicleId)}
              className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
            >
              {families.map((f) => (
                <option key={f.id} value={f.id} className="bg-carbon">{f.name}</option>
              ))}
            </select>
          </div>
          <Segmented label="Shell" options={SHELL} value={s.mode} onChange={(mode) => s.set({ mode })} />
          <Segmented label="Energy flow" options={FLOW} value={s.flow} onChange={(flow) => s.set({ flow })} />
          <button
            type="button"
            aria-pressed={s.exploded}
            onClick={() => s.set({ exploded: !s.exploded })}
            className={cn("flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm ring-1 ring-white/10 hover:bg-white/5", s.exploded && "bg-volt/15 ring-volt/40")}
          >
            <Boxes className="h-4 w-4" /> {s.exploded ? "Collapse" : "Exploded view"}
          </button>
        </div>
      </aside>

      {/* Scene */}
      <section className="relative order-1 min-h-[70svh] overflow-hidden lg:order-2" aria-label="Engineering scene">
        <WithWebGL loading={<SceneSkeleton />}>
          <VehicleScene key={vehicle} body={body} name={family.name} motors={2} lowPower={lowPower} engineering />
        </WithWebGL>

        <div className="pointer-events-none absolute left-4 top-20 z-10 sm:left-8 sm:top-24">
          <p className="hud-label text-volt">Engineering lab</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-4xl">Inside the {family.name}</h1>
          <p className="mt-1 max-w-md text-sm text-mist">
            Click a glowing component, or pick one from the list. Placement is schematic and does not reproduce exact production packaging.
          </p>
        </div>

        {s.flow !== "off" && (
          <div className="glass absolute bottom-4 left-4 z-10 rounded-xl px-4 py-3 text-xs sm:left-8">
            <p className="flex items-center gap-2 font-medium">
              <Zap className={cn("h-4 w-4", s.flow === "drive" ? "text-volt" : "text-ok")} />
              {s.flow === "drive" ? "Battery → Inverter → Motor → Wheels" : "Wheels → Motor (generator) → Inverter → Battery"}
            </p>
            <p className="mt-1 text-mist">Educational visualisation. Front path shown for dual-motor layouts.</p>
          </div>
        )}

        <AnimatePresence>
          {selected && (
            <motion.article
              key={selected.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="glass hud-corners absolute inset-x-3 bottom-3 z-20 !bg-carbon/90 max-h-[60%] overflow-y-auto rounded-2xl p-5 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:max-h-[calc(100%-8rem)] sm:w-[400px]"
              aria-live="polite"
              aria-labelledby="comp-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="hud-label text-volt">Component</p>
                  <h2 id="comp-title" className="mt-1 text-xl font-semibold">{selected.name}</h2>
                </div>
                <button type="button" onClick={() => s.set({ selected: null })} className="rounded-full p-1 text-mist hover:text-white" aria-label="Close component details">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fog">{selected.summary}</p>

              <h3 className="hud-label mt-5 flex items-center gap-2"><Layers className="h-3.5 w-3.5" /> How it works</h3>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-fog">
                {selected.howItWorks.map((h) => (
                  <li key={h} className="flex gap-2"><ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-volt" />{h}</li>
                ))}
              </ul>

              <h3 className="hud-label mt-5">Key facts</h3>
              <dl className="mt-2 divide-y divide-line rounded-xl border border-line">
                {selected.facts.map((f) => (
                  <div key={f.label} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2 text-xs">
                    <dt className="text-mist">{f.label}</dt>
                    <dd className="text-fog">{f.value}</dd>
                  </div>
                ))}
              </dl>

              <h3 className="hud-label mt-5">Effect on range &amp; efficiency</h3>
              <p className="mt-2 text-sm leading-relaxed text-fog">{selected.rangeImpact}</p>

              <h3 className="hud-label mt-5 flex items-center gap-2"><Link2 className="h-3.5 w-3.5" /> Connected systems</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.connectsTo.map((id) => (
                  <button key={id} type="button" onClick={() => s.set({ selected: id })} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-fog ring-1 ring-white/10 hover:text-white">
                    {getComponent(id).shortName}
                  </button>
                ))}
              </div>
            </motion.article>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
