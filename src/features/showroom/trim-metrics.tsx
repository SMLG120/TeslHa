"use client";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { SPEC_LABELS, VerificationBadge, useFormatSpec } from "@/components/ui/spec";
import type { Configuration, Spec, SpecKey } from "@/types/vehicle";
import { cn } from "@/lib/utils";

const KPIS: { key: SpecKey; label?: string }[] = [
  { key: "horsepower" },
  { key: "zeroToSixtyS" },
  { key: "epaRangeMi" },
  { key: "topSpeedMph" },
  { key: "batteryKwh", label: "Battery (usable)" },
  { key: "peakDcChargeKw", label: "DC fast charging" },
];

/** Split a formatted value like "$84,990" or "1.99" into an animatable number with affixes. */
function parts(formatted: string) {
  const m = formatted.match(/^([^\d-]*)(-?[\d,]*\.?\d*)(.*)$/);
  if (!m || !m[2]) return null;
  const num = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  const decimals = m[2].includes(".") ? m[2].split(".")[1].length : 0;
  return { prefix: m[1], num, suffix: m[3], decimals };
}

function Kpi({ specKey, spec, label, wide }: { specKey: SpecKey; spec: Spec; label?: string; wide?: boolean }) {
  const format = useFormatSpec();
  const f = spec.value !== null ? format(specKey, spec.value) : null;
  const p = f ? parts(f.value) : null;
  return (
    <div className={cn("rounded-xl bg-white/[0.035] p-3.5 ring-1 ring-white/[0.07]", wide && "col-span-2")}>
      <div className="flex items-center justify-between gap-2">
        <p className="hud-label truncate">{label ?? SPEC_LABELS[specKey]}</p>
        <VerificationBadge spec={spec} />
      </div>
      {f ? (
        <p className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {spec.verification === "announced-target" && specKey === "topSpeedMph" ? ">" : ""}
            {p ? <AnimatedNumber key={`${spec.value}`} value={p.num} decimals={p.decimals} prefix={p.prefix} suffix={p.suffix} /> : f.value}
          </span>
          {f.unit && <span className="text-xs text-mist">{f.unit}</span>}
        </p>
      ) : (
        <p className="mt-2 text-sm text-mist">Not published</p>
      )}
    </div>
  );
}

export function TrimMetrics({ config }: { config: Configuration }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {KPIS.map((k) => (
          <Kpi key={k.key} specKey={k.key} spec={config.specs[k.key]} label={k.label} />
        ))}
        <Kpi specKey="msrpUsd" spec={config.specs.msrpUsd} label={`Starting price · ${config.market} market`} wide />
      </div>
    </div>
  );
}

/** Compact within-family comparison: one neutral bar per trim, the selected trim in the accent colour. */
export function TrimBars({ configs, selectedId, specKey, lowerIsBetter = false }: { configs: Configuration[]; selectedId: string; specKey: SpecKey; lowerIsBetter?: boolean }) {
  const format = useFormatSpec();
  const rows = configs.filter((c) => c.specs[specKey].value !== null);
  if (rows.length < 2) return null;
  const max = Math.max(...rows.map((c) => c.specs[specKey].value!));
  return (
    <figure>
      <figcaption className="hud-label mb-2">
        {SPEC_LABELS[specKey]} across trims {lowerIsBetter && <span className="normal-case tracking-normal text-mist">(lower is quicker)</span>}
      </figcaption>
      <ul className="space-y-1.5">
        {rows.map((c) => {
          const v = c.specs[specKey].value!;
          const f = format(specKey, v);
          const on = c.id === selectedId;
          return (
            <li key={c.id} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 text-xs" title={`${c.name}: ${f.value} ${f.unit}`}>
              <span className={cn("truncate", on ? "text-white" : "text-mist")}>{c.name.replace(/^Model [SXY3] |^Roadster /, "")}</span>
              <span className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <span className={cn("block h-full rounded-full transition-[width] duration-700", on ? "bg-volt" : "bg-white/30")} style={{ width: `${(v / max) * 100}%` }} />
              </span>
              <span className={cn("tabular-nums", on ? "text-white" : "text-fog")}>
                {f.value}
                <span className="ml-0.5 text-mist">{f.unit}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
