"use client";

import { useMemo, useState } from "react";
import { Activity, Info } from "lucide-react";
import { configurations, families } from "@/data/vehicles";
import { MetricBars, type BarRow } from "@/components/charts/metric-bars";
import { SERIES } from "@/components/charts/palette";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { SPEC_LABELS, useFormatSpec, VERIFICATION_META } from "@/components/ui/spec";
import { chargeCost } from "@/lib/calc/ownership";
import { usePreferences } from "@/stores/preferences";
import { money, MI_TO_KM } from "@/lib/units";
import { cn } from "@/lib/utils";
import { NumberField } from "@/components/ui/number-field";
import type { Configuration, SpecKey } from "@/types/vehicle";

const FAMILY_COLOR = Object.fromEntries(families.map((f, i) => [f.id, SERIES[i]])) as Record<string, string>;
const COVERAGE_KEYS: SpecKey[] = ["horsepower", "torqueNm", "zeroToSixtyS", "topSpeedMph", "epaRangeMi", "batteryKwh", "efficiencyWhPerMi", "peakDcChargeKw", "cargoCuFt", "msrpUsd"];

export function AnalyticsDashboard() {
  const [includeAnnounced, setIncludeAnnounced] = useState(false);
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [kwhPerMile, setKwhPerMile] = useState(0.28);
  const [price, setPrice] = useState(0.17);
  const format = useFormatSpec();
  const { units, currency } = usePreferences();

  const rows = useMemo(
    () =>
      configurations.filter(
        (c) => (includeAnnounced || c.status !== "announced") && (familyFilter === "all" || c.familyId === familyFilter),
      ),
    [includeAnnounced, familyFilter],
  );

  const bars = (key: SpecKey, sort: "asc" | "desc" = "desc"): BarRow[] =>
    rows
      .filter((c) => c.specs[key].value !== null)
      .sort((a, b) => (sort === "desc" ? b.specs[key].value! - a.specs[key].value! : a.specs[key].value! - b.specs[key].value!))
      .map((c) => {
        const f = format(key, c.specs[key].value!);
        return {
          id: c.id,
          label: c.name,
          value: c.specs[key].value!,
          color: FAMILY_COLOR[c.familyId],
          display: `${f.value} ${f.unit}`.trim(),
          badge: VERIFICATION_META[c.specs[key].verification].label,
        };
      });

  const rangePerK: BarRow[] = rows
    .filter((c) => c.specs.epaRangeMi.value !== null && c.specs.msrpUsd.value !== null)
    .map((c) => {
      const perK = c.specs.epaRangeMi.value! / (c.specs.msrpUsd.value! / 1000);
      const v = units === "metric" ? perK * MI_TO_KM : perK;
      return { id: c.id, label: c.name, value: v, color: FAMILY_COLOR[c.familyId], display: `${v.toFixed(1)} ${units === "metric" ? "km" : "mi"} / $1k` };
    })
    .sort((a, b) => b.value - a.value);

  const total = rows.length * COVERAGE_KEYS.length;
  const filled = rows.reduce((n, c) => n + COVERAGE_KEYS.filter((k) => c.specs[k].value !== null).length, 0);
  const primary = rows.reduce((n, c) => n + COVERAGE_KEYS.filter((k) => c.specs[k].value !== null && ["manufacturer", "regulatory"].includes(c.specs[k].verification)).length, 0);
  const maxRange = Math.max(0, ...rows.map((c) => c.specs.epaRangeMi.value ?? 0));
  const cost100 = chargeCost(100, kwhPerMile, price);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-10 sm:px-8">
      {/* Filters: one row above the charts */}
      <div className="flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Vehicle family" className="flex flex-wrap gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/10">
          {[{ id: "all", name: "All" }, ...families].map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={familyFilter === f.id}
              onClick={() => setFamilyFilter(f.id)}
              className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-fog", familyFilter === f.id && "bg-white/10 text-white")}
            >
              {f.id !== "all" && <span className="h-2 w-2 rounded-full" style={{ background: FAMILY_COLOR[f.id] }} aria-hidden="true" />}
              {f.name}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-fog">
          <input type="checkbox" checked={includeAnnounced} onChange={(e) => setIncludeAnnounced(e.target.checked)} className="accent-[#ff2a36]" />
          Include announced targets
        </label>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Configurations in view" value={<AnimatedNumber value={rows.length} />} sub={`${new Set(rows.map((r) => r.familyId)).size} families`} />
        <Kpi
          label="Longest range in view"
          value={<><AnimatedNumber value={Math.round(units === "metric" ? maxRange * MI_TO_KM : maxRange)} /><span className="ml-1 text-sm text-mist">{units === "metric" ? "km" : "mi"}</span></>}
          sub="EPA estimate unless marked target"
        />
        <Kpi label="Spec coverage" value={<AnimatedNumber value={total ? Math.round((filled / total) * 100) : 0} suffix="%" />} sub={`${filled} of ${total} values published`} />
        <Kpi label="Primary-source verified" value={<AnimatedNumber value={total ? Math.round((primary / total) * 100) : 0} suffix="%" />} sub="Values re-checked against Tesla / EPA" warn={primary === 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricBars title="EPA-estimated range by configuration" rows={bars("epaRangeMi")} footnote="Wheel size changes EPA range materially; each bar is one specific configuration." />
        <MetricBars title="0–60 mph (quickest first)" rows={bars("zeroToSixtyS", "asc")} footnote="Manufacturer figures with 1 ft rollout subtracted." />
        <MetricBars title="Top speed" rows={bars("topSpeedMph")} />
        <MetricBars title="Range per $1,000 of US MSRP" rows={rangePerK} footnote="A simple value metric: EPA range ÷ (MSRP / 1000). Ignores incentives and equipment differences." />
      </div>

      {/* Charging cost + charging curve */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className="glass rounded-2xl p-6" aria-labelledby="cc-h">
          <h2 id="cc-h" className="text-sm font-medium">Estimated charging cost</h2>
          <p className="mt-1 text-xs text-mist">Your assumptions. These are not vehicle-specific EPA values.</p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <NumberField label="Consumption (kWh/mi)" value={kwhPerMile} step={0.01} min={0.15} max={0.6} onChange={setKwhPerMile} />
            <NumberField label="Electricity ($/kWh)" value={price} step={0.01} min={0.03} max={1} onChange={setPrice} />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <dt className="hud-label">Per 100 {units === "metric" ? "km" : "mi"}</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums">{money(units === "metric" ? cost100 / MI_TO_KM : cost100, currency, 2)}</dd>
            </div>
            <div>
              <dt className="hud-label">Per year (12k mi)</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums">{money(chargeCost(12000, kwhPerMile, price), currency)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[11px] text-mist">Includes 90% wall-to-battery charging efficiency.</p>
        </section>
        <section className="rounded-2xl border border-dashed border-line p-6" aria-labelledby="curve-h">
          <h2 id="curve-h" className="flex items-center gap-2 text-sm font-medium"><Activity className="h-4 w-4 text-mist" /> DC charging curves</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist">
            Not shown yet, on purpose. Tesla publishes peak charging power, not full power-vs-state-of-charge curves. Published third-party curves vary with pack temperature, charger hardware and software version. This panel will plot curves once a dataset with documented test conditions is added to <code className="text-fog">src/data</code>.
          </p>
        </section>
      </div>

      {/* Coverage matrix */}
      <section aria-labelledby="cov-h">
        <h2 id="cov-h" className="flex items-center gap-2 text-lg font-semibold">Data coverage matrix <Info className="h-4 w-4 text-mist" aria-hidden="true" /></h2>
        <p className="mt-1 text-sm text-mist">Which values exist, and how trustworthy each one is. Blank cells are values Tesla does not publish.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-carbon">
              <tr>
                <th scope="col" className="hud-label px-3 py-3 text-left font-normal">Configuration</th>
                {COVERAGE_KEYS.map((k) => (
                  <th key={k} scope="col" className="hud-label px-2 py-3 text-left font-normal">{SPEC_LABELS[k]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c: Configuration) => (
                <tr key={c.id} className="border-t border-line/60">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-fog">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: FAMILY_COLOR[c.familyId] }} aria-hidden="true" />
                    {c.name}
                  </th>
                  {COVERAGE_KEYS.map((k) => {
                    const s = c.specs[k];
                    const meta = VERIFICATION_META[s.verification];
                    return (
                      <td key={k} className="px-2 py-2">
                        {s.value === null ? (
                          <span className="text-mist/50" title={s.note}>—</span>
                        ) : (
                          <span className={cn("inline-flex rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase", meta.className)}>{meta.label}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, warn }: { label: string; value: React.ReactNode; sub: string; warn?: boolean }) {
  return (
    <div className="glass hud-corners rounded-2xl p-5">
      <p className="hud-label">{label}</p>
      <p className="mt-3 flex items-baseline text-4xl font-semibold tracking-tight">{value}</p>
      <p className={cn("mt-2 text-xs", warn ? "text-amber" : "text-mist")}>{sub}</p>
    </div>
  );
}
