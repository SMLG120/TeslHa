import { assetForDesign } from "@/data/assets";
import type { VehicleAsset } from "@/types/asset";
import type { StudioState } from "@/stores/studio";

/** True when the page was opened with `?assets=licensed` (licensed-GLB validation flag). */
export function licensedAssetsRequested(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("assets") === "licensed";
}

/**
 * The licensed GLB to draw instead of the procedural shell, or null. Only the plain exterior view
 * uses it: doors, X-ray, components and the interior explorer need the procedural rig.
 * The scene and the caption both call this, so the on-screen label always matches the geometry.
 */
export function licensedAssetFor(
  design: string,
  s: Pick<StudioState, "view" | "mode" | "showComponents">,
  { enabled, engineering = false }: { enabled: boolean; engineering?: boolean },
): VehicleAsset | null {
  if (!enabled || engineering || s.view === "interior" || s.showComponents || s.mode !== "solid") return null;
  return assetForDesign(design);
}
