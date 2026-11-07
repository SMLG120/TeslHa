import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui/primitives";
import { CompareStudio } from "@/features/comparison/compare-studio";

export const metadata: Metadata = { title: "Compare", description: "Compare two to five exact vehicle configurations side by side in 3D, with sourced specs and weighted scoring." };

export default function ComparePage() {
  return (
    <>
      <PageHeader eyebrow="Comparison studio" title="Configuration against configuration">
        Pick two to five exact configurations. One shared 3D camera shows them at true relative scale, and every table cell keeps its source.
      </PageHeader>
      <Suspense fallback={<div className="mx-auto max-w-[1440px] space-y-4 px-4 py-10 sm:px-8"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-[46svh]" /></div>}>
        <CompareStudio />
      </Suspense>
    </>
  );
}
