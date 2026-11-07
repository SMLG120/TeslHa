import Link from "next/link";
import { Wordmark } from "./wordmark";
import { NAV } from "./nav-items";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-carbon">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-md space-y-4">
          <Wordmark />
          <p className="text-sm leading-relaxed text-mist">
            An independent engineering visualisation and portfolio project. TeslHa is not affiliated with, endorsed by,
            or sponsored by Tesla, Inc. &ldquo;Tesla&rdquo;, &ldquo;Model S&rdquo;, &ldquo;Model 3&rdquo;, &ldquo;Model X&rdquo;, &ldquo;Model Y&rdquo; and &ldquo;Roadster&rdquo; are trademarks of their
            respective owner and are used here only to identify the vehicles being discussed.
          </p>
        </div>
        <div>
          <p className="hud-label mb-4">Explore</p>
          <ul className="space-y-2 text-sm text-fog">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-white">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="hud-label mb-4">Data policy</p>
          <p className="text-sm leading-relaxed text-mist">
            Every figure carries a verification badge and source link. Values Tesla does not publish are shown as
            &ldquo;not published&rdquo;. They are never estimated. 3D vehicles are procedural representations, not production
            CAD.
          </p>
        </div>
      </div>
    </footer>
  );
}
