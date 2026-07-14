// RallyTrack domain types (docs/spec/plan.md → Storage).
// Convention: distances in meters, times in epoch milliseconds — formatting
// to km / hh:mm:ss happens only at the UI edge (GWT-26, C7).
// Plain serializable types only: everything here goes through IndexedDB's
// structured clone.

export type TourStatus = "active" | "closed";

/** Aggregated totals of a tour. Zeroed while nothing is recorded yet. */
export interface TourTotals {
  /** GPS-measured distance in meters. */
  gpsMeters: number;
  /** GPS distance × calibration factor, in meters. */
  calibratedMeters: number;
  /** Elapsed time in milliseconds. */
  durationMs: number;
  /** Average speed in km/h (display unit fixed by C7). */
  avgKmh: number;
}

/** Calibration in effect for a tour, snapshotted so profile edits or
 *  deletions never rewrite history (FR-1.3, FR-4.4). */
export interface CalibrationSnapshot {
  /** Source profile id, or null for "no calibration". */
  profileId: string | null;
  /** Profile name at snapshot time, or null for "no calibration". */
  profileName: string | null;
  /** Odometer/GPS factor; 1 when no calibration is active. */
  factor: number;
}

export interface Tour {
  /** Client-generated, lexicographically sortable id (ulid). */
  id: string;
  status: TourStatus;
  name: string;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms; null while the tour is active. */
  endedAt: number | null;
  totals: TourTotals;
  calibration: CalibrationSnapshot;
  /** Reference into the itineraries store, if one is attached (FR-5.4). */
  itineraryId?: string;
}

/** One kept GPS point of a tour's route (FR-2.1). */
export interface TrackPoint {
  tourId: string;
  /** Monotonically increasing per tour; part of the primary key. */
  seq: number;
  /** Epoch ms. */
  timestamp: number;
  lat: number;
  lon: number;
  /** Altitude in meters, when the device provides it. */
  ele?: number;
  /** Horizontal accuracy in meters. */
  accuracy: number;
}

export type TripEventKind = "reset" | "correction";

/** Trip-counter reset/correction log entry (FR-3.4). */
export interface TripEvent {
  tourId: string;
  /** Monotonically increasing per tour; part of the primary key. */
  seq: number;
  kind: TripEventKind;
  /** Epoch ms. */
  timestamp: number;
  /** Signed correction in meters; 0 for a reset. */
  deltaMeters: number;
}

/** Named car calibration profile (FR-4.3). */
export interface CarProfile {
  id: string;
  name: string;
  /** Odometer/GPS factor, valid range 0.5–2.0 (FR-4.5). */
  factor: number;
  /** Free-form note, e.g. tyre size. */
  note: string;
  /** Epoch ms. */
  createdAt: number;
}

export type ItineraryKind = "pdf" | "photos";

/** Itinerary content attached to a tour (FR-5.1, FR-5.2). */
export interface Itinerary {
  id: string;
  kind: ItineraryKind;
  /** One PDF blob, or one blob per photo page. */
  blobs: Blob[];
  pageCount: number;
  /** Total size in bytes (50 MB limit enforced before write, FR-5.5). */
  byteSize: number;
}

/** Typed keys of the settings store. Extend as new flags appear. */
export interface Settings {
  activeTourId: string | null;
  activeProfileId: string | null;
}

/** Result of the storage-usage query (FR-8.4). */
export interface StorageUsage {
  usageBytes: number;
  quotaBytes: number;
}
