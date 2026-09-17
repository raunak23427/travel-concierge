import type { SavedTrip } from "./trip-updates";

/**
 * Archive of plans the guest has finished with.
 *
 * The provider only ever holds one live trip, so deleting or replacing a plan
 * used to throw it away. Anything archived here stays listed on the Plan tab
 * and can be restored.
 */

const KEY = "tb:plans:history";
const LIMIT = 20;

export type ArchivedPlan = {
  id: string;
  name: string;
  destination: string;
  country: string;
  image: string;
  startDate: string;
  endDate: string;
  travelers: number;
  dayCount: number;
  estimatedCost: number;
  bookedAt?: string;
  archivedAt: string;
  /** Full trip, so a restore brings back the whole itinerary. */
  trip: SavedTrip;
};

function estimate(trip: SavedTrip): number {
  const items = (trip.days || []).flatMap((d) => d.items || []);
  const activities = items.reduce((sum, i) => sum + (i.cost || 0), 0);
  const stay = trip.hotel?.totalCost || 0;
  return activities + stay;
}

export function readPlanHistory(): ArchivedPlan[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Archive a trip. Re-archiving the same plan replaces the earlier entry. */
export function archivePlan(trip: SavedTrip | null | undefined): void {
  if (!trip || !trip.days?.length) return;
  try {
    const entry: ArchivedPlan = {
      id: trip.id,
      name: trip.name || `Trip to ${trip.destination}`,
      destination: trip.destination,
      country: trip.country,
      image: trip.image,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      dayCount: trip.days.length,
      estimatedCost: estimate(trip),
      bookedAt: trip.bookedAt,
      archivedAt: new Date().toISOString(),
      trip,
    };
    const next = [entry, ...readPlanHistory().filter((p) => p.id !== trip.id)];
    localStorage.setItem(KEY, JSON.stringify(next.slice(0, LIMIT)));
  } catch {
    /* private mode — history is a convenience, never load-bearing */
  }
}

export function removeArchivedPlan(id: string): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(readPlanHistory().filter((p) => p.id !== id)),
    );
  } catch {
    /* ignore */
  }
}

export function formatArchivedDate(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
}
