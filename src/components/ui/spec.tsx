"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { ExternalLink } from "lucide-react";
import type { Spec, SpecKey, Verification } from "@/types/vehicle";
import { getSource } from "@/data/sources";
import { usePreferences } from "@/stores/preferences";
import { cargo, distance, fmt, money, speed, torque } from "@/lib/units";
import { cn } from "@/lib/utils";

export const VERIFICATION_META: Record<Verification, { label: string; className: string; description: string }> = {
  manufacturer: { label: "Tesla", className: "text-ok border-ok/30 bg-ok/10", description: "Published by the manufacturer." },
  regulatory: { label: "EPA", className: "text-ok border-ok/30 bg-ok/10", description: "Official regulatory data." },
  secondary: {
    label: "Secondary",
    className: "text-amber border-amber/30 bg-amber/10",
    description: "Reported by third-party sources. Pending re-check against Tesla or fueleconomy.gov.",
  },
  "announced-target": {
    label: "Target",
    className: "text-cyan border-cyan/30 bg-cyan/10",
    description: "Announced claim for an unreleased vehicle. Not a verified production spec.",
  },
};

export const SPEC_LABELS: Record<SpecKey, string> = {
  horsepower: "Peak power",
  torqueNm: "Torque",
  zeroToSixtyS: "0–60 mph",
  topSpeedMph: "Top speed",
  epaRangeMi: "EPA range",
  batteryKwh: "Battery",
  efficiencyWhPerMi: "Consumption",
  peakDcChargeKw: "Peak DC charge",
  cargoCuFt: "Cargo",
  msrpUsd: "MSRP (US)",
};

export function useFormatSpec() {
  const { units, currency } = usePreferences();
  return (key: SpecKey, v: number): { value: string; unit: string } => {
    switch (key) {
      case "horsepower":
        return units === "metric" ? { value: fmt(v * 0.7457), unit: "kW" } : { value: fmt(v), unit: "hp" };
      case "torqueNm": {
        const t = torque(v, units);
        return { value: fmt(t.value), unit: t.unit };
      }
      case "zeroToSixtyS":
        return { value: fmt(v, v < 2 ? 2 : 1), unit: "s" };
      case "topSpeedMph": {
        const s = speed(v, units);
        return { value: fmt(s.value), unit: s.unit };
      }
      case "epaRangeMi": {
        const d = distance(v, units);
        return { value: fmt(d.value), unit: d.unit };
      }
      case "batteryKwh":
        return { value: fmt(v), unit: "kWh" };
      case "efficiencyWhPerMi":
        return units === "metric" ? { value: fmt(v / 16.09344, 1), unit: "kWh/100km" } : { value: fmt(v), unit: "Wh/mi" };
      case "peakDcChargeKw":
        return { value: fmt(v), unit: "kW" };
      case "cargoCuFt": {
        const c = cargo(v, units);
        // Keep the published half/tenth cu ft (e.g. 94.5, 74.8) instead of rounding it away.
        const digits = c.unit === "cu ft" && !Number.isInteger(v) ? 1 : 0;
        return { value: fmt(c.value, digits), unit: c.unit };
      }
      case "msrpUsd":
        return { value: money(v, currency), unit: currency === "USD" ? "" : "conv." };
    }
  };
}

export function VerificationBadge({ spec, className }: { spec: Spec; className?: string }) {
  const meta = VERIFICATION_META[spec.verification];
  const sources = spec.sourceIds.map(getSource).filter((s) => s !== undefined);
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={cn("inline-flex h-5 items-center rounded-full border px-1.5 font-mono text-[9.5px] uppercase tracking-wider", meta.className, className)}
            aria-label={`${meta.label}: ${meta.description} Show sources`}
          >
            {meta.label}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={6} className="glass z-[100] max-w-xs rounded-xl p-3 text-xs leading-relaxed text-fog shadow-2xl">
            <p className="font-medium text-white">{meta.description}</p>
            {spec.note && <p className="mt-1.5">{spec.note}</p>}
            {sources.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-line pt-2">
                {sources.map((s) => (
                  <li key={s.id}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan hover:underline">
                      {s.publisher}: {s.title} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                    <span className="block text-[10px] text-mist">Accessed {s.accessed}</span>
                  </li>
                ))}
              </ul>
            )}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function SpecValue({ specKey, spec, size = "md" }: { specKey: SpecKey; spec: Spec; size?: "sm" | "md" | "lg" }) {
  const format = useFormatSpec();
  const big = size === "lg" ? "text-3xl sm:text-4xl" : size === "md" ? "text-xl" : "text-sm";
  if (spec.value === null) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className={cn("text-mist", size === "lg" ? "text-lg" : "text-sm")}>Not published</span>
        <VerificationBadge spec={spec} />
      </span>
    );
  }
  const f = format(specKey, spec.value);
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={cn("font-semibold tabular-nums tracking-tight", big)}>
        {spec.verification === "announced-target" && specKey === "topSpeedMph" ? ">" : ""}
        {f.value}
      </span>
      {f.unit && <span className="text-xs text-mist">{f.unit}</span>}
      <VerificationBadge spec={spec} className="ml-1 self-center" />
    </span>
  );
}
