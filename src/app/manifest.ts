import type { MetadataRoute } from "next";

// Web app manifest (FR-8.1) via the App Router file convention — served at
// /manifest.webmanifest. Colors come from DESIGN-GUIDELINE.md tokens:
// orange-500 accent, zinc-50 app background.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RallyTrack",
    short_name: "RallyTrack",
    description:
      "Túrakövetés és rally műszerek veterán autós legénységeknek — offline is.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#f97316",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
