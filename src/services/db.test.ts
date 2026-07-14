import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

import type { CarProfile, Itinerary, Tour, TrackPoint, TripEvent } from "@/lib/types";
import {
  closeDb,
  createPointBatcher,
  deleteProfile,
  deleteTour,
  getPoints,
  getProfile,
  getSetting,
  getStorageUsage,
  getTour,
  getTripEvents,
  listProfiles,
  listTours,
  putPoints,
  putProfile,
  putTour,
  putTripEvent,
  putItinerary,
  getItinerary,
  setSetting,
} from "@/services/db";

// Component-level repository tests over fake-indexeddb (docs/spec/plan.md →
// Storage, Testing strategy; task T2 / INS-7). Covers CRUD for the six object
// stores, the GWT-13 storage side, batched point writes (NFR-1) and the
// storage-usage query (FR-8.3/8.4).

function makeTour(overrides: Partial<Tour> = {}): Tour {
  return {
    id: "tour-1",
    status: "active",
    name: "Túra 2026-07-14 09:30",
    startedAt: 1_752_478_200_000,
    endedAt: null,
    totals: { gpsMeters: 0, calibratedMeters: 0, durationMs: 0, avgKmh: 0 },
    calibration: { profileId: null, profileName: null, factor: 1 },
    ...overrides,
  };
}

function makePoint(tourId: string, seq: number, overrides: Partial<TrackPoint> = {}): TrackPoint {
  return {
    tourId,
    seq,
    timestamp: 1_752_478_200_000 + seq * 1000,
    lat: 47.4979 + seq * 0.0001,
    lon: 19.0402 + seq * 0.0001,
    accuracy: 8,
    ...overrides,
  };
}

beforeEach(async () => {
  // Fresh IndexedDB per test: new factory + drop the cached connection.
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  await closeDb();
});

afterEach(async () => {
  await closeDb();
});

describe("tours store", () => {
  it("persists and reads back a tour by id", async () => {
    const tour = makeTour();
    await putTour(tour);
    expect(await getTour("tour-1")).toEqual(tour);
  });

  it("updates an existing tour in place", async () => {
    await putTour(makeTour());
    const closed = makeTour({
      status: "closed",
      endedAt: 1_752_481_800_000,
      totals: { gpsMeters: 12_340, calibratedMeters: 12_587, durationMs: 3_600_000, avgKmh: 12.34 },
    });
    await putTour(closed);
    const stored = await getTour("tour-1");
    expect(stored).toEqual(closed);
    expect(await listTours()).toHaveLength(1);
  });

  it("lists all tours", async () => {
    await putTour(makeTour({ id: "a" }));
    await putTour(makeTour({ id: "b", status: "closed", endedAt: 1 }));
    const tours = await listTours();
    expect(tours.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("getTour returns undefined for a missing id", async () => {
    expect(await getTour("nope")).toBeUndefined();
  });
});

describe("points store", () => {
  it("writes point batches and reads a tour's points ordered by seq", async () => {
    await putPoints([makePoint("t1", 2), makePoint("t1", 1), makePoint("t2", 1)]);
    await putPoints([makePoint("t1", 3)]);
    const points = await getPoints("t1");
    expect(points.map((p) => p.seq)).toEqual([1, 2, 3]);
    expect(points.every((p) => p.tourId === "t1")).toBe(true);
  });

  it("stores the full point shape (epoch ms, meters-domain fields)", async () => {
    const point = makePoint("t1", 1, { ele: 130.5 });
    await putPoints([point]);
    expect(await getPoints("t1")).toEqual([point]);
  });
});

describe("tripEvents store", () => {
  it("logs trip events and reads them back in seq order", async () => {
    const reset: TripEvent = { tourId: "t1", seq: 1, kind: "reset", timestamp: 1_000, deltaMeters: 0 };
    const correction: TripEvent = { tourId: "t1", seq: 2, kind: "correction", timestamp: 2_000, deltaMeters: 10 };
    await putTripEvent(correction);
    await putTripEvent(reset);
    expect(await getTripEvents("t1")).toEqual([reset, correction]);
  });
});

describe("profiles store", () => {
  it("supports profile CRUD", async () => {
    const profile: CarProfile = {
      id: "p1",
      name: "Wartburg 353 (165R13)",
      factor: 1.031,
      note: "165R13 tyres",
      createdAt: 1_752_478_200_000,
    };
    await putProfile(profile);
    expect(await getProfile("p1")).toEqual(profile);

    const edited = { ...profile, factor: 1.02 };
    await putProfile(edited);
    expect(await getProfile("p1")).toEqual(edited);
    expect(await listProfiles()).toEqual([edited]);

    await deleteProfile("p1");
    expect(await getProfile("p1")).toBeUndefined();
    expect(await listProfiles()).toEqual([]);
  });
});

describe("itineraries store", () => {
  it("stores and reads back itinerary blobs", async () => {
    const blob = new Blob(["fake pdf bytes"], { type: "application/pdf" });
    const itinerary: Itinerary = {
      id: "i1",
      kind: "pdf",
      blobs: [blob],
      pageCount: 3,
      byteSize: blob.size,
    };
    await putItinerary(itinerary);
    const stored = await getItinerary("i1");
    expect(stored?.kind).toBe("pdf");
    expect(stored?.pageCount).toBe(3);
    expect(stored?.byteSize).toBe(blob.size);
    expect(stored?.blobs).toHaveLength(1);
    expect(stored?.blobs[0].size).toBe(blob.size);
  });
});

describe("settings store", () => {
  it("stores and reads typed settings values", async () => {
    expect(await getSetting("activeTourId")).toBeUndefined();
    await setSetting("activeTourId", "tour-1");
    await setSetting("activeProfileId", null);
    expect(await getSetting("activeTourId")).toBe("tour-1");
    expect(await getSetting("activeProfileId")).toBeNull();
  });
});

describe("deleting a tour (GWT-13 storage side)", () => {
  it("removes the tour, its points, its trip events and its itinerary blobs — and nothing else", async () => {
    const blob = new Blob(["page"], { type: "image/jpeg" });
    await putItinerary({ id: "i1", kind: "photos", blobs: [blob], pageCount: 1, byteSize: blob.size });
    await putItinerary({ id: "i2", kind: "photos", blobs: [blob], pageCount: 1, byteSize: blob.size });
    await putTour(makeTour({ id: "t1", status: "closed", endedAt: 1, itineraryId: "i1" }));
    await putTour(makeTour({ id: "t2", status: "closed", endedAt: 2, itineraryId: "i2" }));
    await putPoints([makePoint("t1", 1), makePoint("t1", 2), makePoint("t2", 1)]);
    await putTripEvent({ tourId: "t1", seq: 1, kind: "reset", timestamp: 1_000, deltaMeters: 0 });
    await putTripEvent({ tourId: "t2", seq: 1, kind: "reset", timestamp: 1_000, deltaMeters: 0 });

    await deleteTour("t1");

    expect(await getTour("t1")).toBeUndefined();
    expect(await getPoints("t1")).toEqual([]);
    expect(await getTripEvents("t1")).toEqual([]);
    expect(await getItinerary("i1")).toBeUndefined();

    // The other tour's records are untouched.
    expect(await getTour("t2")).toBeDefined();
    expect(await getPoints("t2")).toHaveLength(1);
    expect(await getTripEvents("t2")).toHaveLength(1);
    expect(await getItinerary("i2")).toBeDefined();
  });

  it("deletes a tour without an itinerary", async () => {
    await putTour(makeTour({ id: "t1", status: "closed", endedAt: 1 }));
    await deleteTour("t1");
    expect(await getTour("t1")).toBeUndefined();
  });
});

// Deterministic manual scheduler injected into the batcher — no real sleeps.
function createManualScheduler() {
  let nextId = 1;
  const pending = new Map<number, { fn: () => void; delayMs: number }>();
  return {
    setTimeout(fn: () => void, delayMs: number): number {
      const id = nextId++;
      pending.set(id, { fn, delayMs });
      return id;
    },
    clearTimeout(id: number): void {
      pending.delete(id);
    },
    get pending() {
      return [...pending.values()];
    },
    fireAll(): void {
      const tasks = [...pending.values()];
      pending.clear();
      for (const task of tasks) task.fn();
    },
  };
}

describe("batched point writes (NFR-1: 20 points / 5 s)", () => {
  it("flushes automatically when 20 points are buffered", async () => {
    const writes: TrackPoint[][] = [];
    const scheduler = createManualScheduler();
    const batcher = createPointBatcher({
      write: async (points) => {
        writes.push(points);
      },
      scheduler,
    });

    for (let seq = 1; seq <= 19; seq++) batcher.add(makePoint("t1", seq));
    expect(writes).toHaveLength(0);
    expect(batcher.pendingCount).toBe(19);

    batcher.add(makePoint("t1", 20));
    await batcher.flush();

    expect(writes).toHaveLength(1);
    expect(writes[0]).toHaveLength(20);
    expect(batcher.pendingCount).toBe(0);
  });

  it("flushes after the 5 s timer fires even below 20 points", async () => {
    const writes: TrackPoint[][] = [];
    const scheduler = createManualScheduler();
    const batcher = createPointBatcher({
      write: async (points) => {
        writes.push(points);
      },
      scheduler,
    });

    batcher.add(makePoint("t1", 1));
    batcher.add(makePoint("t1", 2));
    expect(writes).toHaveLength(0);
    expect(scheduler.pending).toHaveLength(1);
    expect(scheduler.pending[0].delayMs).toBe(5000);

    scheduler.fireAll();
    await batcher.flush();

    expect(writes).toHaveLength(1);
    expect(writes[0].map((p) => p.seq)).toEqual([1, 2]);
  });

  it("manual flush writes the remainder immediately and cancels the timer", async () => {
    const writes: TrackPoint[][] = [];
    const scheduler = createManualScheduler();
    const batcher = createPointBatcher({
      write: async (points) => {
        writes.push(points);
      },
      scheduler,
    });

    batcher.add(makePoint("t1", 1));
    await batcher.flush();

    expect(writes).toEqual([[makePoint("t1", 1)]]);
    expect(scheduler.pending).toHaveLength(0);

    // Flushing with an empty buffer writes nothing.
    await batcher.flush();
    expect(writes).toHaveLength(1);
  });

  it("keeps points buffered when a write fails, so nothing is lost (C2)", async () => {
    const writes: TrackPoint[][] = [];
    let failNext = true;
    const scheduler = createManualScheduler();
    const batcher = createPointBatcher({
      write: async (points) => {
        if (failNext) {
          failNext = false;
          throw new Error("boom");
        }
        writes.push(points);
      },
      scheduler,
    });

    batcher.add(makePoint("t1", 1));
    await expect(batcher.flush()).rejects.toThrow("boom");
    expect(batcher.pendingCount).toBe(1);

    await batcher.flush();
    expect(writes).toEqual([[makePoint("t1", 1)]]);
    expect(batcher.pendingCount).toBe(0);
  });

  it("defaults write to the points store", async () => {
    const scheduler = createManualScheduler();
    const batcher = createPointBatcher({ scheduler });
    batcher.add(makePoint("t9", 1));
    await batcher.flush();
    expect(await getPoints("t9")).toEqual([makePoint("t9", 1)]);
  });
});

describe("storage usage query (FR-8.3 / FR-8.4)", () => {
  it("reports usage and quota from the storage estimate", async () => {
    const estimate = vi.fn().mockResolvedValue({ usage: 1_234_567, quota: 50_000_000 });
    expect(await getStorageUsage({ estimate })).toEqual({
      usageBytes: 1_234_567,
      quotaBytes: 50_000_000,
    });
  });

  it("degrades to zeros when the Storage API is unavailable (NFR-3)", async () => {
    expect(await getStorageUsage(undefined)).toEqual({ usageBytes: 0, quotaBytes: 0 });
  });
});
