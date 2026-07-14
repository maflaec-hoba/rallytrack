// Home screen entry model (T3 / INS-8, FR-1.1): pure decision logic for the
// start-vs-continue primary action. Rendering lives in src/app/page.tsx.

import type { Tour } from "./types";

/** Minimal view of the active tour the home screen needs (full shape: T5 / INS-12). */
export type ActiveTourSummary = {
  id: string;
  name: string;
  /** Epoch ms of the original tour start. */
  startedAt: number;
};

export type HomeEntry = {
  mode: "start" | "continue";
  /** Card title (Hungarian UI copy per constitution C9). */
  title: string;
  /** Card description. */
  description: string;
  /** Label of the primary pill button. */
  ctaLabel: string;
  /** Target of the primary pill button. */
  ctaHref: string;
};

export type QuickLink = {
  href: string;
  label: string;
  description: string;
};

export const HOME_QUICK_LINKS: QuickLink[] = [
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

/**
 * Maps a stored tour (repository result) to the home entry input: only a
 * tour that is still `active` yields a summary — anything else means the
 * home screen offers starting a new tour.
 */
export function toActiveTourSummary(
  tour: Tour | null | undefined,
): ActiveTourSummary | null {
  if (tour === null || tour === undefined || tour.status !== "active") {
    return null;
  }
  return { id: tour.id, name: tour.name, startedAt: tour.startedAt };
}

/**
 * FR-1.1 entry point: with no active tour the home screen offers starting a
 * new one; with an active tour it offers continuing it instead (a second
 * tour can never be started — FR-1.2).
 */
export function getHomeEntry(activeTour: ActiveTourSummary | null): HomeEntry {
  if (activeTour === null) {
    return {
      mode: "start",
      title: "Nincs aktív túra",
      description: "Indíts új túrát — az aktív túra ide tér vissza folytatásra.",
      ctaLabel: "Túra indítása",
      ctaHref: "/tour",
    };
  }
  return {
    mode: "continue",
    title: activeTour.name,
    description: "Túra folyamatban — folytasd ott, ahol abbahagytad.",
    ctaLabel: "Aktív túra folytatása",
    ctaHref: "/tour",
  };
}
