import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SceneSkeleton } from "@/components/ui/primitives";
import { VEHICLE_IDS, getFamily } from "@/data/vehicles";
import { VehicleDetail } from "@/features/showroom/vehicle-detail";

export function generateStaticParams() {
  return VEHICLE_IDS.map((model) => ({ model }));
}

export async function generateMetadata({ params }: PageProps<"/vehicles/[model]">): Promise<Metadata> {
  const { model } = await params;
  const f = getFamily(model);
  return f ? { title: `${f.name} specifications`, description: f.summary } : {};
}

// Params are request data under Cache Components: read them inside a Suspense boundary so
// navigation can show the static shell instantly while the route resolves.
export default function VehiclePage({ params }: PageProps<"/vehicles/[model]">) {
  return (
    <Suspense fallback={<div className="h-[100svh]"><SceneSkeleton /></div>}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: PageProps<"/vehicles/[model]">["params"] }) {
  const { model } = await params;
  if (!getFamily(model)) notFound();
  return <VehicleDetail familyId={model} />;
}
