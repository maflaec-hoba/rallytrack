import { describe, expect, it } from "vitest";

import type { Tour } from "./types";
import {
  HOME_QUICK_LINKS,
  getHomeEntry,
  toActiveTourSummary,
  type ActiveTourSummary,
} from "./home";

// T3 / INS-8 — home screen entry model (FR-1.1): start a new tour when none
// is active, continue the active one when it exists. The home screen renders
// exactly this structure, so these tests pin the core UI acceptance criteria
// without DOM rendering (node test env, C4: no new test libraries).

const activeTour: ActiveTourSummary = {
  id: "01HTEST",
  name: "Túra 2026-07-14 09:30",
  startedAt: Date.UTC(2026, 6, 14, 7, 30),
};

describe("getHomeEntry", () => {
  it("offers starting a tour when no tour is active", () => {
    const entry = getHomeEntry(null);
    expect(entry.mode).toBe("start");
    expect(entry.title).toBe("Nincs aktív túra");
    expect(entry.ctaLabel).toBe("Túra indítása");
    expect(entry.ctaHref).toBe("/tour");
  });

  it("offers continuing the active tour when one exists", () => {
    const entry = getHomeEntry(activeTour);
    expect(entry.mode).toBe("continue");
    expect(entry.title).toBe("Túra 2026-07-14 09:30");
    expect(entry.ctaLabel).toBe("Aktív túra folytatása");
    expect(entry.ctaHref).toBe("/tour");
  });

  it("never yields a continue entry without an active tour and vice versa", () => {
    expect(getHomeEntry(null).mode).not.toBe("continue");
    expect(getHomeEntry(activeTour).mode).not.toBe("start");
  });
});

describe("toActiveTourSummary", () => {
  const storedTour: Tour = {
    id: "01HTEST",
    status: "active",
    name: "Túra 2026-07-14 09:30",
    startedAt: Date.UTC(2026, 6, 14, 7, 30),
    endedAt: null,
    totals: { gpsMeters: 0, calibratedMeters: 0, durationMs: 0, avgKmh: 0 },
    calibration: { profileId: null, profileName: null, factor: 1 },
  };

  it("maps a stored active tour to the home entry input", () => {
    expect(toActiveTourSummary(storedTour)).toEqual({
      id: "01HTEST",
      name: "Túra 2026-07-14 09:30",
      startedAt: Date.UTC(2026, 6, 14, 7, 30),
    });
  });

  it("maps a missing tour to null", () => {
    expect(toActiveTourSummary(undefined)).toBeNull();
    expect(toActiveTourSummary(null)).toBeNull();
  });

  it("maps a closed tour to null (defense in depth over the repository)", () => {
    expect(
      toActiveTourSummary({ ...storedTour, status: "closed", endedAt: 1 }),
    ).toBeNull();
  });

  it("feeds getHomeEntry end to end: stored active tour -> continue entry", () => {
    const entry = getHomeEntry(toActiveTourSummary(storedTour));
    expect(entry.mode).toBe("continue");
    expect(entry.title).toBe("Túra 2026-07-14 09:30");
  });
});

describe("HOME_QUICK_LINKS", () => {
  it("links to history, profiles and settings", () => {
    expect(HOME_QUICK_LINKS.map((link) => link.href)).toEqual([
      "/tours",
      "/profiles",
      "/settings",
    ]);
  });

  it("has a Hungarian label and description for every link", () => {
    for (const link of HOME_QUICK_LINKS) {
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.description.length).toBeGreaterThan(0);
    }
  });
});
