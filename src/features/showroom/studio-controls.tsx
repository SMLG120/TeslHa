"use client";

import { Camera, CarFront, DoorOpen, Lightbulb, Moon, RotateCcw, Rotate3d, ScanEye, Sun } from "lucide-react";
import { PAINTS, useStudio, type CameraView, type RenderMode } from "@/stores/studio";
import { cn } from "@/lib/utils";
import type { BodyGeometry } from "@/types/vehicle";

const VIEWS: { id: CameraView; label: string }[] = [
  { id: "hero", label: "3/4" },
  { id: "front", label: "Front" },
  { id: "side", label: "Side" },
  { id: "rear", label: "Rear" },
  { id: "top", label: "Top" },
  { id: "interior", label: "Interior" },
];

const MODES: { id: RenderMode; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "xray", label: "X-ray" },
  { id: "wireframe", label: "Wire" },
];

export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="hud-label mb-2">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn("rounded-lg px-2 py-1.5 text-xs text-fog transition hover:text-white", value === o.id && "bg-white/10 text-white ring-1 ring-white/15")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, icon: Icon, on, onChange, disabled, hint }: { label: string; icon: typeof Sun; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      title={hint}
      onClick={() => onChange(!on)}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs ring-1 ring-white/10 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35",
        on ? "bg-volt/15 text-white ring-volt/40" : "text-fog",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", on ? "text-volt" : "text-mist")} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function StudioControls({ body }: { body: BodyGeometry }) {
  const s = useStudio();
  const doorLabel = body.doorStyle === "falcon" ? "Doors (falcon-wing)" : "Doors";
  return (
    <div className="space-y-5">
      <Segmented label="Camera" options={VIEWS} value={s.view} onChange={(v) => s.setView(v)} />
      <Segmented label="Render mode" options={MODES} value={s.mode} onChange={(mode) => s.set({ mode })} />

      <div>
        <p className="hud-label mb-2">Paint</p>
        <div role="radiogroup" aria-label="Paint" className="flex flex-wrap gap-2">
          {PAINTS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={s.paint === p.id}
              aria-label={p.label}
              title={p.label}
              onClick={() => s.set({ paint: p.id })}
              className={cn("h-8 w-8 rounded-full ring-1 ring-white/20 transition", s.paint === p.id && "ring-2 ring-white ring-offset-2 ring-offset-carbon")}
              style={{ background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), transparent 45%), ${p.color}` }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="hud-label mb-2">Vehicle</p>
        <div className="grid grid-cols-2 gap-2">
          <Toggle label={doorLabel} icon={DoorOpen} on={s.doorsOpen} onChange={(doorsOpen) => s.set({ doorsOpen })} />
          <Toggle
            label="Frunk"
            icon={CarFront}
            on={s.frunkOpen}
            onChange={(frunkOpen) => s.set({ frunkOpen })}
            disabled={!body.hasFrunk}
            hint={body.hasFrunk ? undefined : "This body has no front trunk in the representation."}
          />
          <Toggle label="Trunk" icon={CarFront} on={s.trunkOpen} onChange={(trunkOpen) => s.set({ trunkOpen })} />
          <Toggle label="Headlights" icon={Lightbulb} on={s.headlights} onChange={(headlights) => s.set({ headlights })} />
        </div>
      </div>

      <div>
        <p className="hud-label mb-2">Environment</p>
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="Studio" icon={Sun} on={s.environment === "studio"} onChange={() => s.set({ environment: "studio" })} />
          <Toggle label="Night" icon={Moon} on={s.environment === "night"} onChange={() => s.set({ environment: "night" })} />
          <Toggle label="Components" icon={ScanEye} on={s.showComponents} onChange={(showComponents) => s.set({ showComponents })} />
          <Toggle label="Turntable" icon={Rotate3d} on={s.autoRotate} onChange={(autoRotate) => s.set({ autoRotate })} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => s.setView(s.view)} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs text-fog ring-1 ring-white/10 hover:bg-white/5">
          <Camera className="h-4 w-4" aria-hidden="true" /> Recenter
        </button>
        <button type="button" onClick={() => s.reset()} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs text-fog ring-1 ring-white/10 hover:bg-white/5">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset all
        </button>
      </div>
    </div>
  );
}
