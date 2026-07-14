import { PlaceholderScreen } from "@/components/placeholder-screen";

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // The id will select the stored tour once history lands (T6 / INS-13).
  await params;
  return (
    <PlaceholderScreen
      title="Túra részletei"
      description="A lezárt túra összegzése: útvonalrajz, metrikák, itiner és export (GPX, CSV, PDF)."
    />
  );
}
