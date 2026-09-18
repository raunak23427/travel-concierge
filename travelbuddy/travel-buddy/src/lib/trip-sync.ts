import type { SavedTrip } from "./trip-updates";

/**
 * Pushing the browser's trip up to the server.
 *
 * The app is client-held by design, so this is the only thing that leaves the
 * device — and only once the guest has asked for a bot. Called again on every
 * itinerary change so the bot never answers from a stale plan.
 */

export type SyncResult = {
  tripId: string;
  token?: string;
  followers: number;
  durable: boolean;
};

/** Read the extras the assistant likes, straight from local storage. */
function collectExtras() {
  const extras: {
    transportModes?: string[];
    budget?: Record<string, number>;
    profileTags?: Record<string, string[]>;
  } = {};
  try {
    const modes = localStorage.getItem("travelbuddy:transport-modes");
    if (modes) extras.transportModes = JSON.parse(modes);
  } catch {
    /* private mode */
  }
  try {
    const plannerKey = Object.keys(localStorage).find((k) =>
      k.startsWith("tb:planner:"),
    );
    if (plannerKey) {
      const planner = JSON.parse(localStorage.getItem(plannerKey) || "{}");
      if (planner?.budget && typeof planner.budget === "object")
        extras.budget = planner.budget;
      if (planner?.profileTags && typeof planner.profileTags === "object")
        extras.profileTags = planner.profileTags;
    }
  } catch {
    /* ignore — extras are a nicety, the itinerary is the point */
  }
  return extras;
}

export async function syncTrip(
  trip: SavedTrip,
  options: { withToken?: boolean } = {},
): Promise<SyncResult | null> {
  if (!trip?.id || !trip.days?.length) return null;
  try {
    const res = await fetch("/api/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trip,
        withToken: options.withToken ?? false,
        ...collectExtras(),
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as SyncResult;
  } catch {
    return null;
  }
}
