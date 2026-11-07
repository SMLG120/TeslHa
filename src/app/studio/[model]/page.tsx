import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SceneSkeleton } from "@/components/ui/primitives";
import { StudioView } from "@/features/showroom/studio-view";
import { VEHICLE_IDS, getFamily } from "@/data/vehicles";

export function generateStaticParams() {
  return VEHICLE_IDS.map((model) => ({ model }));
}

export async function generateMetadata({ params }: PageProps<"/studio/[model]">): Promise<Metadata> {
  const { model } = await params;
  const f = getFamily(model);
  return { title: f ? `${f.name} 3D Studio` : "3D Studio" };
}

// Params are request data under Cache Components: read them inside a Suspense boundary so
// navigation can show the static shell instantly while the route resolves.
export default function StudioPage({ params }: PageProps<"/studio/[model]">) {
  return (
    <Suspense fallback={<div className="h-[100svh]"><SceneSkeleton /></div>}>
      <Resolved params={params} />
    </Suspense>
  );
}

async function Resolved({ params }: { params: PageProps<"/studio/[model]">["params"] }) {
  const { model } = await params;
  if (!getFamily(model)) notFound();
  return <StudioView familyId={model} />;
}
