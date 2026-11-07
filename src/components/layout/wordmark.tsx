import { cn } from "@/lib/utils";

/**
 * Original TeslHa mark: a split chevron "bolt" glyph + wide wordmark with the "Ha" accented.
 * Intentionally unrelated to any manufacturer logo.
 */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="TeslHa">
      <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="tm-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff4a54" />
            <stop offset="1" stopColor="#b3121b" />
          </linearGradient>
        </defs>
        <path d="M4 6h10l-4 8h6L8 28l3-10H5z" fill="url(#tm-g)" />
        <path d="M18 6h10l-5 9h-6z" fill="#e7e9ec" opacity="0.92" />
        <path d="M19 18h7l-9 10z" fill="#e7e9ec" opacity="0.55" />
      </svg>
      {!compact && (
        <span className="font-[family-name:var(--font-display)] text-[15px] tracking-[0.28em]" aria-hidden="true">
          TESL<span className="text-volt">HA</span>
        </span>
      )}
    </span>
  );
}
