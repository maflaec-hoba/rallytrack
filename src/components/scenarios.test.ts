import { describe, it } from "vitest";

// Executable spec scaffold for the component-level GWT scenarios.
// These need @testing-library/react + jsdom + fake-indexeddb, which are
// added when the first owning task starts (see docs/spec/plan.md, Testing
// strategy). When a task begins, MOVE its scenarios into a test file next
// to the component/provider it exercises and turn them into failing tests.

describe("tour lifecycle (T5 / INS-12)", () => {
  it.todo("GWT-8: starting without a name -> active tour persisted as 'Túra YYYY-MM-DD HH:mm' with zeroed metrics");
  it.todo("GWT-9: while a tour is active, no second tour can be started");
  it.todo("GWT-10: active tour survives reload — distance and start time intact, elapsed from original start");
  it.todo("GWT-11: closing persists totals, calibrated distance, duration, route, trip log, factor, itinerary ref");
});

describe("swipe-away resilience (T16 / INS-21)", () => {
  it.todo("GWT-37: pagehide/visibilitychange:hidden flushes the point batch and tour state to storage");
  it.todo("GWT-38: a persisted active tour auto-resumes on app start — watcher restarted, no confirmation");
});

describe("tour history (T6 / INS-13)", () => {
  it.todo("GWT-12: closed tours listed newest-first with name, date, distance, duration");
  it.todo("GWT-13: deleting a tour removes the tour, its points and its itinerary blobs");
});

describe("car profiles (T8 / INS-15)", () => {
  it.todo("GWT-21: selected profile survives reload and its factor drives calibrated displays");
});

describe("itinerary (T11 / INS-11)", () => {
  it.todo("GWT-30: two photos -> pager shows 2/2 after 'next', 'next' disabled on last page");
  it.todo("GWT-31: a 51 MB file is rejected with an error and nothing is stored");
});

describe("navigator view (T10 / INS-16)", () => {
  it.todo("GWT-36: shows exactly trip, calibrated, elapsed, avg, current + reset/correction controls, nothing else interactive");
});

describe("wake lock (T17 / INS-22)", () => {
  it.todo("GWT-39: lock acquired at tour start, held across overlapping stopwatch run, released after the last measurement stops");
});
