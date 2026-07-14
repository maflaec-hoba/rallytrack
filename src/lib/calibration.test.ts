import { describe, it } from "vitest";

// Executable spec scaffold for src/lib/calibration.ts (task T8 / INS-15).
// See docs/spec/given-when-then.md; turn it.todo into failing tests first.

describe("calibration factor (FR-4.1, FR-4.5)", () => {
  it.todo("GWT-19: GPS 10.00 km vs odometer 10.05 km -> factor 1.005");
  it.todo("GWT-20: factors 0.4 and 2.5 are rejected; 0.51 and 1.99 are accepted");
});

describe("dual distance display (FR-4.2)", () => {
  it.todo("GWT-22: 12 345 m with factor 1.02 -> GPS 12.345 km, calibrated 12.592 km");
});
