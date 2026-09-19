/**
 * Wayzyy partner venues.
 *
 * A badge only means something if it is not on everything, so this is a list
 * of actual partners rather than a flag on every restaurant. Matching is on
 * the venue name inside the activity string, because an itinerary line reads
 * "Lunch at Calamari" rather than just "Calamari".
 */

export type Sponsor = {
  /** Lower-case fragment to look for in the activity text. */
  match: string;
  name: string;
  /** Shown on the detail row — what the guest actually gets. */
  perk?: string;
};

export const SPONSORS: Sponsor[] = [
  { match: "calamari", name: "Calamari", perk: "10% off with Travel Cash" },
  { match: "fisherman", name: "Fisherman's Wharf", perk: "Free starter" },
  { match: "venite", name: "Venite", perk: "10% off the bill" },
  {
    match: "ritz classic",
    name: "Ritz Classic",
    perk: "Complimentary sol kadhi",
  },
  { match: "gunpowder", name: "Gunpowder", perk: "10% off with Travel Cash" },
  { match: "souza lobo", name: "Souza Lobo", perk: "Beachfront table held" },
  { match: "britto", name: "Britto's", perk: "15% off before 7pm" },
  { match: "thalassa", name: "Thalassa", perk: "Priority sunset seating" },
  { match: "vinayak", name: "Vinayak Family Restaurant", perk: "10% off" },
  { match: "mum's kitchen", name: "Mum's Kitchen", perk: "Free bebinca" },
];

/**
 * The partner behind an itinerary line, if there is one.
 *
 * Only food stops are considered — a sponsored badge on a waterfall would be
 * nonsense, and the type is already on every item.
 */
export function sponsorFor(
  activity: string | undefined,
  type: string | undefined,
): Sponsor | null {
  if (!activity || type !== "food") return null;
  const haystack = activity.toLowerCase();
  return SPONSORS.find((s) => haystack.includes(s.match)) ?? null;
}
