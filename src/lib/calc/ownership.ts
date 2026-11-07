/**
 * EV vs ICE operating-cost and emissions model.
 *
 * Deliberately simple and fully transparent: every input is user-adjustable and every
 * constant is cited. It excludes insurance, depreciation, financing, taxes, incentives,
 * registration fees and battery/engine replacement, and it says so in the UI.
 */

/** Tailpipe CO2 from burning one US gallon of gasoline (EPA). */
export const GASOLINE_KG_CO2_PER_GALLON = 8.887;
/** US average CO2 per kWh of electricity generation, 2023 (EIA FAQ): ~0.81 lb/kWh. */
export const DEFAULT_GRID_KG_CO2_PER_KWH = 0.81 * 0.45359237;
/** Per-mile maintenance (Burnham et al., ANL 2021): BEV ≈ $0.061/mi, ICEV ≈ $0.101/mi (2019 USD). */
export const DEFAULT_MAINT_EV_PER_MI = 0.061;
export const DEFAULT_MAINT_ICE_PER_MI = 0.101;

export interface SimInputs {
  annualMiles: number;
  years: number;
  /** Vehicle energy use at the wheel/battery, kWh per mile. */
  evKwhPerMile: number;
  /** Wall-to-battery efficiency (losses in charger, cables, pack). 0–1. */
  chargingEfficiency: number;
  homeElectricityPrice: number; // $/kWh
  publicDcPrice: number; // $/kWh
  /** Share of energy from public DC fast charging. 0–1. */
  dcShare: number;
  iceMpg: number;
  gasolinePrice: number; // $/gal
  evPurchasePrice: number;
  icePurchasePrice: number;
  evMaintPerMile: number;
  iceMaintPerMile: number;
  gridKgCo2PerKwh: number;
}

export interface YearPoint {
  year: number;
  evCumulative: number;
  iceCumulative: number;
}

export interface SimResult {
  evAnnualKwhFromGrid: number;
  iceAnnualGallons: number;
  blendedElectricityPrice: number;
  evAnnualEnergyCost: number;
  iceAnnualEnergyCost: number;
  evAnnualMaintenance: number;
  iceAnnualMaintenance: number;
  evTotalCost: number;
  iceTotalCost: number;
  /** Positive = EV is cheaper over the period. */
  evSavings: number;
  /** First whole year in which cumulative EV cost ≤ ICE cost; null if never within the period. */
  breakEvenYear: number | null;
  evAnnualKgCo2: number;
  iceAnnualKgCo2: number;
  evCostPerMile: number;
  iceCostPerMile: number;
  timeline: YearPoint[];
}

export const DEFAULT_INPUTS: SimInputs = {
  annualMiles: 12000,
  years: 5,
  // Model 3 Premium RWD, MY2026 EPA combined: 24.64 kWh/100 mi. EPA figures already include
  // charging losses (wall-to-wheels), so charging efficiency defaults to 1 to avoid double-counting.
  evKwhPerMile: 0.246,
  chargingEfficiency: 1,
  homeElectricityPrice: 0.17,
  publicDcPrice: 0.45,
  dcShare: 0.2,
  iceMpg: 30,
  gasolinePrice: 3.3,
  evPurchasePrice: 42490,
  icePurchasePrice: 32000,
  evMaintPerMile: DEFAULT_MAINT_EV_PER_MI,
  iceMaintPerMile: DEFAULT_MAINT_ICE_PER_MI,
  gridKgCo2PerKwh: DEFAULT_GRID_KG_CO2_PER_KWH,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function simulate(raw: SimInputs): SimResult {
  const i = {
    ...raw,
    chargingEfficiency: clamp(raw.chargingEfficiency, 0.5, 1),
    dcShare: clamp(raw.dcShare, 0, 1),
    iceMpg: Math.max(raw.iceMpg, 1),
    years: Math.max(Math.round(raw.years), 1),
    annualMiles: Math.max(raw.annualMiles, 0),
  };

  const evAnnualKwhFromGrid = (i.annualMiles * i.evKwhPerMile) / i.chargingEfficiency;
  const blendedElectricityPrice = i.homeElectricityPrice * (1 - i.dcShare) + i.publicDcPrice * i.dcShare;
  const evAnnualEnergyCost = evAnnualKwhFromGrid * blendedElectricityPrice;

  const iceAnnualGallons = i.annualMiles / i.iceMpg;
  const iceAnnualEnergyCost = iceAnnualGallons * i.gasolinePrice;

  const evAnnualMaintenance = i.annualMiles * i.evMaintPerMile;
  const iceAnnualMaintenance = i.annualMiles * i.iceMaintPerMile;

  const evAnnual = evAnnualEnergyCost + evAnnualMaintenance;
  const iceAnnual = iceAnnualEnergyCost + iceAnnualMaintenance;

  const timeline: YearPoint[] = [];
  let breakEvenYear: number | null = null;
  for (let y = 0; y <= i.years; y++) {
    const evCumulative = i.evPurchasePrice + evAnnual * y;
    const iceCumulative = i.icePurchasePrice + iceAnnual * y;
    timeline.push({ year: y, evCumulative, iceCumulative });
    if (breakEvenYear === null && evCumulative <= iceCumulative) breakEvenYear = y;
  }

  const evTotalCost = timeline[timeline.length - 1].evCumulative;
  const iceTotalCost = timeline[timeline.length - 1].iceCumulative;
  const miles = i.annualMiles * i.years;

  return {
    evAnnualKwhFromGrid,
    iceAnnualGallons,
    blendedElectricityPrice,
    evAnnualEnergyCost,
    iceAnnualEnergyCost,
    evAnnualMaintenance,
    iceAnnualMaintenance,
    evTotalCost,
    iceTotalCost,
    evSavings: iceTotalCost - evTotalCost,
    breakEvenYear,
    evAnnualKgCo2: evAnnualKwhFromGrid * i.gridKgCo2PerKwh,
    iceAnnualKgCo2: iceAnnualGallons * GASOLINE_KG_CO2_PER_GALLON,
    evCostPerMile: miles > 0 ? (evTotalCost - i.evPurchasePrice) / miles : 0,
    iceCostPerMile: miles > 0 ? (iceTotalCost - i.icePurchasePrice) / miles : 0,
    timeline,
  };
}

/** Cost to add `miles` of range, given consumption and blended price. */
export function chargeCost(miles: number, kwhPerMile: number, pricePerKwh: number, chargingEfficiency = 0.9) {
  return ((miles * kwhPerMile) / chargingEfficiency) * pricePerKwh;
}
