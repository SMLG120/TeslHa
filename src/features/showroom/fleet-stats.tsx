"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { families, getConfigurations } from "@/data/vehicles";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { VerificationBadge } from "@/components/ui/spec";
import { usePreferences } from "@/stores/preferences";
import { MI_TO_KM } from "@/lib/units";
import type { Configuration, Spec, SpecKey } from "@/types/vehicle";

/** Best value across a family's configurations for a given spec (lowest for 0–60, highest otherwise). */
function best(configs: Configuration[], key: SpecKey, lowerIsBetter = false): Spec | null {
  const withValue = configs.map((c) => c.specs[key]).filter((s) => s.value !== null);
  if (!withValue.length) return null;
  return withValue.reduce((a, b) => ((lowerIsBetter ? b.value! < a.value! : b.value! > a.value!) ? b : a));
}

export function FleetStats() {
  const units = usePreferences((s) => s.units);
  return (
    <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {families.map((f, i) => {
        const configs = getConfigurations(f.id).filter((c) => c.status !== "announced");
        const range = best(configs, "epaRangeMi");
        const accel = best(configs, "zeroToSixtyS", true);
        return (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.07, duration: 0.6 }}
          >
            <Link href={`/vehicles/${f.id}`} className="glass group block h-full rounded-2xl p-5 transition hover:border-white/20">
              <div className="flex items-start justify-between">
                <p className="text-lg font-semibold">{f.name}</p>
                <span className="font-mono text-[10px] text-mist">{f.productionYears.split("·")[0]}</span>
              </div>
              <dl className="mt-6 space-y-4">
                <div>
                  <dt className="hud-label">Best range</dt>
                  <dd className="mt-1 flex items-center gap-2 text-3xl font-semibold">
                    {range ? (
                      <>
                        <AnimatedNumber value={units === "metric" ? Math.round(range.value! * MI_TO_KM) : range.value!} />
                        <span className="text-xs font-normal text-mist">{units === "metric" ? "km" : "mi"}</span>
                        <VerificationBadge spec={range} />
                      </>
                    ) : (
                      <span className="text-base text-mist">n/a</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="hud-label">Quickest 0–60 mph</dt>
                  <dd className="mt-1 flex items-center gap-2 text-3xl font-semibold">
                    {accel ? (
                      <>
                        <AnimatedNumber value={accel.value!} decimals={accel.value! < 2 ? 2 : 1} />
                        <span className="text-xs font-normal text-mist">s</span>
                        <VerificationBadge spec={accel} />
                      </>
                    ) : (
                      <span className="text-base text-mist">n/a</span>
                    )}
                  </dd>
                </div>
              </dl>
              <p className="mt-6 text-xs leading-relaxed text-mist">{f.statusNote}</p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
