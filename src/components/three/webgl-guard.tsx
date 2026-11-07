"use client";

import { Component, useSyncExternalStore, type ReactNode } from "react";
import { MonitorX } from "lucide-react";

let cached: boolean | null = null;
export function detectWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement("canvas");
    cached = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    cached = false;
  }
  return cached;
}

const noop = () => () => {};
/** `null` during SSR / before hydration, then true/false. */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(noop, detectWebGL, () => null);
}

export function WebGLFallback({ title = "3D view unavailable", detail }: { title?: string; detail?: string }) {
  return (
    <div role="status" className="grid-bg flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-carbon p-8 text-center">
      <MonitorX className="h-8 w-8 text-volt" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-mist">
        {detail ?? "Your browser or device doesn't support WebGL, or it is disabled. All specifications and analytics remain available."}
      </p>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/** Catches WebGL context and asset failures so the rest of the page keeps working. */
export class SceneErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[TeslHa] 3D scene failed:", error);
  }
  render() {
    if (this.state.error) {
      return this.props.fallback ?? <WebGLFallback title="The 3D scene failed to load" detail={this.state.error.message} />;
    }
    return this.props.children;
  }
}

/** Renders children only when WebGL is available; SSR-safe. */
export function WithWebGL({ children, loading }: { children: ReactNode; loading?: ReactNode }) {
  const ok = useWebGLSupport();
  if (ok === null) return <>{loading ?? null}</>;
  if (!ok) return <WebGLFallback />;
  return <SceneErrorBoundary>{children}</SceneErrorBoundary>;
}
