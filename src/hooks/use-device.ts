"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
}

export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(subscribe(query), () => window.matchMedia(query).matches, () => serverValue);
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
/** Coarse pointer or narrow viewport → simplified 3D. */
export const useLowPower = () => useMediaQuery("(max-width: 767px), (pointer: coarse)");
