import { NextResponse } from "next/server";
import {
  issueToken,
  readSnapshot,
  saveSnapshot,
  chatsForTrip,
  type TripSnapshot,
} from "@/lib/trip-link";
import { storeIsDurable } from "@/lib/store";
import type { SavedTrip } from "@/lib/trip-updates";

/**
 * The bridge between the browser's localStorage and anything server-side.
 *
 * The app is otherwise entirely client-held, which is fine until a bot needs
 * to read the itinerary. The client pushes a snapshot here whenever the trip
 * changes; the bot and the scheduler read it back. Nothing else is stored.
 */

export const dynamic = "force-dynamic";

/** Enough of a shape check that a malformed post cannot poison the bot. */
function looksLikeTrip(value: unknown): value is SavedTrip {
  if (!value || typeof value !== "object") return false;
  const trip = value as Partial<SavedTrip>;
  return (
    typeof trip.id === "string" &&
    typeof trip.destination === "string" &&
    Array.isArray(trip.days)
  );
}

export async function POST(req: Request) {
  let body: {
    trip?: unknown;
    profileTags?: Record<string, string[]>;
    transportModes?: string[];
    budget?: Record<string, number>;
    /** Ask for an invite token back — only wanted when connecting a chat app. */
    withToken?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!looksLikeTrip(body.trip))
    return NextResponse.json({ error: "No usable trip" }, { status: 400 });

  const snapshot: TripSnapshot = {
    tripId: body.trip.id,
    updatedAt: new Date().toISOString(),
    trip: body.trip,
    profileTags: body.profileTags,
    transportModes: body.transportModes,
    budget: body.budget,
  };

  await saveSnapshot(snapshot);

  const token = body.withToken ? await issueToken(snapshot.tripId) : undefined;
  const followers = await chatsForTrip(snapshot.tripId);

  return NextResponse.json({
    ok: true,
    tripId: snapshot.tripId,
    token,
    followers: followers.length,
    // Surfaced so the UI can warn instead of silently losing the link.
    durable: storeIsDurable,
  });
}

export async function GET(req: Request) {
  const tripId = new URL(req.url).searchParams.get("tripId");
  if (!tripId)
    return NextResponse.json({ error: "tripId required" }, { status: 400 });

  const snapshot = await readSnapshot(tripId);
  if (!snapshot)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const followers = await chatsForTrip(tripId);
  return NextResponse.json({
    tripId,
    updatedAt: snapshot.updatedAt,
    followers: followers.length,
  });
}
