"use client";

import { useEffect } from "react";
import { usePreferences } from "@/stores/preferences";
import { FX, type Currency } from "@/lib/units";
import { cn } from "@/lib/utils";

export function PreferencesToggle({ className }: { className?: string }) {
  const { units, currency, setUnits, setCurrency } = usePreferences();

  useEffect(() => {
    void usePreferences.persist.rehydrate();
  }, []);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div role="group" aria-label="Unit system" className="flex rounded-full bg-white/5 p-0.5 ring-1 ring-white/10">
        {(["imperial", "metric"] as const).map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={units === u}
            onClick={() => setUnits(u)}
            className={cn("rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-mist transition", units === u && "bg-white/10 text-white")}
          >
            {u === "imperial" ? "mi" : "km"}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="currency">
        Currency
      </label>
      <select
        id="currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        title={currency === "USD" ? "US market prices" : `Converted from US MSRP at ${FX[currency].asOf}. Not a local market price.`}
        className="h-7 rounded-full bg-white/5 px-2.5 font-mono text-[11px] text-fog ring-1 ring-white/10 outline-none"
      >
        {(Object.keys(FX) as Currency[]).map((c) => (
          <option key={c} value={c} className="bg-carbon">
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
