import { describe, it } from "vitest";

// Executable spec scaffold for src/lib/tracking.ts (task T4 / INS-9).
// TDD flow: when starting the task, turn the relevant it.todo entries into
// real failing tests (red), then implement until green. The binding scenario
// text lives in docs/spec/given-when-then.md — titles here carry the ID.

describe("haversine distance (FR-2.3)", () => {
  it.todo("GWT-1: (47.4979, 19.0402) to (47.5000, 19.0500) is 772 m ± 1 m");
  it.todo("GWT-2: route distance is the sum of segments (100+250+400 = 750 m ± 1 m)");
});

describe("point filtering (FR-2.2)", () => {
  it.todo("GWT-3: a point with 80 m horizontal accuracy is discarded");
  it.todo("GWT-4: a jump implying 300 km/h is discarded, distance unchanged");
});

describe("speeds (FR-2.5, FR-2.3)", () => {
  it.todo("GWT-5: derived current speed from 100 m / 10 s is 36 km/h");
  it.todo("GWT-6: current speed is 0 when the last point is older than 5 s");
  it.todo("GWT-7: average speed of 45 000 m over 1.5 h is 30.0 km/h");
});
