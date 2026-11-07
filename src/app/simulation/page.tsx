import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { CostSimulator } from "@/components/simulations/cost-simulator";
import { PowertrainSim } from "@/components/simulations/powertrain-sim";

export const metadata: Metadata = {
  title: "Simulation",
  description: "Electric vs gasoline ownership-cost and emissions simulator with documented formulas, plus an interactive powertrain energy-flow simulation.",
};

export default function SimulationPage() {
  return (
    <>
      <PageHeader eyebrow="Electric vs gasoline" title="Run the numbers on your own assumptions">
        EVs don&rsquo;t always win. Change mileage, energy prices, charging mix and grid intensity to see when an EV saves money and emissions, and when a gasoline car is the better choice.
      </PageHeader>
      <div className="mx-auto max-w-[1440px] space-y-16 px-4 py-12 sm:px-8">
        <CostSimulator />
        <PowertrainSim />
      </div>
    </>
  );
}
