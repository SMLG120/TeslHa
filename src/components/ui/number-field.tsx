"use client";

export function NumberField({ label, value, onChange, step, min, max, prefix }: { label: string; value: number; onChange: (v: number) => void; step: number; min: number; max: number; prefix?: string }) {
  const id = `nf-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs text-mist">{label}</label>
      <div className="flex items-center rounded-xl bg-white/5 px-3 ring-1 ring-white/10 focus-within:ring-volt/60">
        {prefix && <span className="text-sm text-mist">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          className="h-10 w-full bg-transparent px-1 text-sm tabular-nums outline-none"
        />
      </div>
    </div>
  );
}
