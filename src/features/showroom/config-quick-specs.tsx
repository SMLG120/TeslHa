"use client";

import { getConfiguration } from "@/data/vehicles";
import { SPEC_LABELS, SpecValue } from "@/components/ui/spec";
import type { SpecKey } from "@/types/vehicle";

const KEYS: SpecKey[] = ["epaRangeMi", "zeroToSixtyS", "topSpeedMph", "msrpUsd"];

export function ConfigQuickSpecs({ configIds }: { configIds: string[] }) {
  const configs = configIds.map((id) => getConfiguration(id)!);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Key specifications by configuration</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="hud-label py-3 pr-4 font-normal">Configuration</th>
            {KEYS.map((k) => (
              <th key={k} scope="col" className="hud-label py-3 pr-4 font-normal">{SPEC_LABELS[k]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {configs.map((c) => (
            <tr key={c.id} className="border-b border-line/60 last:border-0">
              <th scope="row" className="py-3.5 pr-4 font-medium">
                {c.name}
                <span className="mt-0.5 block font-mono text-[10px] font-normal text-mist">
                  MY{c.modelYear} · {c.drivetrain} · {c.motors} motor{c.motors > 1 ? "s" : ""}
                  {c.status !== "current" && <span className={c.status === "announced" ? "text-cyan" : "text-amber"}> · {c.status}</span>}
                </span>
              </th>
              {KEYS.map((k) => (
                <td key={k} className="py-3.5 pr-4">
                  <SpecValue specKey={k} spec={c.specs[k]} size="sm" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
