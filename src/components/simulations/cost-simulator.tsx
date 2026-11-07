"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { DEFAULT_INPUTS, GASOLINE_KG_CO2_PER_GALLON, simulate, type SimInputs } from "@/lib/calc/ownership";
import { configurations } from "@/data/vehicles";
import { getSource } from "@/data/sources";
import { CHART } from "@/components/charts/palette";
import { NumberField } from "@/components/ui/number-field";
import { usePreferences } from "@/stores/preferences";
import { money } from "@/lib/units";
import { cn } from "@/lib/utils";

const PRICED = configurations.filter((c) => c.specs.msrpUsd.value !== null && c.status !== "announced");

export function CostSimulator() {
  const [i, setI] = useState<SimInputs>(DEFAULT_INPUTS);
  const [preset, setPreset] = useState("model-3-premium-rwd-2026");
  const currency = usePreferences((s) => s.currency);
  const r = useMemo(() => simulate(i), [i]);
  const set = <K extends keyof SimInputs>(k: K) => (v: number) => setI((prev) => ({ ...prev, [k]: v }));
  const m = (v: number, d = 0) => money(v, currency, d);

  const iceWins: string[] = [];
  if (i.icePurchasePrice < i.evPurchasePrice) iceWins.push(`Lower purchase price by ${m(i.evPurchasePrice - i.icePurchasePrice)} in this scenario.`);
  if (r.evSavings < 0) iceWins.push(`Lower ${i.years}-year total cost by ${m(-r.evSavings)} under these assumptions.`);
  if (r.evAnnualEnergyCost > r.iceAnnualEnergyCost) iceWins.push("Cheaper energy per mile: with this electricity price and DC-charging mix, gasoline costs less per mile.");
  if (r.evAnnualKgCo2 > r.iceAnnualKgCo2) iceWins.push("Lower operational CO₂: this grid intensity is high enough that the EV emits more per year.");
  iceWins.push("Refuelling takes minutes. DC fast charging typically takes tens of minutes, and charger access varies by region.");
  iceWins.push("Range is less sensitive to cold weather and towing, and refuelling infrastructure is more widespread in rural areas.");

  return (
    <section className="grid gap-6 lg:grid-cols-[360px_1fr]" aria-labelledby="sim-h">
      <h2 id="sim-h" className="sr-only">EV versus gasoline cost simulator</h2>
      {/* Inputs */}
      <div className="glass space-y-5 rounded-2xl p-6 lg:sticky lg:top-24 lg:self-start">
        <div>
          <label htmlFor="preset" className="mb-1.5 block text-xs text-mist">EV preset (price + EPA consumption)</label>
          <select
            id="preset"
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              const c = PRICED.find((x) => x.id === e.target.value);
              if (c) {
                const whMi = c.specs.efficiencyWhPerMi.value;
                setI((prev) => ({
                  ...prev,
                  evPurchasePrice: c.specs.msrpUsd.value!,
                  // EPA consumption is wall-to-wheels: use it with charging efficiency 1.
                  ...(whMi !== null ? { evKwhPerMile: whMi / 1000, chargingEfficiency: 1 } : {}),
                }));
              }
            }}
            className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm ring-1 ring-white/10"
          >
            {PRICED.map((c) => (
              <option key={c.id} value={c.id} className="bg-carbon">{c.name} (${c.specs.msrpUsd.value!.toLocaleString()})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="EV price ($)" value={i.evPurchasePrice} step={500} min={10000} max={250000} onChange={set("evPurchasePrice")} />
          <NumberField label="ICE price ($)" value={i.icePurchasePrice} step={500} min={10000} max={250000} onChange={set("icePurchasePrice")} />
          <NumberField label="Miles / year" value={i.annualMiles} step={500} min={1000} max={60000} onChange={set("annualMiles")} />
          <NumberField label="Ownership (years)" value={i.years} step={1} min={1} max={15} onChange={set("years")} />
          <NumberField label="EV kWh / mi (from wall)" value={i.evKwhPerMile} step={0.01} min={0.15} max={0.6} onChange={set("evKwhPerMile")} />
          <NumberField label="ICE mpg" value={i.iceMpg} step={1} min={8} max={60} onChange={set("iceMpg")} />
          <NumberField label="Home $/kWh" value={i.homeElectricityPrice} step={0.01} min={0.03} max={1} onChange={set("homeElectricityPrice")} />
          <NumberField label="DC fast $/kWh" value={i.publicDcPrice} step={0.01} min={0.1} max={1.5} onChange={set("publicDcPrice")} />
          <NumberField label="DC charging share" value={i.dcShare} step={0.05} min={0} max={1} onChange={set("dcShare")} />
          <NumberField label="Gasoline $/gal" value={i.gasolinePrice} step={0.05} min={1} max={10} onChange={set("gasolinePrice")} />
          <NumberField label="Grid kg CO₂/kWh" value={Number(i.gridKgCo2PerKwh.toFixed(3))} step={0.01} min={0} max={1.2} onChange={set("gridKgCo2PerKwh")} />
          <NumberField label="Charging efficiency" value={i.chargingEfficiency} step={0.01} min={0.7} max={1} onChange={set("chargingEfficiency")} />
        </div>
        <button type="button" onClick={() => { setI(DEFAULT_INPUTS); setPreset("model-3-premium-rwd-2026"); }} className="w-full rounded-xl py-2 text-xs text-mist ring-1 ring-white/10 hover:bg-white/5">
          Reset to defaults
        </button>
      </div>

      {/* Results */}
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Result label={`${i.years}-yr EV total`} value={m(r.evTotalCost)} />
          <Result label={`${i.years}-yr ICE total`} value={m(r.iceTotalCost)} />
          <Result
            label={r.evSavings >= 0 ? "EV saves" : "EV costs more"}
            value={m(Math.abs(r.evSavings))}
            tone={r.evSavings >= 0 ? "ok" : "warn"}
            sub={r.breakEvenYear !== null ? (r.breakEvenYear === 0 ? "Cheaper from day one" : `Break-even in year ${r.breakEvenYear}`) : `No break-even within ${i.years} years`}
          />
          <Result label="Annual CO₂ (operational)" value={`${(r.evAnnualKgCo2 / 1000).toFixed(1)} t vs ${(r.iceAnnualKgCo2 / 1000).toFixed(1)} t`} sub="EV vs ICE" />
        </div>

        <figure className="rounded-2xl border border-line bg-carbon p-5">
          <figcaption className="mb-3 text-sm font-medium">Cumulative cost of ownership</figcaption>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.timeline} margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="year" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} tickFormatter={(y) => `Yr ${y}`} />
                <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={72} tickFormatter={(v) => m(v)} domain={["auto", "auto"]} />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="glass rounded-lg px-3 py-2 text-xs">
                        <p className="font-medium text-white">Year {label}</p>
                        {payload.map((p) => (
                          <p key={String(p.dataKey)} className="mt-0.5 flex items-center gap-2 text-fog">
                            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                            {p.name}: {m(Number(p.value))}
                          </p>
                        ))}
                      </div>
                    ) : null
                  }
                />
                <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} formatter={(v) => <span style={{ color: CHART.text }}>{v}</span>} />
                <Line type="monotone" dataKey="evCumulative" name="Electric" stroke={CHART.ev} strokeWidth={2} dot={{ r: 4, fill: CHART.ev, stroke: CHART.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="iceCumulative" name="Gasoline" stroke={CHART.ice} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4, fill: CHART.ice, stroke: CHART.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-mist">Gasoline is drawn dashed so the two lines differ by more than colour.</p>
        </figure>

        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[520px] text-sm">
            <caption className="sr-only">Annual operating breakdown</caption>
            <thead className="bg-carbon">
              <tr>
                <th scope="col" className="hud-label px-4 py-3 text-left font-normal">Per year</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Electric</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Gasoline</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Energy used" ev={`${Math.round(r.evAnnualKwhFromGrid).toLocaleString()} kWh (from grid)`} ice={`${Math.round(r.iceAnnualGallons).toLocaleString()} gal`} />
              <Row label="Blended energy price" ev={`${m(r.blendedElectricityPrice, 3)}/kWh`} ice={`${m(i.gasolinePrice, 2)}/gal`} />
              <Row label="Energy cost" ev={m(r.evAnnualEnergyCost)} ice={m(r.iceAnnualEnergyCost)} />
              <Row label="Maintenance" ev={m(r.evAnnualMaintenance)} ice={m(r.iceAnnualMaintenance)} />
              <Row label="Running cost per mile" ev={m(r.evCostPerMile, 3)} ice={m(r.iceCostPerMile, 3)} />
              <Row label="Operational CO₂" ev={`${Math.round(r.evAnnualKgCo2).toLocaleString()} kg`} ice={`${Math.round(r.iceAnnualKgCo2).toLocaleString()} kg`} />
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-amber/25 bg-amber/5 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-amber"><AlertTriangle className="h-4 w-4" /> Where gasoline has the edge</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-fog">
              {iceWins.map((w) => <li key={w}>• {w}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-line p-5">
            <p className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-ok" /> Method &amp; assumptions</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-mist">
              <li>EV grid energy = miles × kWh/mi ÷ charging efficiency. Presets use EPA combined consumption, which already includes charging losses, so efficiency is set to 1. Lower it only if you enter battery-side consumption. Price is blended: home × (1 − DC share) + DC × DC share.</li>
              <li>ICE fuel = miles ÷ mpg. Tailpipe CO₂ = {GASOLINE_KG_CO2_PER_GALLON} kg/gal <Src id="epa-tailpipe-co2" />.</li>
              <li>Default grid intensity ≈ 0.81 lb (0.367 kg) CO₂/kWh, US average <Src id="eia-co2-per-kwh" />. Local grids vary widely.</li>
              <li>Maintenance defaults: $0.061/mi BEV vs $0.101/mi ICE (2019 USD) <Src id="anl-tco-2021" />.</li>
              <li>Excludes insurance, depreciation, financing, taxes, incentives, registration and upstream (manufacturing / fuel-production) emissions.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Src({ id }: { id: string }) {
  const s = getSource(id);
  if (!s) return null;
  return (
    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-cyan hover:underline">
      {s.publisher}<ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}

function Result({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="hud-label">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", tone === "ok" && "text-ok", tone === "warn" && "text-amber")}>{value}</p>
      {sub && <p className="mt-1 text-xs text-mist">{sub}</p>}
    </div>
  );
}

function Row({ label, ev, ice }: { label: string; ev: string; ice: string }) {
  return (
    <tr className="border-t border-line/60">
      <th scope="row" className="px-4 py-3 text-left font-normal text-mist">{label}</th>
      <td className="px-4 py-3 tabular-nums">{ev}</td>
      <td className="px-4 py-3 tabular-nums">{ice}</td>
    </tr>
  );
}
