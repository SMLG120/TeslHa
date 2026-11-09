"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Box, Cpu, GitCompareArrows } from "lucide-react";
import { ButtonLink } from "@/components/ui/primitives";
import { WithWebGL, useWebGLSupport } from "@/components/three/webgl-guard";
import { useLowPower, useReducedMotion } from "@/hooks/use-device";
import { families } from "@/data/vehicles";
import type { VehicleId } from "@/types/vehicle";
import { PAINTS, type PaintId } from "@/stores/studio";
import { cn } from "@/lib/utils";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

export function HomeHero() {
  const [vehicle, setVehicle] = useState<VehicleId>("roadster");
  const [paint, setPaint] = useState<PaintId>("volt-red");
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState({ stage: "Loading 3D engine", pct: 8 });
  const lowPower = useLowPower();
  const reduced = useReducedMotion();
  const webgl = useWebGLSupport();
  // Without WebGL there is nothing to preload; reveal the content immediately.
  const isReady = ready || webgl === false;

  const onReady = useCallback(() => setReady(true), []);
  const onProgress = useCallback((stage: string, pct: number) => setProgress((p) => (pct > p.pct ? { stage, pct } : p)), []);
  const family = families.find((f) => f.id === vehicle)!;

  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-ink" aria-label="TeslHa introduction">
      <WithWebGL loading={null}>
        <HeroScene vehicleId={vehicle} paint={paint} lowPower={lowPower} reducedMotion={reduced} onReady={onReady} onProgress={onProgress} />
      </WithWebGL>

      {/* Legibility gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,5,6,0.85)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-ink via-ink/70 to-transparent" />

      <Preloader ready={isReady} stage={progress.stage} pct={progress.pct} />

      <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-between px-4 pb-8 pt-28 sm:px-8 sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isReady ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="max-w-3xl"
        >
          <p className="hud-label text-volt">Independent EV engineering platform</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(2rem,6.4vw,5.6rem)] leading-[0.95] tracking-tight">
            <span className="metal-text block">TESLHA</span>
            <span className="mt-2 block text-[0.38em] leading-tight tracking-[0.12em] text-fog">ENGINEERING THE ELECTRIC FUTURE</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-mist sm:text-lg">
            Explore the machines, technology, and engineering behind the next generation of electric mobility.
          </p>
          <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/vehicles" variant="primary">
              Explore Vehicles <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href={`/studio/${vehicle}`}>
              <Box className="h-4 w-4" /> Enter 3D Studio
            </ButtonLink>
            <ButtonLink href="/compare" className="hidden sm:inline-flex">
              <GitCompareArrows className="h-4 w-4" /> Compare Performance
            </ButtonLink>
            <ButtonLink href="/engineering" className="hidden sm:inline-flex">
              <Cpu className="h-4 w-4" /> Discover Engineering
            </ButtonLink>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isReady ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.5 }}
          className="pointer-events-auto flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p className="hud-label mb-2">Select vehicle</p>
            <div role="radiogroup" aria-label="Vehicle" className="glass flex max-w-full gap-1 overflow-x-auto rounded-full p-1">
              {families.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={vehicle === f.id}
                  onClick={() => setVehicle(f.id)}
                  className={cn(
                    "relative shrink-0 rounded-full px-4 py-2 text-sm text-fog transition-colors hover:text-white",
                    vehicle === f.id && "bg-volt text-white shadow-[0_0_24px_-6px_rgba(255,42,54,0.8)]",
                  )}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-6">
            <AnimatePresence mode="wait">
              <motion.div key={family.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="max-w-sm text-right">
                <p className="text-sm font-medium">{family.tagline}</p>
                <p className="mt-1 font-mono text-[11px] text-mist">
                  {family.asset ? (
                    <>
                      3D model:{" "}
                      <a href={family.asset.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-white">
                        &ldquo;{family.asset.title}&rdquo;
                      </a>{" "}
                      by {family.asset.author} ·{" "}
                      <a href={family.asset.licenseUrl} target="_blank" rel="noreferrer" className="underline hover:text-white">
                        {family.asset.license}
                      </a>{" "}
                      · scaled, recoloured
                    </>
                  ) : (
                    `${family.productionYears} · procedural representation`
                  )}
                </p>
              </motion.div>
            </AnimatePresence>
            <div role="radiogroup" aria-label="Paint" className="flex gap-1.5">
              {PAINTS.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={paint === p.id}
                  aria-label={p.label}
                  title={p.label}
                  onClick={() => setPaint(p.id)}
                  className={cn("h-6 w-6 rounded-full ring-1 ring-white/20 transition", paint === p.id && "ring-2 ring-white ring-offset-2 ring-offset-ink")}
                  style={{ background: p.color }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Preloader({ ready, stage, pct }: { ready: boolean; stage: string; pct: number }) {
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-ink"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          role="status"
          aria-live="polite"
        >
          <p className="font-[family-name:var(--font-display)] text-lg tracking-[0.4em]">
            TESL<span className="text-volt">HA</span>
          </p>
          <div className="mt-6 h-px w-64 overflow-hidden bg-white/10">
            <motion.div className="h-full bg-volt" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
          </div>
          <p className="hud-label mt-3">
            {stage} · {pct}%
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
