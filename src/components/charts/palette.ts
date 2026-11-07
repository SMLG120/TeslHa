/**
 * Categorical slots for the dark chart surface (#0b0c0e), assigned in FIXED order and
 * never cycled. Validated with the dataviz palette validator (dark mode, adjacent pairs):
 * all checks pass; worst adjacent CVD ΔE 8.4, normal-vision ΔE 19.3, all ≥ 3:1 contrast.
 * Max 5 slots = the comparison cap.
 */
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"] as const;

export const CHART = {
  grid: "rgba(255,255,255,0.06)",
  axis: "#8b9099",
  text: "#c4c8cf",
  surface: "#0b0c0e",
  ev: "#3987e5",
  ice: "#d95926",
} as const;
