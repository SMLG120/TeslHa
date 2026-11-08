"use client";
import { create } from "zustand";
import type { ComponentId } from "@/data/components";
import type { CabinLight, InteriorView } from "@/lib/car-design/cabin";

export type CameraView = "hero" | "front" | "rear" | "side" | "top" | "interior";
export type RenderMode = "solid" | "xray" | "wireframe";
export type Environment = "studio" | "night";
export type FlowMode = "off" | "drive" | "regen";

export const PAINTS = [
  { id: "obsidian", label: "Obsidian Black", color: "#0b0c0f", metalness: 0.6, roughness: 0.25 },
  { id: "pearl", label: "Pearl White", color: "#e9eaec", metalness: 0.2, roughness: 0.2 },
  { id: "volt-red", label: "Volt Red", color: "#b3121b", metalness: 0.55, roughness: 0.22 },
  { id: "graphite", label: "Graphite", color: "#3a3d43", metalness: 0.7, roughness: 0.3 },
  { id: "ice-blue", label: "Glacier Blue", color: "#2c4c6e", metalness: 0.6, roughness: 0.25 },
  { id: "silver", label: "Liquid Silver", color: "#9ea3aa", metalness: 0.9, roughness: 0.18 },
] as const;
export type PaintId = (typeof PAINTS)[number]["id"];

interface StudioState {
  paint: PaintId;
  view: CameraView;
  /** Bumped on every view request so re-selecting the same view re-animates the camera. */
  viewNonce: number;
  mode: RenderMode;
  environment: Environment;
  headlights: boolean;
  taillights: boolean;
  doorsOpen: boolean;
  frunkOpen: boolean;
  trunkOpen: boolean;
  exploded: boolean;
  showComponents: boolean;
  selected: ComponentId | null;
  flow: FlowMode;
  autoRotate: boolean;
  /** Camera position inside the cabin when view is "interior". */
  interiorView: InteriorView;
  cabinLight: CabinLight;
  set: (patch: Partial<Omit<StudioState, "set" | "setView" | "setInteriorView" | "reset" | "resetVehicle">>) => void;
  setView: (v: CameraView) => void;
  reset: () => void;
  setInteriorView: (v: InteriorView) => void;
  /** Close panels and clear selection when switching vehicles; keeps paint and scene choices. */
  resetVehicle: () => void;
}

const initial = {
  paint: "volt-red" as PaintId,
  view: "hero" as CameraView,
  viewNonce: 0,
  mode: "solid" as RenderMode,
  environment: "studio" as Environment,
  headlights: true,
  taillights: true,
  doorsOpen: false,
  frunkOpen: false,
  trunkOpen: false,
  exploded: false,
  showComponents: false,
  selected: null,
  flow: "off" as FlowMode,
  autoRotate: false,
  interiorView: "driver" as InteriorView,
  cabinLight: "soft" as CabinLight,
};

export const useStudio = create<StudioState>()((set) => ({
  ...initial,
  set: (patch) => set(patch),
  setView: (view) => set((s) => ({ view, viewNonce: s.viewNonce + 1 })),
  setInteriorView: (interiorView) => set((s) => ({ view: "interior", interiorView, viewNonce: s.viewNonce + 1 })),
  reset: () => set((s) => ({ ...initial, viewNonce: s.viewNonce + 1 })),
  resetVehicle: () =>
    set((s) => ({ doorsOpen: false, frunkOpen: false, trunkOpen: false, selected: null, exploded: false, view: s.view === "interior" ? "interior" : "hero", interiorView: s.view === "interior" && s.interiorView === "rear" ? "driver" : s.interiorView, viewNonce: s.viewNonce + 1 })),
}));
