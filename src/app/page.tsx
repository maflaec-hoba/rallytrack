"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HOME_QUICK_LINKS,
  getHomeEntry,
  toActiveTourSummary,
  type ActiveTourSummary,
} from "@/lib/home";
import { getActiveTour } from "@/services/db";

// Home screen (T3 / INS-8): the FR-1.1 entry point — start a new tour, or
// continue the active one. Reads the persisted active tour from the
// repository (read-only); starting/closing tours is T5 / INS-12.

export default function Home() {
  // Until the repository read resolves, the start variant shows briefly.
  const [activeTour, setActiveTour] = useState<ActiveTourSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    // TODO(T5/INS-12): replace this one-shot read with the tour provider's
    // live state once the tour lifecycle lands.
    getActiveTour()
      .then((tour) => {
        if (!cancelled) setActiveTour(toActiveTourSummary(tour));
      })
      .catch(() => {
        // Unreadable storage degrades to the start variant (NFR-3).
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const entry = getHomeEntry(activeTour);

  return (
    <div className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">RallyTrack</h1>
        <p className="text-sm text-zinc-500">
          Digitális tripmaster veterán autós túrákhoz
        </p>
      </header>

      {/* GWT-8 UI entry point: one primary action, thumb zone, pill, ≥48px. */}
      <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-900">
            {entry.title}
          </CardTitle>
          <CardDescription className="text-sm text-zinc-500">
            {entry.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="h-14 w-full rounded-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
            render={<Link href={entry.ctaHref} />}
          >
            {entry.ctaLabel}
          </Button>
        </CardContent>
      </Card>

      <nav aria-label="Gyorslinkek" className="flex flex-col gap-3">
        {HOME_QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex min-h-14 items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium text-zinc-900">
                {link.label}
              </span>
              <span className="text-xs text-zinc-500">{link.description}</span>
            </span>
            <span aria-hidden="true" className="text-zinc-400">
              ›
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
