"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useSyncExternalStore,
} from "react";

import {
  INITIAL_INSTALL_PROMPT_STATE,
  reduceInstallPrompt,
} from "@/lib/install-prompt";

// T15 / INS-20 — captures Chrome's `beforeinstallprompt` so the /install
// page can offer a real install button (FR-8.5). The event only fires on
// Chromium browsers when the PWA installability criteria are met; when it
// never fires, `canInstall` stays false and the page explains the manual
// route instead (NFR-3). The event itself lives in a ref (it is not
// serializable state); all decisions go through the pure reducer in
// src/lib/install-prompt.ts, which guarantees the single-use event is never
// offered for a second click (fix round 1, MAJOR-1).

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPromptState {
  /** True while a not-yet-consumed `beforeinstallprompt` event is held. */
  canInstall: boolean;
  /** True after the user dismissed (or the browser rejected) the prompt. */
  dismissed: boolean;
  /** True when already running standalone or `appinstalled` has fired. */
  installed: boolean;
  /** Shows the browser's install dialog (no-op when unavailable). */
  promptInstall: () => Promise<void>;
}

function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useInstallPrompt(): InstallPromptState {
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [state, dispatch] = useReducer(
    reduceInstallPrompt,
    INITIAL_INSTALL_PROMPT_STATE,
  );

  // Hydration-safe "already running standalone" detection (server: false).
  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Chrome would otherwise show its own mini-infobar; we present the
      // prompt from our button instead.
      event.preventDefault();
      promptEventRef.current = event as BeforeInstallPromptEvent;
      dispatch({ type: "prompt-available" });
    };
    const onAppInstalled = () => {
      promptEventRef.current = null;
      dispatch({ type: "app-installed" });
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    // Take the event out immediately: prompt() may be called at most once,
    // so a re-entrant click can never reuse a consumed event.
    const event = promptEventRef.current;
    promptEventRef.current = null;
    if (!event) return;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      dispatch({ type: "prompt-consumed", outcome: choice.outcome });
    } catch {
      // prompt() rejected (e.g. already used or not allowed): degrade to
      // the honest manual-install explanation, never crash (NFR-3).
      dispatch({ type: "prompt-consumed", outcome: "failed" });
    }
  }, []);

  return {
    canInstall: state.promptAvailable,
    dismissed: state.dismissed,
    installed: standalone || state.installed,
    promptInstall,
  };
}
