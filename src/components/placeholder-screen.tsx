import { Card, CardContent } from "@/components/ui/card";

/**
 * Consistent empty screen used by the not-yet-implemented routes (T3 / INS-8).
 * Each screen gets real content in its own task; this only keeps the route
 * rendering with the design tokens applied.
 */
export function PlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      <Card className="rounded-2xl border border-zinc-200 bg-white shadow-sm ring-0">
        <CardContent className="flex flex-col gap-2 py-2">
          <p className="text-xs tracking-wide text-zinc-400 uppercase">
            Hamarosan
          </p>
          <p className="text-sm text-zinc-500">{description}</p>
        </CardContent>
      </Card>
    </section>
  );
}
