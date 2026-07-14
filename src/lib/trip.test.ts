import { describe, it } from "vitest";

// Executable spec scaffold for src/lib/trip.ts (task T7 / INS-14).
// See docs/spec/given-when-then.md; turn it.todo into failing tests first.

describe("trip counter (FR-3.1–FR-3.4)", () => {
  it.todo("GWT-14: reset at 10 000 m of a 25 000 m tour -> trip is 15 000 m, tour total unchanged");
  it.todo("GWT-15: +100 m, +10 m, -10 m corrections on 5 000 m -> 5 100 m, tour total unchanged");
  it.todo("GWT-16: -100 m correction on a 50 m trip clamps to 0 (never negative)");
  it.todo("GWT-17: corrected 10 000 m with factor 1.05 -> calibrated 10 500 m");
  it.todo("GWT-18: reset and correction events are logged with ordered timestamps");
});
