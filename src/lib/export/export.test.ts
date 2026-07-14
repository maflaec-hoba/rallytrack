import { describe, it } from "vitest";

// Executable spec scaffold for src/lib/export/gpx.ts and csv.ts
// (task T12 / INS-17). Turn it.todo into failing tests first.

describe("GPX export (FR-9.1)", () => {
  it.todo("GWT-27: 3 trackpoints -> valid XML: one <trk>/<trkseg>, 3 <trkpt> with lat/lon/ISO time, name in <name>");
});

describe("CSV export (FR-9.2)", () => {
  it.todo("GWT-28: summary block (name, start, end, duration, GPS+calibrated distance, avg speed, factor) then header + 3 point rows");
});
