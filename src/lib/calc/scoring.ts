import type { Configuration, SpecKey } from "@/types/vehicle";

export const SCORABLE: { key: SpecKey; label: string; lowerIsBetter: boolean }[] = [
  { key: "epaRangeMi", label: "Range", lowerIsBetter: false },
  { key: "zeroToSixtyS", label: "Acceleration", lowerIsBetter: true },
  { key: "topSpeedMph", label: "Top speed", lowerIsBetter: false },
  { key: "cargoCuFt", label: "Cargo", lowerIsBetter: false },
  { key: "msrpUsd", label: "Price", lowerIsBetter: true },
];

export type Weights = Partial<Record<SpecKey, number>>;

/**
 * Weighted min–max score in [0, 100] across the selected configurations.
 * Metrics a configuration lacks (null) are excluded from ITS weighted average rather than
 * scored as zero, and the coverage is reported so the UI can flag incomplete scores.
 */
export function scoreConfigurations(configs: Configuration[], weights: Weights) {
  const ranges = new Map<SpecKey, { min: number; max: number }>();
  for (const { key } of SCORABLE) {
    const vals = configs.map((c) => c.specs[key].value).filter((v): v is number => v !== null);
    if (vals.length) ranges.set(key, { min: Math.min(...vals), max: Math.max(...vals) });
  }
  return configs.map((c) => {
    let sum = 0;
    let wsum = 0;
    let missing = 0;
    for (const { key, lowerIsBetter } of SCORABLE) {
      const w = weights[key] ?? 0;
      if (w <= 0) continue;
      const v = c.specs[key].value;
      const r = ranges.get(key);
      if (v === null || !r) {
        missing++;
        continue;
      }
      const norm = r.max === r.min ? 1 : (v - r.min) / (r.max - r.min);
      sum += w * (lowerIsBetter ? 1 - norm : norm);
      wsum += w;
    }
    return { id: c.id, score: wsum > 0 ? Math.round((sum / wsum) * 100) : null, missing };
  });
}

/** For each metric, the id(s) of the best configuration in the selection. */
export function bestIds(configs: Configuration[], key: SpecKey, lowerIsBetter: boolean): Set<string> {
  const vals = configs.filter((c) => c.specs[key].value !== null);
  if (vals.length < 2) return new Set();
  const target = lowerIsBetter ? Math.min(...vals.map((c) => c.specs[key].value!)) : Math.max(...vals.map((c) => c.specs[key].value!));
  return new Set(vals.filter((c) => c.specs[key].value === target).map((c) => c.id));
}
