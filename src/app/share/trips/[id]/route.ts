import { photos, rolls } from "@/data/captures";
import { renderShareImage } from "@/lib/share-image";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = rolls.find((roll) => roll.id === id && photos.some((photo) => photo.roll === id));
  if (!trip) return new Response("Trip not found", { status: 404 });
  return renderShareImage(trip);
}
