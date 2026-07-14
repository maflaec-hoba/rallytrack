// IndexedDB repository for RallyTrack (docs/spec/plan.md → Storage).
// One database, six object stores, accessed through the `idb` promise
// wrapper. All values are the plain serializable types of src/lib/types.ts:
// distances in meters, times in epoch ms (FR-8.3, C2).

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
  CarProfile,
  Itinerary,
  Settings,
  StorageUsage,
  Tour,
  TrackPoint,
  TripEvent,
} from "@/lib/types";

export const DB_NAME = "rallytrack";
const DB_VERSION = 1;

interface RallyTrackDB extends DBSchema {
  tours: { key: string; value: Tour };
  points: { key: [string, number]; value: TrackPoint };
  tripEvents: { key: [string, number]; value: TripEvent };
  profiles: { key: string; value: CarProfile };
  itineraries: { key: string; value: Itinerary };
  settings: { key: keyof Settings; value: Settings[keyof Settings] };
}

let dbPromise: Promise<IDBPDatabase<RallyTrackDB>> | null = null;

function getDb(): Promise<IDBPDatabase<RallyTrackDB>> {
  dbPromise ??= openDB<RallyTrackDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("tours", { keyPath: "id" });
      db.createObjectStore("points", { keyPath: ["tourId", "seq"] });
      db.createObjectStore("tripEvents", { keyPath: ["tourId", "seq"] });
      db.createObjectStore("profiles", { keyPath: "id" });
      db.createObjectStore("itineraries", { keyPath: "id" });
      db.createObjectStore("settings");
    },
  });
  return dbPromise;
}

/** Close the cached connection (app teardown / test isolation). */
export async function closeDb(): Promise<void> {
  if (dbPromise === null) return;
  const pending = dbPromise;
  dbPromise = null;
  (await pending).close();
}

/** Key range covering every record of one tour in a [tourId, seq] store. */
function tourRange(tourId: string): IDBKeyRange {
  return IDBKeyRange.bound([tourId, -Infinity], [tourId, Infinity]);
}

// --- tours -----------------------------------------------------------------

export async function putTour(tour: Tour): Promise<void> {
  await (await getDb()).put("tours", tour);
}

export async function getTour(id: string): Promise<Tour | undefined> {
  return (await getDb()).get("tours", id);
}

export async function listTours(): Promise<Tour[]> {
  return (await getDb()).getAll("tours");
}

/**
 * Delete a tour and everything that belongs to it — points, trip events and
 * the attached itinerary blobs — in one transaction (GWT-13 storage side).
 */
export async function deleteTour(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["tours", "points", "tripEvents", "itineraries"], "readwrite");
  const tour = await tx.objectStore("tours").get(id);
  await Promise.all([
    tx.objectStore("tours").delete(id),
    tx.objectStore("points").delete(tourRange(id)),
    tx.objectStore("tripEvents").delete(tourRange(id)),
    ...(tour?.itineraryId !== undefined ? [tx.objectStore("itineraries").delete(tour.itineraryId)] : []),
  ]);
  await tx.done;
}

// --- points ----------------------------------------------------------------

/** Write a batch of points in a single transaction (NFR-1). */
export async function putPoints(points: TrackPoint[]): Promise<void> {
  if (points.length === 0) return;
  const db = await getDb();
  const tx = db.transaction("points", "readwrite");
  for (const point of points) void tx.store.put(point);
  await tx.done;
}

/** All kept points of a tour, ordered by seq (IndexedDB key order). */
export async function getPoints(tourId: string): Promise<TrackPoint[]> {
  return (await getDb()).getAll("points", tourRange(tourId));
}

// --- tripEvents ------------------------------------------------------------

export async function putTripEvent(event: TripEvent): Promise<void> {
  await (await getDb()).put("tripEvents", event);
}

/** All trip events of a tour, ordered by seq (FR-3.4). */
export async function getTripEvents(tourId: string): Promise<TripEvent[]> {
  return (await getDb()).getAll("tripEvents", tourRange(tourId));
}

// --- profiles ----------------------------------------------------------------

export async function putProfile(profile: CarProfile): Promise<void> {
  await (await getDb()).put("profiles", profile);
}

export async function getProfile(id: string): Promise<CarProfile | undefined> {
  return (await getDb()).get("profiles", id);
}

export async function listProfiles(): Promise<CarProfile[]> {
  return (await getDb()).getAll("profiles");
}

export async function deleteProfile(id: string): Promise<void> {
  await (await getDb()).delete("profiles", id);
}

// --- itineraries -------------------------------------------------------------

export async function putItinerary(itinerary: Itinerary): Promise<void> {
  await (await getDb()).put("itineraries", itinerary);
}

export async function getItinerary(id: string): Promise<Itinerary | undefined> {
  return (await getDb()).get("itineraries", id);
}

export async function deleteItinerary(id: string): Promise<void> {
  await (await getDb()).delete("itineraries", id);
}

// --- settings ----------------------------------------------------------------

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K] | undefined> {
  return (await getDb()).get("settings", key) as Promise<Settings[K] | undefined>;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await (await getDb()).put("settings", value, key);
}

// --- storage usage -----------------------------------------------------------

type StorageEstimator = Pick<StorageManager, "estimate">;

/**
 * Current storage usage vs quota (FR-8.3 / FR-8.4). Degrades to zeros when
 * the Storage API is unavailable (NFR-3).
 */
export async function getStorageUsage(
  storage: StorageEstimator | undefined = typeof navigator === "undefined" ? undefined : navigator.storage,
): Promise<StorageUsage> {
  if (storage?.estimate === undefined) return { usageBytes: 0, quotaBytes: 0 };
  const { usage = 0, quota = 0 } = await storage.estimate();
  return { usageBytes: usage, quotaBytes: quota };
}

// --- batched point writer ------------------------------------------------------

/** Timer surface of the batcher, injectable for deterministic tests. */
export interface BatchScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface PointBatcherOptions {
  /** Destination of a flushed batch. Defaults to the points store. */
  write?: (points: TrackPoint[]) => Promise<void>;
  /** Flush when this many points are buffered. Default 20 (NFR-1). */
  maxBatchSize?: number;
  /** Flush this long after the first buffered point. Default 5000 ms. */
  maxDelayMs?: number;
  scheduler?: BatchScheduler;
}

export interface PointBatcher {
  /** Buffer a point; triggers a flush when the batch is full. */
  add(point: TrackPoint): void;
  /** Write everything buffered now (e.g. on pagehide, FR-2.8). */
  flush(): Promise<void>;
  /** Number of points waiting to be written. */
  readonly pendingCount: number;
}

const defaultScheduler: BatchScheduler = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle as Parameters<typeof clearTimeout>[0]),
};

/**
 * Write-behind buffer for GPS points: flushes to storage every 20 points or
 * 5 seconds, whichever comes first (NFR-1). On a failed write the batch is
 * re-queued so points are never dropped (C2).
 */
export function createPointBatcher(options: PointBatcherOptions = {}): PointBatcher {
  const { write = putPoints, maxBatchSize = 20, maxDelayMs = 5000, scheduler = defaultScheduler } = options;

  let buffer: TrackPoint[] = [];
  let timer: unknown = null;
  // Serializes writes so batches reach storage in recording order.
  let tail: Promise<void> = Promise.resolve();

  function clearTimer(): void {
    if (timer === null) return;
    scheduler.clearTimeout(timer);
    timer = null;
  }

  function scheduleFlush(): void {
    if (timer !== null) return;
    timer = scheduler.setTimeout(() => {
      timer = null;
      void flushNow().catch(() => undefined);
    }, maxDelayMs);
  }

  function flushNow(): Promise<void> {
    clearTimer();
    if (buffer.length === 0) return tail;
    const batch = buffer;
    buffer = [];
    const attempt = tail.then(() =>
      write(batch).catch((error: unknown) => {
        // Keep failed points at the front of the buffer and re-arm the
        // timer, so a transient failure is retried even when no further
        // point ever arrives — never drop data (C2, NFR-1).
        buffer = [...batch, ...buffer];
        scheduleFlush();
        throw error;
      }),
    );
    // The shared chain swallows the failure (the flush() caller still sees
    // it via `attempt`), so an unawaited timer flush can't crash anything.
    tail = attempt.catch(() => undefined);
    return attempt;
  }

  return {
    add(point: TrackPoint): void {
      buffer.push(point);
      if (buffer.length >= maxBatchSize) {
        void flushNow().catch(() => undefined);
      } else {
        scheduleFlush();
      }
    },
    flush(): Promise<void> {
      return flushNow();
    },
    get pendingCount(): number {
      return buffer.length;
    },
  };
}
