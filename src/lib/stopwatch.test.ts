import { describe, it } from "vitest";

// Executable spec scaffold for src/lib/stopwatch.ts (task T9 / INS-10).
// Clock is injected (performance.now-style) — use fake timers / a manual
// clock, never real waiting. Turn it.todo into failing tests first.

describe("stopwatch (FR-6.1–FR-6.3)", () => {
  it.todo("GWT-23: started at t=0, stopped at t=83 456 ms -> displays '01:23.45'");
  it.todo("GWT-24: laps at 30 000 and 75 000 ms -> lap1 00:30.00/00:30.00, lap2 00:45.00/01:15.00");
  it.todo("GWT-25: reset clears the display to '00:00.00' and empties the lap list");
});
