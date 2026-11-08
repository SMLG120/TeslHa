"use client";

import { Armchair, CarFront, DoorOpen, Layers, Lightbulb, Moon, Rotate3d, ScanEye, Sun, Zap } from "lucide-react";
import { PAINTS, useStudio, type CameraView, type RenderMode } from "@/stores/studio";
import { COMPONENTS } from "@/data/components";
import { cn } from "@/lib/utils";
import type { BodyGeometry } from "@/types/vehicle";
import { DESIGNS, type CabinSpec } from "@/lib/car-design/designs";
import type { CabinLight, InteriorView } from "@/lib/car-design/cabin";

export const VIEWS: { id: CameraView; label: string }[] = [
  { id: "hero", label: "3/4" },
  { id: "front", label: "Front" },
  { id: "side", label: "Side" },
  { id: "rear", label: "Rear" },
  { id: "top", label: "Top" },
  { id: "interior", label: "Interior" },
];

/** Interior camera presets offered for a cabin; options a cabin lacks (rear row, centre screen) are omitted. */
export function interiorViewsFor(cabin: CabinSpec): { id: InteriorView; label: string }[] {
  const all: { id: InteriorView; label: string; show: boolean }[] = [
    { id: "driver", label: "Driver", show: true },
    { id: "passenger", label: "Passenger", show: true },
    { id: "rear", label: "Rear", show: cabin.rows.length > 1 },
    { id: "dashboard", label: "Dash", show: true },
    { id: "steering", label: cabin.steering === "yoke" ? "Yoke" : "Wheel", show: true },
    { id: "screen", label: "Screen", show: cabin.screen !== null },
    { id: "console", label: "Console", show: true },
  ];
  return all.filter((v) => v.show).map(({ id, label }) => ({ id, label }));
}

const CABIN_LIGHTS: { id: CabinLight; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "soft", label: "Soft" },
  { id: "bright", label: "Bright" },
];

const MODES: { id: RenderMode; label: string }[] = [
  { id: "solid", label: "Paint" },
  { id: "xray", label: "X-ray" },
  { id: "wireframe", label: "Wire" },
];

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  hideLabel = false,
  className,
  scrollable = false,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  hideLabel?: boolean;
  className?: string;
  /** Buttons keep their natural width and the row scrolls sideways on narrow screens. */
  scrollable?: boolean;
}) {
  return (
    <div className={className}>
      {!hideLabel && <p className="hud-label mb-2">{label}</p>}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn("grid grid-flow-col gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10", scrollable ? "w-max min-w-full auto-cols-max" : "auto-cols-fr")}
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn("whitespace-nowrap rounded-lg px-2 py-1.5 text-xs text-fog transition hover:text-white", value === o.id && "bg-white/10 text-white ring-1 ring-white/15")}
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
        "flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs ring-1 ring-white/10 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35",
        on ? "bg-volt/15 text-white ring-volt/40" : "text-fog",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", on ? "text-volt" : "text-mist")} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="hud-label mb-2.5">{title}</h3>
      {children}
    </section>
  );
}

/** Customisation panel. Every control here is wired to the procedural rig; unsupported ones are disabled with a reason. */
export function StudioControls({ body }: { body: BodyGeometry }) {
  const s = useStudio();
  const paint = PAINTS.find((p) => p.id === s.paint)!;
  const doorLabel = body.doorStyle === "falcon" ? "Doors (falcon-wing)" : body.doorStyle === "coupe" ? "Doors" : "Doors";
  const inspecting = s.showComponents || s.mode === "xray";
  const cabin = DESIGNS[body.design].cabin;
  return (
    <div className="space-y-6">
      <Section title="Paint">
        <div role="radiogroup" aria-label="Paint" className="flex flex-wrap gap-2.5">
          {PAINTS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={s.paint === p.id}
              aria-label={p.label}
              title={p.label}
              onClick={() => s.set({ paint: p.id })}
              className={cn("h-9 w-9 rounded-full ring-1 ring-white/20 transition hover:scale-105", s.paint === p.id && "ring-2 ring-white ring-offset-2 ring-offset-carbon")}
              style={{ background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,.45), transparent 46%), ${p.color}` }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-mist">{paint.label}</p>
      </Section>

      <Section title="Body & lights">
        <div className="grid grid-cols-2 gap-2">
          <Toggle label={doorLabel} icon={DoorOpen} on={s.doorsOpen} onChange={(doorsOpen) => s.set({ doorsOpen })} />
          <Toggle
            label="Frunk"
            icon={CarFront}
            on={s.frunkOpen}
            onChange={(frunkOpen) => s.set({ frunkOpen })}
            disabled={!body.hasFrunk}
            hint={body.hasFrunk ? undefined : "This vehicle has no front trunk."}
          />
          <Toggle label={body.design === "model-3" || body.design.startsWith("roadster") ? "Trunk" : "Liftgate"} icon={CarFront} on={s.trunkOpen} onChange={(trunkOpen) => s.set({ trunkOpen })} />
          <Toggle label="Headlights" icon={Lightbulb} on={s.headlights} onChange={(headlights) => s.set({ headlights })} />
          <Toggle label="Taillights" icon={Zap} on={s.taillights} onChange={(taillights) => s.set({ taillights })} />
          <Toggle label="Turntable" icon={Rotate3d} on={s.autoRotate} onChange={(autoRotate) => s.set({ autoRotate })} />
        </div>
      </Section>

      <Section title="Interior">
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="Enter cabin" icon={Armchair} on={s.view === "interior"} onChange={(on) => (on ? s.setInteriorView(s.interiorView) : s.setView("hero"))} />
          <Segmented label="Cabin light" hideLabel options={CABIN_LIGHTS} value={s.cabinLight} onChange={(cabinLight) => s.set({ cabinLight })} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-mist">
          Shown: {cabin.rows.reduce((a, b) => a + b, 0)}-seat layout · {cabin.steering === "yoke" ? "yoke" : "round wheel"}
          {cabin.screen ? ` · ${cabin.screen.diagIn}" centre screen` : " · no centre screen"}
          {cabin.cluster ? " · driver display" : ""}
          {cabin.rearScreen ? " · rear display" : ""} · {cabin.upholstery.label} trim
        </p>
      </Section>

      <Section title="Scene">
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="Studio" icon={Sun} on={s.environment === "studio"} onChange={() => s.set({ environment: "studio" })} />
          <Toggle label="Night" icon={Moon} on={s.environment === "night"} onChange={() => s.set({ environment: "night" })} />
        </div>
      </Section>

      <Section title="Engineering">
        <Segmented label="Render mode" hideLabel options={MODES} value={s.mode} onChange={(mode) => s.set({ mode })} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Toggle label="Components" icon={ScanEye} on={s.showComponents} onChange={(showComponents) => s.set({ showComponents, selected: showComponents ? s.selected : null })} />
          <Toggle label="Exploded" icon={Layers} on={s.exploded} onChange={(exploded) => s.set({ exploded, showComponents: s.showComponents || exploded })} />
        </div>
        {inspecting && (
          <div className="mt-3">
            <p className="mb-2 text-[11px] text-mist">
              Select a component to focus the camera on it. Placement and shapes are schematic, not a verified mechanical digital twin.
            </p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Inspect component">
              {COMPONENTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={s.selected === c.id}
                  onClick={() => s.set({ selected: s.selected === c.id ? null : c.id })}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] ring-1 ring-white/10 transition hover:text-white",
                    s.selected === c.id ? "bg-volt/20 text-white ring-volt/50" : "text-fog",
                  )}
                >
                  {c.shortName}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
