import Link from "next/link";
import { ArrowUpRight, BatteryCharging, Gauge, Recycle, Zap } from "lucide-react";
import { HomeHero } from "@/features/showroom/home-hero";
import { FleetStats } from "@/features/showroom/fleet-stats";
import { ButtonLink, Panel, SectionHeading } from "@/components/ui/primitives";
import { COMPONENTS } from "@/data/components";
import { families } from "@/data/vehicles";

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <section className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8 sm:py-32" aria-labelledby="fleet-h">
        <SectionHeading eyebrow="01 — The fleet" title={<span id="fleet-h">Five vehicle families. One electric architecture.</span>}>
          Every figure below comes from a dated, cited source with a verification badge. Hover any badge to see where a number comes from and how far it can be trusted.
        </SectionHeading>
        <FleetStats />
      </section>

      <section className="border-y border-line bg-carbon" aria-labelledby="eng-h">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <SectionHeading eyebrow="02 — Engineering lab" title={<span id="eng-h">See through the body. Follow the electrons.</span>}>
            Switch the shell to x-ray, explode the drivetrain, and watch energy flow from the pack through the inverter to the wheels. Then reverse it under regenerative braking.
            <div className="mt-8">
              <ButtonLink href="/engineering" variant="primary">
                Open the Engineering Lab <ArrowUpRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </SectionHeading>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {COMPONENTS.map((c, i) => (
              <li key={c.id} className="bg-carbon p-5 transition-colors hover:bg-graphite">
                <Link href={`/engineering?component=${c.id}`} className="block">
                  <span className="font-mono text-[11px] text-volt">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-1 font-medium">{c.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-mist">{c.summary}</p>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8 sm:py-32" aria-labelledby="why-h">
        <SectionHeading eyebrow="03 — Electric vs combustion" title={<span id="why-h">Where EVs win. And where they don&rsquo;t.</span>}>
          An honest comparison. EVs convert far more of their stored energy into motion, but purchase price, charging access and long-distance refuelling time can still favour combustion vehicles.
        </SectionHeading>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, title: "Energy efficiency", body: "Electric drive units convert most of their input energy into wheel work. Combustion engines reject most of their fuel energy as heat." },
            { icon: Gauge, title: "Instant torque", body: "Full motor torque is available from standstill through a single-speed gearbox, with no gear changes or turbo lag." },
            { icon: Recycle, title: "Regeneration", body: "Braking energy is partly recovered into the battery. A combustion car turns it all into brake heat." },
            { icon: BatteryCharging, title: "Trade-off: refuelling", body: "Filling a tank takes minutes. Even a fast DC session takes far longer, and charger access varies by region.", warn: true },
          ].map(({ icon: Icon, title, body, warn }) => (
            <Panel key={title} className="p-6" corners>
              <Icon className={warn ? "h-6 w-6 text-amber" : "h-6 w-6 text-volt"} aria-hidden="true" />
              <p className="mt-4 font-medium">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-mist">{body}</p>
            </Panel>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/simulation" variant="primary">
            Run the cost simulator <ArrowUpRight className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink href="/analytics">View analytics dashboard</ButtonLink>
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="studio-h">
        <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8">
          <SectionHeading eyebrow="04 — 3D studio" title={<span id="studio-h">Step inside each vehicle</span>} />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {families.map((f) => (
              <Link
                key={f.id}
                href={`/studio/${f.id}`}
                className="group glass flex flex-col justify-between rounded-2xl p-5 transition hover:border-volt/40"
              >
                <span className="hud-label">{f.segment}</span>
                <span className="mt-10 flex items-end justify-between">
                  <span className="text-xl font-semibold">{f.name}</span>
                  <ArrowUpRight className="h-5 w-5 text-mist transition group-hover:text-volt" aria-hidden="true" />
                </span>
                <span className="mt-1 font-mono text-[11px] text-mist">{f.rigLevel === "full" ? "Reference rig · full interactions" : "Shared rig"}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
