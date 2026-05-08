import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Internal endpoint the agent service hits to find similar grievances near a given lat/lng.
// Uses a basic equirectangular distance approximation in JS — fine at the radii we care about (~200 m).

const APPROX_LAT_M = 111_320;

function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const dLat = (a.lat - b.lat) * APPROX_LAT_M;
  const dLng =
    (a.lng - b.lng) *
    APPROX_LAT_M *
    Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    lat?: number;
    lng?: number;
    category?: string;
    radiusMeters?: number;
    excludeId?: string;
  };

  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ ids: [] });
  }
  const radius = body.radiusMeters ?? 250;

  const candidates = await prisma.grievance.findMany({
    where: {
      ...(body.excludeId ? { NOT: { id: body.excludeId } } : {}),
      ...(body.category ? { category: { contains: body.category } } : {}),
      lat: { not: null },
      lng: { not: null },
      status: { in: ["SUBMITTED", "ACKNOWLEDGED", "IN_PROGRESS"] },
    },
    select: { id: true, lat: true, lng: true, title: true },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const ids = candidates
    .filter((c) => c.lat !== null && c.lng !== null)
    .filter(
      (c) =>
        metersBetween(
          { lat: body.lat as number, lng: body.lng as number },
          { lat: c.lat as number, lng: c.lng as number }
        ) <= radius
    )
    .map((c) => c.id);

  return NextResponse.json({ ids });
}
