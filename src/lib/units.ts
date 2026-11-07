export type UnitSystem = "imperial" | "metric";
export type Currency = "USD" | "EUR" | "GBP" | "CAD";

export const MI_TO_KM = 1.609344;
export const LBFT_PER_NM = 0.737562149;
export const CUFT_TO_L = 28.3168466;

/**
 * Fixed illustrative exchange rates (USD base). Prices in the dataset are US MSRPs; converting
 * them does NOT give the vehicle's local market price (taxes, equipment and pricing differ).
 */
export const FX: Record<Currency, { rate: number; symbol: string; asOf: string }> = {
  USD: { rate: 1, symbol: "$", asOf: "—" },
  EUR: { rate: 0.92, symbol: "€", asOf: "2026-11 (fixed demo rate)" },
  GBP: { rate: 0.78, symbol: "£", asOf: "2026-11 (fixed demo rate)" },
  CAD: { rate: 1.38, symbol: "CA$", asOf: "2026-11 (fixed demo rate)" },
};

export const fmt = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function money(usd: number, currency: Currency = "USD", digits = 0) {
  const { rate, symbol } = FX[currency];
  return `${symbol}${fmt(usd * rate, digits)}`;
}

export function distance(mi: number, units: UnitSystem) {
  return units === "metric" ? { value: mi * MI_TO_KM, unit: "km" } : { value: mi, unit: "mi" };
}

export function speed(mph: number, units: UnitSystem) {
  return units === "metric" ? { value: mph * MI_TO_KM, unit: "km/h" } : { value: mph, unit: "mph" };
}

export function torque(nm: number, units: UnitSystem) {
  return units === "metric" ? { value: nm, unit: "Nm" } : { value: nm * LBFT_PER_NM, unit: "lb-ft" };
}

export function cargo(cuft: number, units: UnitSystem) {
  return units === "metric" ? { value: cuft * CUFT_TO_L, unit: "L" } : { value: cuft, unit: "cu ft" };
}
