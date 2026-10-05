import { NextResponse } from "next/server";
import { eventsWindowFor, searchEvents } from "@/lib/serpapi";
import { withinLimit } from "@/lib/rate-limit";

/**
 * What is on in Goa around the trip — festivals, gigs, markets — from Google
 * search (via SerpApi). The window follows the trip start, so a guest arriving
 * next week sees next week, not tonight.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await withinLimit(req, "live-events", 20)))
    return NextResponse.json(
      { error: "Too many requests — try again in a minute." },
      { status: 429 },
    );

  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? undefined;
  const result = await searchEvents({ window: eventsWindowFor(start) });
  return NextResponse.json({
    items: result.items.slice(0, 8),
    provenance: result.provenance,
    fetchedAt: result.fetchedAt,
  });
}
