"use client";

import { useEffect, useRef, useState } from "react";
import { FlaskConical, Pause, Play, RotateCcw } from "lucide-react";
import * as Slider from "@radix-ui/react-slider";
import { GENERIC_EV, step, type PowertrainSample } from "@/lib/calc/powertrain";
import { usePreferences } from "@/stores/preferences";
import { useReducedMotion } from "@/hooks/use-device";
import { MI_TO_KM } from "@/lib/units";
import { cn } from "@/lib/utils";

const INITIAL: PowertrainSample = {
  speedMs: 0,
  socPct: 80,
  energyKwh: 0,
  regenKwhTotal: 0,
  motorPowerKw: 0,
  batteryPowerKw: 0,
  wheelTorqueNm: 0,
  regenPowerKw: 0,
  mode: "coast",
};

const NODES = [
  { id: "battery", label: "Battery", x: 70 },
  { id: "inverter", label: "Inverter", x: 230 },
  { id: "motor", label: "Motor", x: 390 },
  { id: "drivetrain", label: "Gearbox", x: 550 },
  { id: "wheels", label: "Wheels", x: 710 },
] as const;

export function PowertrainSim() {
  const [pedal, setPedal] = useState(0);
  const [running, setRunning] = useState(true);
  const [s, setS] = useState<PowertrainSample>(INITIAL);
  const pedalRef = useRef(pedal);
  const reduced = useReducedMotion();
  const units = usePreferences((p) => p.units);

  useEffect(() => {
    pedalRef.current = pedal;
  }, [pedal]);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setS((prev) => step(prev, pedalRef.current, dt));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const speed = units === "metric" ? s.speedMs * 3.6 : (s.speedMs * 3.6) / MI_TO_KM;
  const flowing = s.mode !== "coast" && Math.abs(s.batteryPowerKw) > 0.5;
  const reverse = s.mode === "regen";
  const color = reverse ? "#3ddc97" : "#ff2a36";
  const dur = Math.max(0.25, 2.2 - Math.abs(s.batteryPowerKw) / 80);

  return (
    <section className="glass rounded-3xl p-6 sm:p-8" aria-labelledby="pt-h">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="hud-label text-volt">Powertrain simulation</p>
          <h2 id="pt-h" className="mt-2 text-2xl font-semibold tracking-tight">Follow the energy</h2>
        </div>
        <p className="flex max-w-sm items-start gap-2 rounded-xl border border-amber/25 bg-amber/5 p-3 text-xs leading-relaxed text-amber">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Educational simulation of a generic {GENERIC_EV.massKg.toLocaleString()} kg, {GENERIC_EV.maxMotorPowerKw} kW single-motor EV. Not a calibrated model of any Tesla vehicle.
        </p>
      </div>

      {/* Flow diagram */}
      <div className="mt-8 overflow-x-auto">
        <svg viewBox="0 0 780 150" className="h-auto w-full min-w-[620px]" role="img" aria-label={reverse ? "Regenerative braking: energy flows from the wheels back to the battery" : flowing ? "Acceleration: energy flows from the battery to the wheels" : "Coasting: no significant energy flow"}>
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {NODES.slice(0, -1).map((n, i) => {
            const next = NODES[i + 1];
            return (
              <g key={n.id}>
                <line x1={n.x + 45} y1={70} x2={next.x - 45} y2={70} stroke="rgba(255,255,255,0.1)" strokeWidth={4} strokeLinecap="round" />
                {flowing && (
                  <line
                    x1={n.x + 45}
                    y1={70}
                    x2={next.x - 45}
                    y2={70}
                    stroke={color}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray="6 14"
                    filter="url(#glow)"
                    style={reduced ? undefined : { animation: `flow ${dur}s linear infinite`, animationDirection: reverse ? "reverse" : "normal" }}
                  />
                )}
              </g>
            );
          })}
          {NODES.map((n) => {
            const label = n.id === "motor" && reverse ? "Generator" : n.label;
            return (
              <g key={n.id}>
                <rect x={n.x - 45} y={42} width={90} height={56} rx={12} fill="#15171a" stroke={flowing ? color : "rgba(255,255,255,0.12)"} strokeOpacity={flowing ? 0.6 : 1} />
                <text x={n.x} y={75} textAnchor="middle" fill="#f3f4f6" fontSize={13} fontFamily="var(--font-geist-sans)">{label}</text>
              </g>
            );
          })}
          <text x={390} y={130} textAnchor="middle" fill="#8b9099" fontSize={11} fontFamily="var(--font-geist-mono)">
            {reverse ? "WHEELS → GENERATOR → INVERTER → BATTERY" : flowing ? "BATTERY → INVERTER → MOTOR → GEARBOX → WHEELS" : "COASTING"}
          </text>
        </svg>
        <style>{`@keyframes flow { to { stroke-dashoffset: -40; } }`}</style>
      </div>

      {/* Pedal */}
      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs text-mist">
          <span>Brake (regen)</span>
          <span id="pedal-l" className="font-mono text-fog">{pedal > 0 ? `Accelerator ${Math.round(pedal * 100)}%` : pedal < 0 ? `Regen ${Math.round(-pedal * 100)}%` : "Coast"}</span>
          <span>Accelerator</span>
        </div>
        <Slider.Root className="relative flex h-6 touch-none select-none items-center" value={[pedal]} min={-1} max={1} step={0.05} onValueChange={([v]) => setPedal(v)} aria-labelledby="pedal-l">
          <Slider.Track className="relative h-1.5 grow rounded-full bg-gradient-to-r from-ok/60 via-white/10 to-volt/70" />
          <Slider.Thumb className="block h-5 w-5 rounded-full bg-white shadow-lg ring-2 ring-white/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-volt" aria-label="Pedal position" />
        </Slider.Root>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: "Full throttle", v: 1 },
            { label: "Cruise", v: 0.12 },
            { label: "Coast", v: 0 },
            { label: "Strong regen", v: -1 },
          ].map((p) => (
            <button key={p.label} type="button" onClick={() => setPedal(p.v)} className={cn("rounded-full px-3 py-1.5 text-xs ring-1 ring-white/10 hover:bg-white/5", pedal === p.v && "bg-white/10")}>
              {p.label}
            </button>
          ))}
          <span className="flex-1" />
          <button type="button" onClick={() => setRunning((r) => !r)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 ring-white/10 hover:bg-white/5">
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {running ? "Pause" : "Resume"}
          </button>
          <button type="button" onClick={() => { setS(INITIAL); setPedal(0); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 ring-white/10 hover:bg-white/5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Telemetry */}
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6" aria-live="off">
        <Tele label="Vehicle speed" value={speed.toFixed(0)} unit={units === "metric" ? "km/h" : "mph"} />
        <Tele label="Motor power" value={s.motorPowerKw.toFixed(0)} unit="kW" tone={s.motorPowerKw < -0.5 ? "ok" : s.motorPowerKw > 0.5 ? "volt" : undefined} />
        <Tele label="Wheel torque" value={s.wheelTorqueNm.toFixed(0)} unit="Nm" />
        <Tele label="Regen power" value={s.regenPowerKw.toFixed(0)} unit="kW" tone={s.regenPowerKw > 0.5 ? "ok" : undefined} />
        <Tele label="State of charge" value={s.socPct.toFixed(2)} unit="%" />
        <Tele label="Net energy used" value={(s.energyKwh * 1000).toFixed(0)} unit="Wh" sub={`${(s.regenKwhTotal * 1000).toFixed(0)} Wh recovered`} />
      </dl>
    </section>
  );
}

function Tele({ label, value, unit, sub, tone }: { label: string; value: string; unit: string; sub?: string; tone?: "ok" | "volt" }) {
  return (
    <div className="bg-carbon p-4">
      <dt className="hud-label">{label}</dt>
      <dd className={cn("mt-2 text-2xl font-semibold tabular-nums", tone === "ok" && "text-ok", tone === "volt" && "text-volt")}>
        {value}
        <span className="ml-1 text-xs font-normal text-mist">{unit}</span>
      </dd>
      {sub && <p className="mt-1 text-[11px] text-mist">{sub}</p>}
    </div>
  );
}
