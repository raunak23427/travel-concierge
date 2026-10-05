import type { ItineraryActivity, TripItinerary } from "@/data/itineraryMock";
import type { LivePlanResponse, PooledPlace } from "./live-types";
import type { PreferenceProfile } from "./preference-queries";

/**
 * Fill a plan's stops with real places.
 *
 * The planner produces a well-paced skeleton — what kind of thing happens at
 * 13:00 on day two, and roughly what it costs. This replaces the named stops
 * in that skeleton with places SerpApi found for this guest's preferences near
 * where they are staying, keeping the timing and budget the planner chose.
 *
 * Travel legs, hotel meals and beach downtime are left alone: a live search
 * has nothing to add to "Arrive at Goa Airport".
 */

export type StayContext = { area?: string; lat?: number; lng?: number };

export async function fetchLivePlan(
  profile: PreferenceProfile,
  stay: StayContext,
): Promise<LivePlanResponse | null> {
  try {
    const res = await fetch("/api/live/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, stay }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as LivePlanResponse;
  } catch {
    return null;
  }
}

const SKIP = /airport|arriv|depart|check.?in|check.?out|hotel|resort|villa/i;

function hourOf(time: string) {
  const h = Number(time?.slice(0, 2));
  return Number.isFinite(h) ? h : 12;
}

export function mealFor(item: ItineraryActivity) {
  const lead = item.activity.match(
    /^(breakfast|brunch|lunch|dinner|supper)\b/i,
  )?.[1];
  if (lead) return lead[0].toUpperCase() + lead.slice(1).toLowerCase();
  const h = hourOf(item.time);
  return h < 11 ? "Breakfast" : h < 16 ? "Lunch" : "Dinner";
}

export function describePlace(p: PooledPlace) {
  const bits: string[] = [];
  if (p.category) bits.push(p.category);
  if (p.rating)
    bits.push(
      `★ ${p.rating.toFixed(1)}${p.reviews ? ` (${p.reviews.toLocaleString("en-IN")})` : ""}`,
    );
  if (p.address) bits.push(p.address.split(",").slice(0, 2).join(",").trim());
  return bits.join(" · ");
}

/** Take the next unused place from a pool, or nothing once it runs dry. */
function taker(pool: PooledPlace[], used: Set<string>) {
  return () => {
    const next = pool.find((p) => !used.has(p.id));
    if (next) used.add(next.id);
    return next;
  };
}

export function applyLivePlaces(
  itinerary: TripItinerary,
  plan: LivePlanResponse,
): TripItinerary {
  const out = JSON.parse(JSON.stringify(itinerary)) as TripItinerary;
  const used = new Set<string>();
  const nextFood = taker(plan.pools.food, used);
  const nextActivity = taker(plan.pools.activity, used);
  const nextNight = taker(plan.pools.nightlife, used);
  let filled = 0;

  for (const day of out.days) {
    day.items = day.items.map((item) => {
      if (
        item.type === "travel" ||
        item.type === "relax" ||
        SKIP.test(item.activity)
      )
        return item;

      let place: PooledPlace | undefined;
      if (item.type === "food") place = nextFood();
      else if (item.type === "activity") {
        place =
          hourOf(item.time) >= 20
            ? (nextNight() ?? nextActivity())
            : nextActivity();
      }
      if (!place) return item;

      filled += 1;
      return {
        ...item,
        activity:
          item.type === "food"
            ? `${mealFor(item)} at ${place.name}`
            : place.name,
        description: describePlace(place) || item.description,
        place,
      };
    });
  }

  if (filled === 0) return itinerary;

  const reasons = [
    ...new Set(plan.queries.filter((q) => q.count > 0).map((q) => q.reason)),
  ];
  (
    out as TripItinerary & { recommendationReason?: { text: string } }
  ).recommendationReason = {
    text: `${filled} stops are real places from Google Maps, found for you because: ${reasons.slice(0, 3).join("; ").toLowerCase()}.`,
  };

  out.live = {
    provenance: plan.provenance,
    queries: plan.queries,
    // Kept on the plan so Replace can offer siblings without another search.
    pools: {
      food: plan.pools.food.slice(0, 14),
      activity: plan.pools.activity.slice(0, 14),
      nightlife: plan.pools.nightlife.slice(0, 6),
    },
    enrichedAt: new Date().toISOString(),
  };
  return out;
}

/** Fetch and apply in one step; returns the plan unchanged if live data is unavailable. */
export async function withLivePlaces(
  itinerary: TripItinerary,
  profile: PreferenceProfile,
  stay: StayContext,
): Promise<TripItinerary> {
  if (itinerary.live) return itinerary;
  const plan = await fetchLivePlan(profile, stay);
  return plan ? applyLivePlaces(itinerary, plan) : itinerary;
}

/** Other live places of the same kind as a stop, for the Replace sheet. */
export function liveAlternatives(
  itinerary: TripItinerary,
  item: ItineraryActivity,
  limit = 5,
): PooledPlace[] {
  const pools = itinerary.live?.pools;
  if (!pools) return [];
  const inPlan = new Set(
    itinerary.days.flatMap((d) =>
      d.items.map((i) => i.place?.id).filter(Boolean),
    ),
  );
  const pool =
    item.type === "food"
      ? pools.food
      : item.place?.kind === "nightlife"
        ? [...pools.nightlife, ...pools.activity]
        : pools.activity;
  return pool.filter((p) => !inPlan.has(p.id)).slice(0, limit);
}
