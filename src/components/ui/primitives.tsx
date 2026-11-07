import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  primary: "bg-volt text-white hover:bg-[#ff4450] shadow-[0_0_40px_-8px_rgba(255,42,54,0.7)]",
  outline: "border border-white/15 bg-white/[0.03] text-chalk hover:border-white/30 hover:bg-white/[0.06]",
  ghost: "text-fog hover:text-white hover:bg-white/5",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 h-11 text-sm font-medium tracking-wide transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none";

export function ButtonLink({ href, variant = "outline", className, children, ...rest }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({ variant = "outline", className, pressed, ...rest }: ComponentProps<"button"> & { variant?: Variant; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(base, variants[variant], pressed && "border-volt/60 bg-volt/15 text-white", className)}
      {...rest}
    />
  );
}

export function Panel({ className, children, corners = false, ...rest }: ComponentProps<"div"> & { corners?: boolean }) {
  return (
    <div className={cn("glass rounded-2xl", corners && "hud-corners", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, children, className }: { eyebrow: string; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-3xl space-y-4", className)}>
      <p className="hud-label text-volt">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h2>
      {children && <div className="text-base leading-relaxed text-mist sm:text-lg">{children}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="grid-bg border-b border-line">
      <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-32 sm:px-8 sm:pb-16 sm:pt-40">
        <p className="hud-label text-volt">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-base leading-relaxed text-mist sm:text-lg">{children}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/[0.05]", className)} aria-hidden="true" />;
}

export function SceneSkeleton({ label = "Loading 3D scene" }: { label?: string }) {
  return (
    <div className="grid-bg relative flex h-full w-full items-center justify-center overflow-hidden bg-carbon" role="status">
      <div className="absolute inset-x-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-volt/10 to-transparent" />
      <span className="hud-label">{label}…</span>
    </div>
  );
}
