// T15 / INS-20, fix round 1 (MAJOR-1) — pure state machine behind
// useInstallPrompt. A captured `beforeinstallprompt` event may be prompted
// at most once; this reducer guarantees a consumed event is never offered
// for a second click (which would reject with InvalidStateError) and that a
// dismissal/failure degrades to the honest manual-install explanation
// instead of a re-clickable button (NFR-3).

export interface InstallPromptState {
  /** A not-yet-consumed `beforeinstallprompt` event is held. */
  promptAvailable: boolean;
  /** The user dismissed (or the browser rejected) the last prompt. */
  dismissed: boolean;
  /** Running standalone or `appinstalled` fired. */
  installed: boolean;
}

export type InstallPromptAction =
  | { type: "prompt-available" }
  | { type: "prompt-consumed"; outcome: "accepted" | "dismissed" | "failed" }
  | { type: "app-installed" };

export const INITIAL_INSTALL_PROMPT_STATE: InstallPromptState = {
  promptAvailable: false,
  dismissed: false,
  installed: false,
};

export function reduceInstallPrompt(
  state: InstallPromptState,
  action: InstallPromptAction,
): InstallPromptState {
  switch (action.type) {
    case "prompt-available":
      // A fresh event re-arms the button even after an earlier dismissal.
      return { ...state, promptAvailable: true, dismissed: false };
    case "prompt-consumed":
      // Single-use: the event is spent regardless of the outcome.
      return {
        ...state,
        promptAvailable: false,
        dismissed: action.outcome !== "accepted",
      };
    case "app-installed":
      return { promptAvailable: false, dismissed: false, installed: true };
  }
}
