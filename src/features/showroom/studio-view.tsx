"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, Crosshair, Info, Maximize2, Minimize2 } from "lucide-react";
import { WithWebGL } from "@/components/three/webgl-guard";
import { SceneSkeleton } from "@/components/ui/primitives";
import { CarSilhouette } from "@/components/vehicles/car-silhouette";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useFormatSpec } from "@/components/ui/spec";
import { useLowPower } from "@/hooks/use-device";
import { useStudio } from "@/stores/studio";
import { bodyFor, families, getConfigurations, getFamily } from "@/data/vehicles";
import { DESIGNS } from "@/lib/car-design/designs";
import { Segmented, StudioControls, VIEWS } from "./studio-controls";
import { TrimBars, TrimMetrics } from "./trim-metrics";
import { cn } from "@/lib/utils";
import type { Configuration, SpecKey } from "@/types/vehicle";

const VehicleScene = dynamic(() => import("./vehicle-scene"), { ssr: false, loading: () => <SceneSkeleton /> });

const latestGen = (id: string) => {
  const f = getFamily(id)!;
  return f.generations[f.generations.length - 1].id;
};

function configsFor(familyId: string, generation: string) {
  const all = getConfigurations(familyId);
  const scoped = all.filter((c) => !c.generationId || c.generationId === generation);
  return scoped.length ? scoped : all;
}

export function StudioView({ familyId: initialFamily }: { familyId: string }) {
  const [familyId, setFamilyId] = useState(initialFamily);
  const family = getFamily(familyId)!;
  const [generation, setGeneration] = useState(() => latestGen(initialFamily));
  const configs = useMemo(() => configsFor(familyId, generation), [familyId, generation]);
  const [configId, setConfigId] = useState(configs[0].id);
  const config = configs.find((c) => c.id === configId) ?? configs[0];
  const body = bodyFor(family, generation);
  const motors = Math.max(...configs.map((c) => c.motors));
  const lowPower = useLowPower();
  const s = useStudio();
  const resetVehicle = useStudio((st) => st.resetVehicle);
  const [tab, setTab] = useState<"configure" | "specs">("configure");
  const [panelOpen, setPanelOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => resetVehicle(), [familyId, generation, resetVehicle]);
  useEffect(() => {
    window.document.title = `${family.name} · 3D Studio · TeslHa`;
  }, [family.name]);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const selectFamily = (id: string) => {
    if (id === familyId) return;
    const gen = latestGen(id);
    setFamilyId(id);
    setGeneration(gen);
    setConfigId(configsFor(id, gen)[0].id);
    // Keep the canvas mounted: update the URL without a route transition.
    window.history.replaceState(null, "", `/studio/${id}`);
  };

  const selectGeneration = (g: string) => {
    setGeneration(g);
    setConfigId(configsFor(familyId, g)[0].id);
  };

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="flex min-h-[100svh] flex-col bg-ink pt-16 lg:h-[100svh] lg:flex-row">
      {/* ── Stage ─────────────────────────────────────────── */}
      <div ref={stageRef} className="flex min-w-0 flex-col bg-ink lg:flex-1">
        <section
          aria-label={`${family.name} 3D viewer`}
          className="relative h-[58svh] min-h-[360px] w-full overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#16181c_0%,#08090b_55%,#050506_100%)] sm:h-[64svh] lg:h-auto lg:flex-1"
        >
          <WithWebGL loading={<SceneSkeleton />}>
            <VehicleScene body={body} name={family.name} motors={motors} lowPower={lowPower} />
          </WithWebGL>

          <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 sm:p-6">
            <div className="pointer-events-auto min-w-0">
              <Link href={`/vehicles/${family.id}`} className="inline-flex items-center gap-1 text-xs text-mist hover:text-white">
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Full specifications
              </Link>
              <h1 className="mt-1 font-display text-2xl tracking-tight sm:text-4xl">{family.name}</h1>
              <p className="mt-1 text-sm text-fog">
                {config.name} <span className="text-mist">· MY{config.modelYear}</span>
                {config.status !== "current" && (
                  <span className={cn("ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase", config.status === "announced" ? "bg-cyan/10 text-cyan" : "bg-amber/10 text-amber")}>
                    {config.status}
                  </span>
                )}
              </p>
              <HeadlineStats config={config} />
              {family.generations.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1" role="radiogroup" aria-label="Generation">
                  {family.generations.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      role="radio"
                      aria-checked={generation === g.id}
                      onClick={() => selectGeneration(g.id)}
                      className={cn("rounded-full px-3 py-1 text-xs ring-1 ring-white/10 backdrop-blur", generation === g.id ? "bg-white/15 text-white" : "bg-black/30 text-mist hover:text-white")}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="pointer-events-auto flex shrink-0 gap-1.5">
              <IconButton label="Recenter camera" onClick={() => s.setView(s.view)}>
                <Crosshair className="h-4 w-4" />
              </IconButton>
              <IconButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </IconButton>
            </div>
          </header>

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 p-3 sm:p-4">
            <Segmented label="Camera view" hideLabel options={VIEWS} value={s.view} onChange={(v) => s.setView(v)} className="glass w-full max-w-[440px] rounded-2xl" />
            <p className="hidden items-center gap-1.5 font-mono text-[10px] text-mist sm:flex">
              <Info className="h-3 w-3 text-amber" aria-hidden="true" />
              Procedural representation · {DESIGNS[body.design].note.toLowerCase()} · not manufacturer CAD
            </p>
          </div>
        </section>

        {/* ── Model selector ─────────────────────────────── */}
        <nav aria-label="Choose a vehicle" className="border-t border-line bg-ink">
          <ul className="flex snap-x gap-2 overflow-x-auto px-3 py-3 sm:px-5 lg:justify-center">
            {families.map((f) => {
              const on = f.id === familyId;
              return (
                <li key={f.id} className="snap-start">
                  <button
                    type="button"
                    onClick={() => selectFamily(f.id)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "group flex w-[150px] flex-col items-center rounded-xl px-2 pb-2 pt-1 ring-1 transition sm:w-[168px]",
                      on ? "bg-volt/10 ring-volt/50" : "ring-white/[0.07] hover:bg-white/[0.04] hover:ring-white/15",
                    )}
                  >
                    <CarSilhouette body={bodyFor(f, latestGen(f.id))} active={on} className="h-14 w-full" />
                    <span className={cn("text-xs", on ? "text-white" : "text-fog group-hover:text-white")}>{f.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* ── Side panel ─────────────────────────────────────── */}
      <aside aria-label="Customise and specifications" className="w-full border-t border-line bg-carbon lg:w-[400px] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium lg:hidden"
          aria-expanded={panelOpen}
          aria-controls="studio-panel"
          onClick={() => setPanelOpen((o) => !o)}
        >
          Customise &amp; specifications
          <ChevronDown className={cn("h-4 w-4 transition-transform", panelOpen && "rotate-180")} aria-hidden="true" />
        </button>
        <div id="studio-panel" className={cn("px-5 pb-8 lg:block lg:pt-5", panelOpen ? "block" : "hidden")}>
          <div role="tablist" aria-label="Panel" className="sticky top-0 z-10 -mx-5 mb-5 grid grid-cols-2 gap-1 border-b border-line bg-carbon/95 px-5 pb-3 backdrop-blur">
            {(["configure", "specs"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`tab-${t}`}
                aria-selected={tab === t}
                aria-controls={`panel-${t}`}
                onClick={() => setTab(t)}
                className={cn("rounded-lg py-2 text-sm capitalize transition", tab === t ? "bg-white/10 text-white" : "text-mist hover:text-white")}
              >
                {t === "configure" ? "Customise" : "Specs"}
              </button>
            ))}
          </div>

          <div role="tabpanel" id="panel-configure" aria-labelledby="tab-configure" hidden={tab !== "configure"}>
            <StudioControls body={body} />
          </div>

          <div role="tabpanel" id="panel-specs" aria-labelledby="tab-specs" hidden={tab !== "specs"} className="space-y-6">
            <TrimPicker configs={configs} value={config.id} onChange={setConfigId} />
            <p className="font-mono text-[11px] text-mist">
              MY{config.modelYear} · {config.drivetrain} · {config.motors} motor{config.motors > 1 ? "s" : ""} · {config.seats} seats · {config.market} market
            </p>
            <TrimMetrics config={config} />
            <TrimBars configs={configs} selectedId={config.id} specKey="epaRangeMi" />
            <TrimBars configs={configs} selectedId={config.id} specKey="zeroToSixtyS" lowerIsBetter />
            <p className="text-[11px] leading-relaxed text-mist">
              Badges show where each figure comes from: Tesla, EPA (fueleconomy.gov), a secondary source, or an announced target. Hover a badge for the source and access date.{" "}
              <Link href={`/vehicles/${family.id}`} className="text-cyan hover:underline">
                Full specification sheet
              </Link>
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="glass grid h-9 w-9 place-items-center rounded-full text-fog transition hover:text-white">
      {children}
    </button>
  );
}

function TrimPicker({ configs, value, onChange }: { configs: Configuration[]; value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <p className="hud-label mb-2">Trim</p>
      <div role="radiogroup" aria-label="Trim" className="flex flex-wrap gap-1.5">
        {configs.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={c.id === value}
            onClick={() => onChange(c.id)}
            className={cn("rounded-full px-3 py-1.5 text-xs ring-1 transition", c.id === value ? "bg-white text-ink ring-white" : "text-fog ring-white/10 hover:text-white")}
          >
            {c.name.replace(/^(Model [SXY3]|Roadster) ?/, "") || c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const HEADLINE: SpecKey[] = ["epaRangeMi", "zeroToSixtyS", "horsepower"];
const HEADLINE_LABEL: Partial<Record<SpecKey, string>> = { epaRangeMi: "Range", zeroToSixtyS: "0–60", horsepower: "Power" };

function HeadlineStats({ config }: { config: Configuration }) {
  const format = useFormatSpec();
  return (
    <dl className="mt-3 hidden gap-5 sm:flex">
      {HEADLINE.map((k) => {
        const spec = config.specs[k];
        if (spec.value === null) return null;
        const f = format(k, spec.value);
        const n = Number(f.value.replace(/,/g, ""));
        const decimals = f.value.includes(".") ? f.value.split(".")[1].length : 0;
        return (
          <div key={k}>
            <dt className="hud-label">{HEADLINE_LABEL[k]}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {Number.isFinite(n) ? <AnimatedNumber key={`${config.id}-${k}`} value={n} decimals={decimals} /> : f.value}
              <span className="ml-1 text-xs font-normal text-mist">{f.unit}</span>
              {spec.verification === "announced-target" && <span className="ml-1.5 font-mono text-[9px] font-normal uppercase text-cyan">target</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
