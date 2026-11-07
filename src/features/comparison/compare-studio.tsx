"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Slider from "@radix-ui/react-slider";
import { Plus, Trophy, X } from "lucide-react";
import { bodyFor, configurations, getConfiguration, getFamily } from "@/data/vehicles";
import { SERIES } from "@/components/charts/palette";
import { MetricBars, type BarRow } from "@/components/charts/metric-bars";
import { SPEC_LABELS, SpecValue, useFormatSpec, VERIFICATION_META } from "@/components/ui/spec";
import { WithWebGL } from "@/components/three/webgl-guard";
import { SceneSkeleton } from "@/components/ui/primitives";
import { Segmented } from "@/features/showroom/studio-controls";
import { useLowPower } from "@/hooks/use-device";
import { SCORABLE, bestIds, scoreConfigurations, type Weights } from "@/lib/calc/scoring";
import { DEFAULT_INPUTS, simulate } from "@/lib/calc/ownership";
import { usePreferences } from "@/stores/preferences";
import { money } from "@/lib/units";
import { cn } from "@/lib/utils";
import type { Configuration, SpecKey } from "@/types/vehicle";
import type { CameraView } from "@/stores/studio";

const CompareScene = dynamic(() => import("./compare-scene"), { ssr: false, loading: () => <SceneSkeleton /> });

const DEFAULT_IDS = ["model-3-premium-rwd-2026", "model-y-premium-rwd-2026", "model-s-plaid-2026"];
const TABLE_GROUPS: { title: string; keys: SpecKey[]; lower?: SpecKey[] }[] = [
  { title: "Performance", keys: ["horsepower", "torqueNm", "zeroToSixtyS", "topSpeedMph"], lower: ["zeroToSixtyS"] },
  { title: "Battery & efficiency", keys: ["epaRangeMi", "batteryKwh", "efficiencyWhPerMi", "peakDcChargeKw"], lower: ["efficiencyWhPerMi"] },
  { title: "Practicality", keys: ["cargoCuFt"] },
  { title: "Economics", keys: ["msrpUsd"], lower: ["msrpUsd"] },
];

export function CompareStudio() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ids = useMemo(() => {
    const raw = params.get("ids")?.split(",").filter((id) => getConfiguration(id)) ?? [];
    return (raw.length >= 2 ? raw : DEFAULT_IDS).slice(0, 5);
  }, [params]);
  const selected = ids.map((id) => getConfiguration(id)!) as Configuration[];
  const colorOf = (id: string) => SERIES[ids.indexOf(id)];

  const setIds = (next: string[]) => router.replace(`${pathname}?ids=${next.join(",")}`, { scroll: false });
  const [weights, setWeights] = useState<Weights>({ epaRangeMi: 3, zeroToSixtyS: 2, topSpeedMph: 1, cargoCuFt: 1, msrpUsd: 3 });
  const [view, setView] = useState<CameraView>("front");
  const [nonce, setNonce] = useState(0);
  const lowPower = useLowPower();
  const format = useFormatSpec();
  const currency = usePreferences((s) => s.currency);

  const scores = scoreConfigurations(selected, weights);
  const sceneItems = selected.map((c) => {
    const fam = getFamily(c.familyId)!;
    return { id: c.id, label: c.name, body: bodyFor(fam, c.generationId), motors: c.motors, color: colorOf(c.id) };
  });

  const tco = selected.map((c) => {
    const price = c.specs.msrpUsd.value;
    const whMi = c.specs.efficiencyWhPerMi.value;
    if (price === null || whMi === null) return { c, r: null };
    // EPA consumption is already wall-to-wheels, so charging efficiency is 1 here (no double-counting losses).
    return { c, r: simulate({ ...DEFAULT_INPUTS, evPurchasePrice: price, evKwhPerMile: whMi / 1000, chargingEfficiency: 1 }) };
  });

  const barsFor = (key: SpecKey): BarRow[] =>
    selected
      .filter((c) => c.specs[key].value !== null)
      .map((c) => ({
        id: c.id,
        label: c.name,
        value: c.specs[key].value!,
        color: colorOf(c.id),
        display: `${format(key, c.specs[key].value!).value} ${format(key, c.specs[key].value!).unit}`.trim(),
        badge: VERIFICATION_META[c.specs[key].verification].label,
      }));

  return (
    <div className="mx-auto max-w-[1440px] space-y-10 px-4 py-10 sm:px-8">
      {/* Selection */}
      <section aria-label="Selected configurations" className="flex flex-wrap items-center gap-2">
        {selected.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-2 rounded-full bg-white/5 py-1.5 pl-2 pr-1.5 text-sm ring-1 ring-white/10">
            <span className="h-3 w-3 rounded-full" style={{ background: colorOf(c.id) }} aria-hidden="true" />
            {c.name}
            <button
              type="button"
              disabled={ids.length <= 2}
              onClick={() => setIds(ids.filter((x) => x !== c.id))}
              className="rounded-full p-0.5 text-mist hover:text-white disabled:opacity-30"
              aria-label={`Remove ${c.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {ids.length < 5 && (
          <label className="inline-flex items-center gap-2 rounded-full py-1.5 pl-3 pr-2 text-sm text-mist ring-1 ring-dashed ring-white/15">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Add a configuration</span>
            <select
              value=""
              onChange={(e) => e.target.value && setIds([...ids, e.target.value])}
              className="bg-transparent pr-2 text-sm text-fog outline-none"
            >
              <option value="" className="bg-carbon">Add configuration…</option>
              {configurations
                .filter((c) => !ids.includes(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id} className="bg-carbon">
                    {c.name} (MY{c.modelYear}{c.status === "announced" ? ", announced" : ""})
                  </option>
                ))}
            </select>
          </label>
        )}
        <span className="text-xs text-mist">2–5 configurations</span>
      </section>

      {/* Synchronized 3D */}
      <section className="relative h-[46svh] min-h-[320px] overflow-hidden rounded-3xl border border-line" aria-label="Synchronized 3D comparison">
        <WithWebGL loading={<SceneSkeleton />}>
          <CompareScene items={sceneItems} view={view} nonce={nonce} lowPower={lowPower} />
        </WithWebGL>
        <div className="absolute left-4 top-4 z-10 w-[min(360px,calc(100%-2rem))]">
          <Segmented
            label="Shared camera"
            options={[
              { id: "hero", label: "3/4" },
              { id: "front", label: "Front" },
              { id: "side", label: "Side" },
              { id: "top", label: "Top" },
            ]}
            value={view as "hero" | "front" | "side" | "top"}
            onChange={(v) => {
              setView(v);
              setNonce((n) => n + 1);
            }}
          />
        </div>
        <p className="absolute bottom-3 right-4 z-10 font-mono text-[10px] text-mist">True relative scale · one shared camera · procedural representations</p>
      </section>

      {/* Priorities + score */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]" aria-labelledby="prio-h">
        <div className="glass rounded-2xl p-6">
          <h2 id="prio-h" className="text-lg font-semibold">Your priorities</h2>
          <p className="mt-1 text-sm text-mist">Weight what matters to you. Scores are min–max normalised within this selection only.</p>
          <div className="mt-6 space-y-5">
            {SCORABLE.map(({ key, label }) => (
              <div key={key}>
                <div className="mb-2 flex justify-between text-sm">
                  <span id={`w-${key}`}>{label}</span>
                  <span className="font-mono text-xs text-mist">{weights[key] ?? 0} / 5</span>
                </div>
                <Slider.Root
                  className="relative flex h-5 touch-none select-none items-center"
                  value={[weights[key] ?? 0]}
                  min={0}
                  max={5}
                  step={1}
                  onValueChange={([v]) => setWeights((w) => ({ ...w, [key]: v }))}
                  aria-labelledby={`w-${key}`}
                >
                  <Slider.Track className="relative h-1 grow rounded-full bg-white/10">
                    <Slider.Range className="absolute h-full rounded-full bg-volt" />
                  </Slider.Track>
                  <Slider.Thumb className="block h-4 w-4 rounded-full bg-white shadow ring-2 ring-volt focus:outline-none focus-visible:ring-4" aria-labelledby={`w-${key}`} />
                </Slider.Root>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Weighted match</h2>
          <ol className="mt-5 space-y-3">
            {[...scores]
              .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
              .map((s, rank) => {
                const c = getConfiguration(s.id)!;
                return (
                  <li key={s.id} className="flex items-center gap-4">
                    <span className="w-5 font-mono text-xs text-mist">{rank + 1}</span>
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorOf(s.id) }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm">
                        {c.name}
                        {rank === 0 && s.score !== null && <Trophy className="h-3.5 w-3.5 text-amber" aria-label="Top match" />}
                      </span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/5">
                        <span className="block h-full rounded-full" style={{ width: `${s.score ?? 0}%`, background: colorOf(s.id) }} />
                      </span>
                      {s.missing > 0 && <span className="mt-1 block text-[11px] text-amber">{s.missing} weighted metric(s) unpublished; scored on the rest</span>}
                    </span>
                    <span className="w-10 text-right font-semibold tabular-nums">{s.score ?? "—"}</span>
                  </li>
                );
              })}
          </ol>
          <p className="mt-5 text-[11px] leading-relaxed text-mist">
            Announced-target values (next-gen Roadster) are scored as given but are not production-verified.
          </p>
        </div>
      </section>

      {/* Charts */}
      <section className="grid gap-4 md:grid-cols-2" aria-label="Metric charts">
        <MetricBars title="EPA-estimated range" rows={barsFor("epaRangeMi")} />
        <MetricBars title="0–60 mph (shorter is quicker)" rows={barsFor("zeroToSixtyS")} footnote="Tesla figures subtract 1 ft of rollout; independent tests that include rollout are slower." />
        <MetricBars title="Top speed" rows={barsFor("topSpeedMph")} />
        <MetricBars title="US MSRP at time of sourcing" rows={barsFor("msrpUsd")} />
      </section>

      {/* Table */}
      <section aria-labelledby="table-h">
        <h2 id="table-h" className="text-lg font-semibold">Specification table</h2>
        <p className="mt-1 text-sm text-mist">The best value in each row is highlighted. Unpublished values are never estimated.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-carbon">
              <tr>
                <th scope="col" className="hud-label px-4 py-3 text-left font-normal">Metric</th>
                {selected.map((c) => (
                  <th key={c.id} scope="col" className="px-4 py-3 text-left font-medium">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(c.id) }} />{c.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            {TABLE_GROUPS.map((g) => (
              <tbody key={g.title} className="border-t border-line">
                <tr>
                  <th colSpan={selected.length + 1} scope="colgroup" className="hud-label bg-white/[0.02] px-4 py-2 text-left font-normal text-volt">{g.title}</th>
                </tr>
                {g.keys.map((k) => {
                  const best = bestIds(selected, k, g.lower?.includes(k) ?? false);
                  return (
                    <tr key={k} className="border-t border-line/60">
                      <th scope="row" className="px-4 py-3 text-left font-normal text-mist">{SPEC_LABELS[k]}</th>
                      {selected.map((c) => (
                        <td key={c.id} className={cn("px-4 py-3", best.has(c.id) && "bg-volt/[0.07]")}>
                          <SpecValue specKey={k} spec={c.specs[k]} size="sm" />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {g.title === "Practicality" && (
                  <tr className="border-t border-line/60">
                    <th scope="row" className="px-4 py-3 text-left font-normal text-mist">Seats · drivetrain</th>
                    {selected.map((c) => (
                      <td key={c.id} className="px-4 py-3">{c.seats} · {c.drivetrain}</td>
                    ))}
                  </tr>
                )}
                {g.title === "Economics" && (
                  <tr className="border-t border-line/60">
                    <th scope="row" className="px-4 py-3 text-left font-normal text-mist">
                      5-yr cost vs. ICE baseline*
                    </th>
                    {tco.map(({ c, r }) => (
                      <td key={c.id} className="px-4 py-3">
                        {r ? (
                          <span>
                            {money(r.evTotalCost, currency)}
                            <span className={cn("ml-2 text-xs", r.evSavings >= 0 ? "text-ok" : "text-amber")}>
                              {r.evSavings >= 0 ? "−" : "+"}
                              {money(Math.abs(r.evSavings), currency)} vs ICE
                            </span>
                          </span>
                        ) : (
                          <span className="text-mist">Needs price + EPA consumption</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            ))}
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-mist">
          * Purchase price + 5 years of energy and maintenance using the simulator&rsquo;s default assumptions:{" "}
          {DEFAULT_INPUTS.annualMiles.toLocaleString()} mi/yr, each EV&rsquo;s own EPA combined consumption (wall-to-wheels),
          a {DEFAULT_INPUTS.iceMpg} mpg / {money(DEFAULT_INPUTS.icePurchasePrice, "USD")} comparison ICE vehicle. Excludes insurance, depreciation, incentives and financing. Adjust everything on the{" "}
          <a href="/simulation" className="text-cyan hover:underline">simulation page</a>.
        </p>
      </section>
    </div>
  );
}
