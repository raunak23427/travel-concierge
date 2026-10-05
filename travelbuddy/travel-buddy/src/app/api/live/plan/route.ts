import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/serpapi";
import type { LivePlanResponse, Provenance } from "@/lib/live-types";
import {
  compileQueries,
  rankPlaces,
  type PreferenceProfile,
} from "@/lib/preference-queries";
import { withinLimit } from "@/lib/rate-limit";

/**
 * Turn a swipe profile and a stay location into a pool of real places.
 *
 * One request per generated plan. The profile compiles to at most seven
 * searches, run in parallel and cached, and the ranked results come back
 * grouped by kind for the client to slot into the itinerary — so every food
 * and activity stop in the plan is a place that exists, with its rating.
 */

export const dynamic = "force-dynamic";

const GOA_CENTRE = { lat: 15.4909, lng: 73.8278 };

function clean(list: unknown): string[] {
  return Array.isArray(list)
    ? list.filter((t): t is string => typeof t === "string").slice(0, 40)
    : [];
}

export async function POST(req: Request) {
  if (!(await withinLimit(req, "live-plan", 8)))
    return NextResponse.json(
      { error: "Too many requests — try again in a minute." },
      { status: 429 },
    );

  let body: {
    profile?: PreferenceProfile;
    stay?: { area?: string; lat?: number; lng?: number };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const profile: PreferenceProfile = {
    vibes: clean(body.profile?.vibes),
    activities: clean(body.profile?.activities),
    food: clean(body.profile?.food),
  };
  const area =
    typeof body.stay?.area === "string" ? body.stay.area.slice(0, 80) : "";
  const lat = Number(body.stay?.lat);
  const lng = Number(body.stay?.lng);
  const point =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat > 14.8 &&
    lat < 15.9 &&
    lng > 73.6 &&
    lng < 74.4
      ? { lat, lng }
      : GOA_CENTRE;

  const queries = compileQueries(profile, area);
  const results = await Promise.all(
    queries.map((cq) =>
      searchPlaces({ q: cq.q, zoom: cq.zoom, ...point }).then((r) => ({
        cq,
        r,
      })),
    ),
  );

  const pools: LivePlanResponse["pools"] = {
    food: [],
    activity: [],
    nightlife: [],
  };
  const seen = new Set<string>();
  for (const { cq, r } of results) {
    if (cq.kind === "transport") continue;
    for (const place of rankPlaces(r.items)) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      pools[cq.kind].push({
        ...place,
        kind: cq.kind,
        reason: cq.reason,
        provenance: r.provenance,
      });
    }
  }

  // The weakest link sets the label: one saved query makes the plan "saved".
  const order: Provenance[] = ["offline", "saved", "cached", "live"];
  const provenance = results.reduce<Provenance>(
    (worst, { r }) =>
      order.indexOf(r.provenance) < order.indexOf(worst) ? r.provenance : worst,
    "live",
  );

  const response: LivePlanResponse = {
    pools,
    queries: results.map(({ cq, r }) => ({
      kind: cq.kind,
      q: cq.q,
      reason: cq.reason,
      provenance: r.provenance,
      count: r.items.length,
      fetchedAt: r.fetchedAt,
    })),
    provenance,
  };
  return NextResponse.json(response);
}
