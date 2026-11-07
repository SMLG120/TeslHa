"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "./palette";

export interface BarRow {
  id: string;
  label: string;
  value: number;
  color: string;
  /** Pre-formatted value for labels/tooltips. */
  display: string;
  badge?: string;
}

/** Horizontal magnitude bars. One mark per configuration, colour = entity identity. */
export function MetricBars({ rows, title, footnote, height }: { rows: BarRow[]; title: string; footnote?: string; height?: number }) {
  if (!rows.length) {
    return (
      <figure className="flex h-full min-h-[200px] flex-col rounded-2xl border border-dashed border-line p-5">
        <figcaption className="text-sm font-medium">{title}</figcaption>
        <p className="m-auto max-w-xs text-center text-sm text-mist">No verified values for this metric in the current selection.</p>
      </figure>
    );
  }
  const h = height ?? Math.max(140, rows.length * 38 + 40);
  return (
    <figure className="rounded-2xl border border-line bg-carbon p-5">
      <figcaption className="mb-3 text-sm font-medium">{title}</figcaption>
      <div style={{ height: h }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 0 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke={CHART.grid} />
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="label" width={170} tick={{ fill: CHART.text, fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const r = payload[0].payload as BarRow;
                return (
                  <div className="glass rounded-lg px-3 py-2 text-xs">
                    <p className="font-medium text-white">{r.label}</p>
                    <p className="mt-0.5 text-fog">
                      {r.display}
                      {r.badge && <span className="ml-2 text-mist">({r.badge})</span>}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive>
              {rows.map((r) => (
                <Cell key={r.id} fill={r.color} />
              ))}
              <LabelList dataKey="display" position="right" fill={CHART.text} fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {footnote && <p className="mt-3 text-[11px] leading-relaxed text-mist">{footnote}</p>}
    </figure>
  );
}
