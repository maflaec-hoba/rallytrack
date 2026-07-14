import { describe, expect, it } from "vitest";

import {
  INITIAL_INSTALL_PROMPT_STATE,
  reduceInstallPrompt,
  type InstallPromptState,
} from "@/lib/install-prompt";

// T15 / INS-20, fix round 1 (MAJOR-1): a `beforeinstallprompt` event may be
// prompted at most once. The pure state machine guarantees a consumed event
// is never offered again (no second click -> no InvalidStateError), and a
// dismissal degrades to the honest manual-install explanation (NFR-3).

function reduceAll(
  actions: Parameters<typeof reduceInstallPrompt>[1][],
): InstallPromptState {
  return actions.reduce(reduceInstallPrompt, INITIAL_INSTALL_PROMPT_STATE);
}

describe("reduceInstallPrompt", () => {
  it("starts with no prompt available", () => {
    expect(INITIAL_INSTALL_PROMPT_STATE).toEqual({
      promptAvailable: false,
      dismissed: false,
      installed: false,
    });
  });

  it("offers the prompt once beforeinstallprompt fires", () => {
    expect(reduceAll([{ type: "prompt-available" }])).toEqual({
      promptAvailable: true,
      dismissed: false,
      installed: false,
    });
  });

  it("a consumed event is single-use: no second click after dismissal", () => {
    const state = reduceAll([
      { type: "prompt-available" },
      { type: "prompt-consumed", outcome: "dismissed" },
    ]);
    expect(state.promptAvailable).toBe(false);
    expect(state.dismissed).toBe(true);
    expect(state.installed).toBe(false);
  });

  it("acceptance also consumes the event without the dismissed fallback", () => {
    const state = reduceAll([
      { type: "prompt-available" },
      { type: "prompt-consumed", outcome: "accepted" },
    ]);
    expect(state.promptAvailable).toBe(false);
    expect(state.dismissed).toBe(false);
  });

  it("a failed prompt() call consumes the event and degrades honestly", () => {
    const state = reduceAll([
      { type: "prompt-available" },
      { type: "prompt-consumed", outcome: "failed" },
    ]);
    expect(state.promptAvailable).toBe(false);
    expect(state.dismissed).toBe(true);
  });

  it("a fresh beforeinstallprompt after dismissal re-arms the button", () => {
    const state = reduceAll([
      { type: "prompt-available" },
      { type: "prompt-consumed", outcome: "dismissed" },
      { type: "prompt-available" },
    ]);
    expect(state.promptAvailable).toBe(true);
    expect(state.dismissed).toBe(false);
  });

  it("appinstalled wins over everything", () => {
    const state = reduceAll([
      { type: "prompt-available" },
      { type: "prompt-consumed", outcome: "accepted" },
      { type: "app-installed" },
    ]);
    expect(state).toEqual({
      promptAvailable: false,
      dismissed: false,
      installed: true,
    });
  });
});
