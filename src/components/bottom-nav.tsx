"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, isNavItemActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Inline SVG icons keyed by route — no icon library, per constitution C4.
const NAV_ICONS: Record<string, React.ReactNode> = {
  "/": (
    // Home
    <path d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5" />
  ),
  "/tour": (
    // Compass / active tour
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  "/tours": (
    // History list
    <path d="M4 6h16M4 12h16M4 18h10" />
  ),
  "/profiles": (
    // Car profile
    <>
      <path d="M5 16v3m14-3v3M4 11l1.6-4.2A2 2 0 0 1 7.5 5.5h9a2 2 0 0 1 1.9 1.3L20 11" />
      <rect x="3" y="11" width="18" height="5.5" rx="1.5" />
    </>
  ),
  "/settings": (
    // Settings gear
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3m0 13v3m9.5-9.5h-3m-13 0h-3m16.2-6.7-2.1 2.1m-9.2 9.2-2.1 2.1m13.4 0-2.1-2.1M7.1 7.1 5 5" />
    </>
  ),
};

/**
 * Fixed bottom navigation for the app shell (T3 / INS-8).
 * Mobile-first: capped at max-w-md, ≥48px touch targets, safe-area padding.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Fő navigáció"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[0.6875rem] font-medium",
                  active
                    ? "text-orange-600"
                    : "text-zinc-500 hover:text-zinc-900",
                )}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-6"
                >
                  {NAV_ICONS[item.href]}
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
