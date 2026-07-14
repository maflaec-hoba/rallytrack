import { describe, expect, it } from "vitest";

import { detectPlatform, selectInstallFlow } from "@/lib/platform";

// T15 / INS-20 — platform detection for the /install page (FR-8.5): the
// visitor's own platform's install flow is highlighted (GWT-40 checks this
// manually on real devices; these tests pin the pure UA classification).

const UA = {
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36",
  androidSamsung:
    "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  androidFirefox:
    "Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0",
  androidEdge:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 EdgA/126.0.2592.56",
  androidOpera:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 OPR/82.0.4342.78",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  ipadSafari:
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.108 Mobile/15E148 Safari/604.1",
  iphoneFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15",
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  desktopSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
};

describe("detectPlatform", () => {
  it("recognises Chrome on Android", () => {
    expect(detectPlatform(UA.androidChrome)).toBe("android-chrome");
  });

  it("does not treat other Android browsers as Android Chrome", () => {
    // They carry a Chrome/ token but do not fire beforeinstallprompt the
    // same way; the generic flow is shown instead (NFR-3 honesty).
    expect(detectPlatform(UA.androidSamsung)).toBe("other");
    expect(detectPlatform(UA.androidEdge)).toBe("other");
    expect(detectPlatform(UA.androidOpera)).toBe("other");
    expect(detectPlatform(UA.androidFirefox)).toBe("other");
  });

  it("recognises Safari on iPhone and iPad", () => {
    expect(detectPlatform(UA.iphoneSafari)).toBe("ios-safari");
    expect(detectPlatform(UA.ipadSafari)).toBe("ios-safari");
  });

  it("does not treat third-party iOS browsers as iOS Safari", () => {
    expect(detectPlatform(UA.iphoneChrome)).toBe("other");
    expect(detectPlatform(UA.iphoneFirefox)).toBe("other");
  });

  it("classifies desktop browsers as other", () => {
    expect(detectPlatform(UA.desktopChrome)).toBe("other");
    expect(detectPlatform(UA.desktopSafari)).toBe("other");
  });

  it("classifies an empty or missing user agent as other", () => {
    expect(detectPlatform("")).toBe("other");
  });
});

describe("selectInstallFlow", () => {
  it("highlights and leads with Android on Android Chrome", () => {
    expect(selectInstallFlow("android-chrome")).toEqual({
      highlighted: "android",
      order: ["android", "ios"],
    });
  });

  it("highlights and leads with iOS on iOS Safari", () => {
    expect(selectInstallFlow("ios-safari")).toEqual({
      highlighted: "ios",
      order: ["ios", "android"],
    });
  });

  it("highlights neither flow on other platforms", () => {
    expect(selectInstallFlow("other")).toEqual({
      highlighted: null,
      order: ["android", "ios"],
    });
  });
});
