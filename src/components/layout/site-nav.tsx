"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Wordmark } from "./wordmark";
import { PreferencesToggle } from "./preferences-toggle";
import { cn } from "@/lib/utils";
import { NAV } from "./nav-items";


export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu after navigating (pathname change).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string) =>
    href.startsWith("/studio") ? pathname.startsWith("/studio") : pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || open ? "border-b border-line bg-ink/75 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-volt focus:px-3 focus:py-2">
        Skip to content
      </a>
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-8" aria-label="Primary">
        <Link href="/" className="rounded-sm" aria-label="TeslHa home">
          <Wordmark />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-[13px] tracking-wide text-fog transition-colors hover:text-white",
                  isActive(item.href) && "text-white",
                )}
              >
                {isActive(item.href) && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-white/[0.07] ring-1 ring-white/10" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                )}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <PreferencesToggle className="hidden sm:flex" />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-fog hover:text-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <ul className="flex flex-col gap-1 px-4 py-4">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn("block rounded-lg px-3 py-3 text-base text-fog hover:bg-white/5 hover:text-white", isActive(item.href) && "bg-white/5 text-white")}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="px-7 pb-5 sm:hidden">
              <PreferencesToggle />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
