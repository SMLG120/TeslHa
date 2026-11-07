"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import { ArrowUpRight, Box, Cpu } from "lucide-react";
import { bodyFor, getConfigurations, getFamily } from "@/data/vehicles";
import { SPEC_LABELS, SpecValue, VerificationBadge } from "@/components/ui/spec";
import { WithWebGL } from "@/components/three/webgl-guard";
import { SceneSkeleton } from "@/components/ui/primitives";
import { useLowPower } from "@/hooks/use-device";
import { usePreferences } from "@/stores/preferences";
import { fmt } from "@/lib/units";
import type { SpecKey } from "@/types/vehicle";

const VehicleScene = dynamic(() => import("./vehicle-scene"), { ssr: false, loading: () => <SceneSkeleton /> });

const SPEC_ORDER: SpecKey[] = ["epaRangeMi", "zeroToSixtyS", "topSpeedMph", "horsepower", "torqueNm", "batteryKwh", "efficiencyWhPerMi", "peakDcChargeKw", "cargoCuFt", "msrpUsd"];

export function VehicleDetail({ familyId }: { familyId: string }) {
  const family = getFamily(familyId)!;
  const configs = getConfigurations(family.id);
  const [active, setActive] = useState(configs[0].id);
  const config = configs.find((c) => c.id === active)!;
  const body = bodyFor(family, config.generationId);
  const lowPower = useLowPower();
  const units = usePreferences((s) => s.units);
  const dims = body;

  return (
    <>
      <section className="relative h-[62svh] min-h-[420px] w-full overflow-hidden border-b border-line">
        <WithWebGL loading={<SceneSkeleton />}>
          <VehicleScene key={body.lengthMm} body={body} name={family.name} motors={config.motors} lowPower={lowPower} />
        </WithWebGL>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-[1440px] px-4 pb-8 sm:px-8">
          <p className="hud-label text-volt">{family.segment}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-6xl">{family.name}</h1>
          <p className="mt-2 max-w-xl text-fog">{family.tagline}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <Tabs.Root value={active} onValueChange={setActive}>
            <Tabs.List aria-label="Configuration" className="flex gap-1 overflow-x-auto border-b border-line">
              {configs.map((c) => (
                <Tabs.Trigger
                  key={c.id}
                  value={c.id}
                  className="relative shrink-0 px-4 py-3 text-sm text-mist transition hover:text-white data-[state=active]:text-white"
                >
                  {c.name.replace(family.name + " ", "")}
                  {c.id === active && <motion.span layoutId="cfg-underline" className="absolute inset-x-2 -bottom-px h-0.5 bg-volt" />}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {configs.map((c) => (
              <Tabs.Content key={c.id} value={c.id} className="pt-8 outline-none">
                <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-mist">
                  <span>Model year {c.modelYear}</span>
                  <span>{c.drivetrain}</span>
                  <span>{c.motors} motor{c.motors > 1 ? "s" : ""}</span>
                  <span>{c.seats} seats</span>
                  {c.wheelsIn && <span>{c.wheelsIn}&Prime; wheels</span>}
                  <span>Market: {c.market}</span>
                  <span className={c.status === "announced" ? "text-cyan" : c.status === "discontinued" ? "text-amber" : "text-ok"}>{c.status}</span>
                </div>
                {c.status === "announced" && (
                  <p className="mt-4 rounded-xl border border-cyan/25 bg-cyan/5 p-4 text-sm text-cyan">
                    Every figure for this configuration is a manufacturer target from the 2017 announcement. None has been independently tested or EPA-rated.
                  </p>
                )}
                <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                  {SPEC_ORDER.map((k) => (
                    <div key={k} className="bg-carbon p-5">
                      <dt className="hud-label">{SPEC_LABELS[k]}</dt>
                      <dd className="mt-2">
                        <SpecValue specKey={k} spec={c.specs[k]} size="md" />
                        {c.specs[k].note && <p className="mt-1.5 text-xs leading-relaxed text-mist">{c.specs[k].note}</p>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <p className="hud-label">About</p>
            <p className="mt-3 text-sm leading-relaxed text-fog">{family.summary}</p>
            <p className="mt-4 rounded-xl border border-amber/20 bg-amber/5 p-3 text-xs leading-relaxed text-amber">{family.statusNote}</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="hud-label flex items-center gap-2">
              Exterior dimensions
              <VerificationBadge spec={{ value: null, verification: dims.dimensionsVerification, sourceIds: dims.dimensionsSourceIds, note: "Used to proportion the 3D representation." }} />
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              {[
                ["Length", dims.lengthMm],
                ["Width (body)", dims.widthMm],
                ["Height", dims.heightMm],
                ["Wheelbase", dims.wheelbaseMm],
              ].map(([label, mm]) => (
                <div key={label as string}>
                  <dt className="text-xs text-mist">{label}</dt>
                  <dd className="font-medium tabular-nums">
                    {units === "metric" ? `${fmt(mm as number)} mm` : `${fmt((mm as number) / 25.4, 1)} in`}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid gap-2">
            <Link href={`/studio/${family.id}`} className="glass flex items-center justify-between rounded-2xl p-5 hover:border-white/20">
              <span className="flex items-center gap-3"><Box className="h-5 w-5 text-volt" /> Open full-screen 3D Studio</span>
              <ArrowUpRight className="h-4 w-4 text-mist" />
            </Link>
            <Link href={`/engineering?vehicle=${family.id}`} className="glass flex items-center justify-between rounded-2xl p-5 hover:border-white/20">
              <span className="flex items-center gap-3"><Cpu className="h-5 w-5 text-volt" /> Inspect components</span>
              <ArrowUpRight className="h-4 w-4 text-mist" />
            </Link>
            <Link href={`/compare?ids=${configs.map((c) => c.id).slice(0, 3).join(",")}`} className="glass flex items-center justify-between rounded-2xl p-5 hover:border-white/20">
              <span>Compare these configurations</span>
              <ArrowUpRight className="h-4 w-4 text-mist" />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
