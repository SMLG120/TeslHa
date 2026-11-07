import { useId } from "react";
import type { BodyGeometry } from "@/types/vehicle";
import { surfaceFor } from "@/lib/car-design/surface";

/** Longest body in the line-up; thumbnails share this scale so relative sizes stay true. */
const REF_LENGTH = 5.1;
const VIEW_W = 240;
const VIEW_H = 92;

/**
 * Side-view thumbnail generated from the same parametric surface as the 3D model,
 * so the thumbnail always matches what the studio renders.
 */
export function CarSilhouette({ body, active = false, className }: { body: BodyGeometry; active?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const s = surfaceFor(body);
  const k = (VIEW_W - 16) / REF_LENGTH;
  const ground = VIEW_H - 8;
  const X = (x: number) => VIEW_W / 2 - x * k; // front faces left in thumbnails
  const Y = (y: number) => ground - y * k;
  const { upper, lower } = s.sideProfile(140);
  const d =
    upper.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join("") +
    [...lower].reverse().map(([x, y]) => `L${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join("") +
    "Z";
  const glassTop = (t: number) => s.roofAt(t);
  const g0 = s.glass[0];
  const g1 = s.glass[1];
  const gl: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = g0 + ((g1 - g0) * i) / 60;
    gl.push(`${i ? "L" : "M"}${X(s.xAt(t)).toFixed(1)},${Y(glassTop(t) - 0.04).toFixed(1)}`);
  }
  for (let i = 60; i >= 0; i--) {
    const t = g0 + ((g1 - g0) * i) / 60;
    gl.push(`L${X(s.xAt(t)).toFixed(1)},${Y(s.beltAt(t) + 0.01).toFixed(1)}`);
  }
  const wheels = [s.frontAxleX, s.rearAxleX];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={active ? "#ff5a63" : "#c9ced6"} />
          <stop offset="1" stopColor={active ? "#8f0c13" : "#4a4f57"} />
        </linearGradient>
      </defs>
      <ellipse cx={VIEW_W / 2} cy={ground + 1} rx={(s.L * k) / 2} ry="3" fill="#000" opacity="0.5" />
      <path d={d} fill={`url(#b${id})`} />
      <path d={gl.join("") + "Z"} fill="#0b0d11" opacity="0.92" />
      {wheels.map((x) => (
        <g key={x}>
          <circle cx={X(x)} cy={Y(s.wheelR)} r={s.wheelR * k} fill="#0d0e10" />
          <circle cx={X(x)} cy={Y(s.wheelR)} r={s.wheelR * k * s.design.rimRatio} fill="#9aa0a8" />
          <circle cx={X(x)} cy={Y(s.wheelR)} r={s.wheelR * k * 0.18} fill="#2a2d33" />
        </g>
      ))}
    </svg>
  );
}
