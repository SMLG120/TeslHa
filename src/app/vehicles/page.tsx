import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Box } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { families, getConfigurations } from "@/data/vehicles";
import { ConfigQuickSpecs } from "@/features/showroom/config-quick-specs";

export const metadata: Metadata = { title: "Vehicles", description: "The TeslHa fleet: Model S, 3, X, Y and Roadster, with sourced, configuration-level specifications." };

export default function VehiclesPage() {
  return (
    <>
      <PageHeader eyebrow="Fleet showroom" title="The fleet, configuration by configuration">
        Specs differ by trim, model year, wheel size and market, so nothing here is a single &ldquo;model&rdquo; number. Each card lists real US configurations with their own sources.
      </PageHeader>
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-14 sm:px-8">
        {families.map((f) => {
          const configs = getConfigurations(f.id);
          return (
            <article key={f.id} className="glass grid gap-8 rounded-3xl p-6 sm:p-8 lg:grid-cols-[1fr_1.6fr]" aria-labelledby={`${f.id}-h`}>
              <div className="flex flex-col">
                <p className="hud-label">{f.segment} · {f.productionYears}</p>
                <h2 id={`${f.id}-h`} className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{f.name}</h2>
                <p className="mt-2 text-fog">{f.tagline}</p>
                <p className="mt-4 text-sm leading-relaxed text-mist">{f.summary}</p>
                <p className="mt-4 rounded-xl border border-amber/20 bg-amber/5 p-3 text-xs leading-relaxed text-amber">{f.statusNote}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  <Link href={`/vehicles/${f.id}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-volt px-4 text-sm font-medium text-white hover:bg-[#ff4450]">
                    Full specifications <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link href={`/studio/${f.id}`} className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm ring-1 ring-white/15 hover:bg-white/5">
                    <Box className="h-4 w-4" /> 3D Studio
                  </Link>
                </div>
              </div>
              <ConfigQuickSpecs configIds={configs.map((c) => c.id)} />
            </article>
          );
        })}
      </div>
    </>
  );
}
