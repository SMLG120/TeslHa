"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Currency, UnitSystem } from "@/lib/units";

interface PreferencesState {
  units: UnitSystem;
  currency: Currency;
  setUnits: (u: UnitSystem) => void;
  setCurrency: (c: Currency) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
  }
});

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      units: "imperial",
      currency: "USD",
      setUnits: (units) => set({ units }),
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "teslha-prefs", storage: safeStorage, skipHydration: true },
  ),
);
