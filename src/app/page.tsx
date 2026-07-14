import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Home screen (T3 / INS-8): the FR-1.1 entry point for starting / continuing
// a tour — UI entry only, the tour lifecycle logic lands with T5 (INS-12).

const QUICK_LINKS = [
  {
    href: "/tours",
    label: "Túratörténet",
    description: "Lezárt túrák listája",
  },
  {
    href: "/profiles",
    label: "Autóprofilok",
    description: "Kalibráció autónként",
  },
  {
    href: "/settings",
    label: "Beállítások",
    description: "Tárhely és app-infó",
  },
];

export default function Home() {
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
            Nincs aktív túra
          </CardTitle>
          <CardDescription className="text-sm text-zinc-500">
            Indíts új túrát — az aktív túra ide tér vissza folytatásra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="h-14 w-full rounded-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
            render={<Link href="/tour" />}
          >
            Túra indítása
          </Button>
        </CardContent>
      </Card>

      <nav aria-label="Gyorslinkek" className="flex flex-col gap-3">
        {QUICK_LINKS.map((link) => (
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
