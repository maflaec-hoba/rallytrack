"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useInstallPrompt } from "@/components/use-install-prompt";
import { detectPlatform, selectInstallFlow } from "@/lib/platform";
import { qrDisplayFor, qrSvgPath } from "@/lib/qr";

// T15 / INS-20 — install-by-link page (FR-8.5, GWT-40): the app URL as a
// locally generated QR code (constitution C1: no network) plus a copyable
// link, and the platform-specific install flows with the visitor's own
// platform highlighted.

const QUIET_ZONE = 4;
type CopyState = "idle" | "copied" | "failed";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard API refused (e.g. permissions) — try the legacy fallback.
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    // Transient off-screen helper node, never part of the visible UI.
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

// Client-only values read hydration-safely (the page is prerendered by
// Next, so the server snapshot is a neutral placeholder).
const emptySubscribe = () => () => {};

export default function InstallPage() {
  const installUrl = useSyncExternalStore(
    emptySubscribe,
    () => `${window.location.origin}/install`,
    () => null,
  );
  const platform = useSyncExternalStore(
    emptySubscribe,
    () => detectPlatform(navigator.userAgent),
    () => "other" as const,
  );
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const { canInstall, dismissed, installed, promptInstall } =
    useInstallPrompt();

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copyState]);

  const flow = selectInstallFlow(platform);
  // pending (URL not yet known) | ready | unavailable (URL over capacity —
  // shown as an explicit message, never an endless skeleton).
  const qrDisplay = qrDisplayFor(installUrl);

  const sections = {
    android: (
      <PlatformCard
        key="android"
        title="Android — Chrome"
        highlighted={flow.highlighted === "android"}
      >
        {installed ? (
          <p className="text-sm font-medium text-emerald-600">
            Az app már telepítve van ezen a készüléken — nyisd meg a
            kezdőképernyőről.
          </p>
        ) : dismissed && !canInstall ? (
          // The captured prompt event was consumed (dismissed or failed) —
          // it cannot be prompted again, so no re-clickable button (MAJOR-1).
          <p className="text-sm text-zinc-600">
            A telepítési ablak bezárult. Az app továbbra is telepíthető a
            Chrome menüjéből: <strong>⋮ → „Alkalmazás telepítése”</strong>.
          </p>
        ) : (
          <>
            <Button
              className="h-14 w-full rounded-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
              disabled={!canInstall}
              onClick={() => void promptInstall()}
            >
              Telepítés
            </Button>
            {!canInstall && (
              <p className="text-sm text-zinc-500">
                A gomb akkor válik aktívvá, amikor a böngésző felajánlja a
                telepítést. Nyisd meg ezt az oldalt Android-telefonon,
                Chrome-ban — vagy válaszd a Chrome menüjében (⋮) az
                „Alkalmazás telepítése” pontot.
              </p>
            )}
          </>
        )}
      </PlatformCard>
    ),
    ios: (
      <PlatformCard
        key="ios"
        title="iPhone / iPad — Safari"
        highlighted={flow.highlighted === "ios"}
      >
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-zinc-700">
          <li>Nyisd meg ezt az oldalt a Safariban.</li>
          <li>
            Koppints a <strong>Megosztás</strong> ikonra (négyzet felfelé
            mutató nyíllal).
          </li>
          <li>
            Görgess le, és válaszd a{" "}
            <strong>„Hozzáadás a kezdőképernyőhöz”</strong> lehetőséget.
          </li>
          <li>
            Koppints a <strong>Hozzáadás</strong> gombra — az app megjelenik a
            kezdőképernyőn.
          </li>
        </ol>
      </PlatformCard>
    ),
  };

  return (
    <section className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-zinc-900">Telepítés</h1>
        <p className="text-sm text-zinc-500">
          Tedd fel a RallyTrackot a telefonodra — szkenneld be a kódot, vagy
          másold ki a linket.
        </p>
      </header>

      <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-900">
            Szkenneld be telefonnal
          </CardTitle>
          <CardDescription className="text-sm text-zinc-500">
            A kód ezt az oldalt nyitja meg — a telefonodon már a saját
            telepítési lépéseidet látod.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {qrDisplay.status === "ready" ? (
            <svg
              viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${qrDisplay.qr.size + 2 * QUIET_ZONE} ${qrDisplay.qr.size + 2 * QUIET_ZONE}`}
              className="h-auto w-full max-w-56"
              shapeRendering="crispEdges"
              role="img"
              aria-label={`QR-kód az app linkjével: ${installUrl}`}
            >
              <rect
                x={-QUIET_ZONE}
                y={-QUIET_ZONE}
                width={qrDisplay.qr.size + 2 * QUIET_ZONE}
                height={qrDisplay.qr.size + 2 * QUIET_ZONE}
                className="fill-white"
              />
              <path d={qrSvgPath(qrDisplay.qr)} className="fill-zinc-900" />
            </svg>
          ) : qrDisplay.status === "pending" ? (
            <div
              aria-hidden="true"
              className="aspect-square w-full max-w-56 animate-pulse rounded-2xl bg-zinc-100"
            />
          ) : (
            <div
              role="status"
              className="flex aspect-square w-full max-w-56 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <p className="text-center text-sm text-zinc-600">
                A QR-kód ehhez a címhez nem érhető el — használd a lenti
                linket.
              </p>
            </div>
          )}
          <p className="w-full break-all text-center font-mono text-sm text-zinc-700">
            {installUrl ?? "…"}
          </p>
          <Button
            variant="outline"
            className="h-12 w-full rounded-full border-zinc-300 bg-white text-base font-semibold text-zinc-900 hover:bg-zinc-50"
            disabled={!installUrl}
            onClick={async () => {
              if (!installUrl) return;
              setCopyState((await copyToClipboard(installUrl)) ? "copied" : "failed");
            }}
          >
            Link másolása
          </Button>
          <p role="status" aria-live="polite" className="min-h-5 text-sm">
            {copyState === "copied" && (
              <span className="font-medium text-emerald-600">Link másolva!</span>
            )}
            {copyState === "failed" && (
              <span className="font-medium text-red-600">
                A másolás nem sikerült — jelöld ki és másold ki a linket kézzel.
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {flow.order.map((key) => sections[key])}
    </section>
  );
}

function PlatformCard({
  title,
  highlighted,
  children,
}: {
  title: string;
  highlighted: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={
        highlighted
          ? "rounded-2xl border-2 border-orange-500 bg-white shadow-sm ring-0"
          : "rounded-2xl border border-zinc-200 bg-zinc-50 shadow-none ring-0"
      }
    >
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold text-zinc-900">
          {title}
          {highlighted && (
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
              Ez a te készüléked
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}
