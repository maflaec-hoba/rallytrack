import { describe, expect, it } from "vitest";

import { NAV_ITEMS, isNavItemActive } from "./navigation";

// T3 / INS-8 — app shell navigation helper. Pure logic for the bottom nav
// active state (which tab highlights for a given pathname).

describe("NAV_ITEMS", () => {
  it("covers home, tour, history, profiles and settings in thumb order", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/",
      "/tour",
      "/tours",
      "/profiles",
      "/settings",
    ]);
  });
});

describe("isNavItemActive", () => {
  it("marks home active only on the exact root path", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/tour", "/")).toBe(false);
    expect(isNavItemActive("/settings", "/")).toBe(false);
  });

  it("marks a section active on its own path", () => {
    expect(isNavItemActive("/tour", "/tour")).toBe(true);
    expect(isNavItemActive("/tours", "/tours")).toBe(true);
    expect(isNavItemActive("/profiles", "/profiles")).toBe(true);
    expect(isNavItemActive("/settings", "/settings")).toBe(true);
  });

  it("marks a section active on its subroutes", () => {
    expect(isNavItemActive("/tour/navigator", "/tour")).toBe(true);
    expect(isNavItemActive("/tours/abc123", "/tours")).toBe(true);
  });

  it("does not confuse /tour with /tours", () => {
    expect(isNavItemActive("/tours", "/tour")).toBe(false);
    expect(isNavItemActive("/tours/abc123", "/tour")).toBe(false);
    expect(isNavItemActive("/tour", "/tours")).toBe(false);
    expect(isNavItemActive("/tour/navigator", "/tours")).toBe(false);
  });

  it("marks nothing but home for routes outside the nav", () => {
    expect(isNavItemActive("/install", "/")).toBe(false);
    expect(isNavItemActive("/install", "/tour")).toBe(false);
  });
});
