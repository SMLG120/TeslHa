import type { Metadata } from "next";
import { Suspense } from "react";
import { EngineeringLab } from "@/features/engineering/engineering-lab";
import { SceneSkeleton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Engineering Lab",
  description: "Inspect battery, drive units, inverters, thermal, charging and sensor systems in an interactive x-ray and exploded 3D view.",
};

export default function EngineeringPage() {
  return (
    <Suspense fallback={<div className="h-[100svh]"><SceneSkeleton label="Loading engineering lab" /></div>}>
      <EngineeringLab />
    </Suspense>
  );
}
