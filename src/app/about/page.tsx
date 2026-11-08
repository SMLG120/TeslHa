import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { SOURCES } from "@/data/sources";
import { configurations } from "@/data/vehicles";

export const metadata: Metadata = { title: "About", description: "How TeslHa is built: architecture, 3D pipeline, data policy, sources and limitations." };

const STACK = [
  ["Framework", "Next.js 16 App Router, React 19, TypeScript strict"],
  ["3D", "Three.js r187, React Three Fiber 9, drei, postprocessing (Bloom, Vignette)"],
  ["UI", "Tailwind CSS 4, Radix primitives, Motion, Lucide"],
  ["State & data", "Zustand stores; Zod-validated typed datasets"],
  ["Charts", "Recharts with a CVD-validated categorical palette"],
  ["Testing", "Vitest + Testing Library (unit), Playwright (E2E)"],
];

export default function AboutPage() {
  const total = configurations.length * 10;
  const nulls = configurations.reduce((n, c) => n + Object.values(c.specs).filter((s) => s.value === null).length, 0);
  return (
    <>
      <PageHeader eyebrow="About the project" title="An engineering visualisation platform, built to be honest about what it knows">
        TeslHa is an independent portfolio project. It is not affiliated with, endorsed by, or sponsored by Tesla, Inc.
      </PageHeader>
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-14 sm:px-8 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="arch-h" className="space-y-6">
          <h2 id="arch-h" className="text-2xl font-semibold">Architecture</h2>
          <dl className="divide-y divide-line rounded-2xl border border-line">
            {STACK.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[130px_1fr] gap-4 px-5 py-3 text-sm">
                <dt className="text-mist">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="space-y-3 text-sm leading-relaxed text-fog">
            <h3 className="text-lg font-semibold text-white">3D asset pipeline</h3>
            <p>
              No accurate, legally licensed production models with separable doors, interiors and drivetrain components were available for this project. So no third-party models are used: every vehicle is generated at runtime by a <strong>parametric car-design system</strong>. Each body (Model S, Model 3, Model X, Model Y and both Roadster generations) has its own beltline, roof, plan-view and cross-section curves. These are lofted to the published length, width, height, wheelbase and wheel size, and the system cuts out wheel arches, doors (including falcon-wing doors), frunk and trunk or liftgate openings. Lights, wheels with distinct rim styles and ten schematic engineering components complete each car. Each car also has an explorable cabin built from a per-model specification taken from tesla.com: steering wheel or yoke, centre-screen size, driver and rear displays, ambient lighting, seat rows and upholstery. Every point that could not be verified is listed in the repository&rsquo;s vehicle reference.
            </p>
            <p>
              Every car is labelled &ldquo;procedural representation &middot; not manufacturer CAD&rdquo;. The shapes are stylised approximations, not production surfaces. Each family has an <code className="text-cyan">asset</code> slot in its data definition: a licensed, Draco/Meshopt-compressed GLB with KTX2 textures can be registered there to replace the procedural body.
            </p>
            <h3 className="pt-2 text-lg font-semibold text-white">Rendering performance</h3>
            <p>
              3D scenes are code-split with <code className="text-cyan">next/dynamic</code> and never server-rendered. Device pixel ratio is capped and adapted by a performance monitor, which also steps quality down (ambient occlusion → bloom only → no post-processing). The studio environment is baked once into a PMREM map, so there is no per-frame cube rendering and no HDR download. Geometries and materials are disposed on unmount. Mobile and coarse-pointer devices get reduced geometry. A WebGL check and error boundary fall back to static content.
            </p>
          </div>
        </section>

        <section aria-labelledby="data-h" className="space-y-6">
          <h2 id="data-h" className="text-2xl font-semibold">Data policy</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-fog">
            <li><strong className="text-white">Configuration-level.</strong> Specs belong to an exact model year, trim, drivetrain, wheel size and market, never to a whole model.</li>
            <li><strong className="text-white">No invented numbers.</strong> {nulls} of {total} spec slots are intentionally empty because Tesla does not publish them (e.g. pack capacity, most horsepower figures).</li>
            <li><strong className="text-white">Verification levels.</strong> <span className="text-ok">Tesla / EPA</span> = primary source checked. <span className="text-amber">Secondary</span> = compiled from third-party reporting and pending a primary re-check. <span className="text-cyan">Target</span> = announced claim for an unreleased vehicle.</li>
            <li><strong className="text-white">Status as of November 2026.</strong> Model S and Model X production ended in 2026. The next-generation Roadster has not entered production, and its figures are 2017 targets.</li>
          </ul>
          <h3 className="pt-2 text-lg font-semibold">Sources</h3>
          <ul className="space-y-2 text-sm">
            {Object.values(SOURCES).map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 text-cyan hover:underline">
                  <span>{s.publisher}: {s.title}</span>
                  <ExternalLink className="mt-1 h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
                <span className="block text-[11px] text-mist">Accessed {s.accessed}</span>
              </li>
            ))}
          </ul>
          <h3 className="pt-2 text-lg font-semibold">Known limitations</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-mist">
            <li>Vehicle bodies are stylised approximations, not production surfaces.</li>
            <li>Component placement in the Engineering Lab is schematic.</li>
            <li>EPA range and consumption were checked against fueleconomy.gov and performance, cargo and charging figures against tesla.com on 7 Nov 2026. Prices and some top speeds remain &ldquo;secondary&rdquo;, because tesla.com shows financing offers rather than a stable cash price.</li>
            <li>Currency conversion uses fixed demo rates and does not represent local market pricing.</li>
            <li>The powertrain simulation is a generic educational model, not calibrated to any Tesla.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
