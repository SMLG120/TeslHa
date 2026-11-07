import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { AnalyticsDashboard } from "@/features/analytics/analytics-dashboard";

export const metadata: Metadata = { title: "Analytics", description: "Range, acceleration, value and data-coverage dashboards across every sourced configuration." };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader eyebrow="Performance analytics" title="The fleet, by the numbers we can actually verify">
        Every chart draws from the same typed, Zod-validated dataset. The coverage matrix at the bottom shows exactly what is known and what isn&rsquo;t.
      </PageHeader>
      <AnalyticsDashboard />
    </>
  );
}
