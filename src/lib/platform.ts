// Platform detection for the /install page (T15 / INS-20, FR-8.5): decide
// which install flow to highlight. Pure user-agent classification so it is
// unit-testable; the page passes `navigator.userAgent` in.

export type Platform = "android-chrome" | "ios-safari" | "other";

export interface InstallFlow {
  /** Which platform section is emphasized; null = generic (e.g. desktop). */
  highlighted: "android" | "ios" | null;
  /** Render order of the two platform sections. */
  order: ["android", "ios"] | ["ios", "android"];
}

/**
 * Classify a user-agent string. Deliberately strict: only browsers whose
 * install flow we actually describe qualify —
 * - "android-chrome": Chrome on Android (fires `beforeinstallprompt`);
 *   Samsung Internet / Edge / Opera also ship a Chrome/ token but use their
 *   own install UI, so they fall back to "other".
 * - "ios-safari": Safari on iPhone/iPad/iPod ("Add to Home Screen" lives in
 *   the Safari share sheet); CriOS/FxiOS/EdgiOS wrappers fall back to
 *   "other". iPadOS in "desktop site" mode reports itself as macOS and is
 *   also classified "other" — the generic view still shows both flows.
 */
export function detectPlatform(userAgent: string): Platform {
  const isIosDevice = /iPhone|iPad|iPod/.test(userAgent);
  if (isIosDevice) {
    const isThirdParty = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(userAgent);
    if (!isThirdParty && /Safari\//.test(userAgent)) return "ios-safari";
    return "other";
  }
  if (/Android/.test(userAgent)) {
    const isRebrandedChromium = /SamsungBrowser|EdgA|OPR\/|UCBrowser|Firefox/.test(
      userAgent,
    );
    if (!isRebrandedChromium && /Chrome\/\d/.test(userAgent)) {
      return "android-chrome";
    }
  }
  return "other";
}

/** The visitor's own platform's flow comes first and is highlighted. */
export function selectInstallFlow(platform: Platform): InstallFlow {
  switch (platform) {
    case "android-chrome":
      return { highlighted: "android", order: ["android", "ios"] };
    case "ios-safari":
      return { highlighted: "ios", order: ["ios", "android"] };
    case "other":
      return { highlighted: null, order: ["android", "ios"] };
  }
}
