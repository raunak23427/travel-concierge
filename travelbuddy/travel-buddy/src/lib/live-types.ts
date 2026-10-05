/**
 * Shapes shared between the SerpApi server layer and the screens that show
 * its results. Kept apart from serpapi.ts so client code can import them
 * without pulling a server-only module (and its key handling) into a bundle.
 */

/** Where a result came from. Shown to the guest — never relabelled. */
export type Provenance = "live" | "cached" | "saved" | "offline";

export type LiveKind = "food" | "activity" | "nightlife" | "transport";

export type LivePlace = {
  id: string;
  name: string;
  category?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  address?: string;
  phone?: string;
  website?: string;
  lat?: number;
  lng?: number;
  openState?: string;
  thumbnail?: string;
  mapsUrl: string;
};

export type LiveEvent = {
  id: string;
  title: string;
  when?: string;
  startDate?: string;
  address?: string;
  venue?: string;
  description?: string;
  link?: string;
  ticketUrl?: string;
  thumbnail?: string;
};

export type PooledPlace = LivePlace & {
  kind: LiveKind;
  /** The preference this place answers, e.g. "You liked seafood by the sea". */
  reason: string;
  provenance: Provenance;
};

export type LiveQuery = {
  kind: LiveKind;
  q: string;
  reason: string;
  provenance: Provenance;
  count: number;
  fetchedAt?: string;
};

export type LivePlanResponse = {
  pools: Record<"food" | "activity" | "nightlife", PooledPlace[]>;
  queries: LiveQuery[];
  provenance: Provenance;
};

/** What an itinerary carries once its stops are live. */
export type LiveMeta = {
  provenance: Provenance;
  queries: LiveQuery[];
  pools: LivePlanResponse["pools"];
  enrichedAt: string;
};
