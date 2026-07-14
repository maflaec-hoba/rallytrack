"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// T15 / INS-20 — captures Chrome's `beforeinstallprompt` so the /install
// page can offer a real install button (FR-8.5). The event only fires on
// Chromium browsers when the PWA installability criteria are met; when it
// never fires, `canInstall` stays false and the page explains the manual
// route instead (NFR-3).

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPromptState {
  /** True once `beforeinstallprompt` has fired and the prompt is usable. */
  canInstall: boolean;
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
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [appInstalledFired, setAppInstalledFired] = useState(false);

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
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setAppInstalledFired(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setPromptEvent(null);
    }
  }, [promptEvent]);

  return {
    canInstall: promptEvent !== null,
    installed: standalone || appInstalledFired,
    promptInstall,
  };
}
