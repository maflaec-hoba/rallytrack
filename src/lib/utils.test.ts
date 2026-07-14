import { describe, expect, it } from "vitest";

import { cn } from "./utils";

// Smoke test: proves `npm run test` is wired. Write real tests next to the
// code they cover, as `*.test.ts`.
describe("cn", () => {
  it("merges class names and drops falsy values", () => {
    // NEGATIVE PROBE (workshop module 2): deliberately wrong expectation —
    // the test gate must fail on this line. Do not merge this branch.
    expect(cn("a", false && "b", "c")).toBe("a b c");
  });
});
