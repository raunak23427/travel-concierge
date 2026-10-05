/**
 * Swipes, compiled into searches.
 *
 * A guest never types a query. They swipe on photographs, and each card carries
 * tags ("Sea", "Gastronomy", "Adrenaline"). This turns the tags they kept into
 * a handful of concrete local searches — "seafood beach shack near Candolim",
 * "water sports near Candolim" — whose results become the stops in their plan.
 *
 * Pure and deterministic: the same profile always compiles to the same
 * queries, which is what lets the SerpApi cache absorb repeat plans.
 */

import type { LiveKind } from "./live-types";

export type { LiveKind };

export type CompiledQuery = {
  kind: LiveKind;
  q: string;
  /** The preference this query came from, shown to the guest as the "why". */
  reason: string;
  zoom: number;
};

export type PreferenceProfile = {
  vibes?: string[];
  activities?: string[];
  food?: string[];
  stays?: string[];
};

type Rule = {
  match: RegExp;
  q: string;
  reason: string;
  /** Day trips are searched across Goa, not around the guest's stay. */
  goaWide?: boolean;
};

const FOOD: Rule[] = [
  {
    match: /\bveg|vegetarian/i,
    q: "pure veg thali restaurant",
    reason: "You kept the vegetarian cards",
  },
  {
    match: /\bsea\b|seafood|beach/i,
    q: "seafood beach shack",
    reason: "You liked seafood by the sea",
  },
  {
    match: /caf[eé]|coffee|trendy|design/i,
    q: "cafe",
    reason: "You liked café culture",
  },
  {
    match: /heritage|unique/i,
    q: "Goan Portuguese restaurant",
    reason: "You liked heritage food",
  },
  {
    match: /budget|value/i,
    q: "local Goan thali",
    reason: "You kept the good-value picks",
  },
  {
    match: /local|gastronomy|culture|warm/i,
    q: "authentic Goan restaurant",
    reason: "You liked local food",
  },
];

const ACTIVITY: Rule[] = [
  {
    match: /adrenaline|sport|thrill/i,
    q: "water sports",
    reason: "You liked adrenaline",
  },
  {
    match: /wildlife/i,
    q: "dolphin watching boat trip",
    reason: "You liked wildlife",
  },
  {
    match: /sailing|cruise|luxury|premium/i,
    q: "sunset cruise",
    reason: "You liked time on the water",
  },
  {
    match: /hiking|forest|adventure/i,
    q: "waterfall trek",
    reason: "You liked the outdoors",
    goaWide: true,
  },
  {
    match: /heritage|culture|photography/i,
    q: "heritage churches Old Goa",
    reason: "You liked heritage",
    goaWide: true,
  },
  { match: /markets|shopping/i, q: "flea market", reason: "You liked markets" },
  {
    match: /wellness|solitude|peaceful|quiet/i,
    q: "yoga retreat",
    reason: "You wanted it peaceful",
  },
  {
    match: /family|kids/i,
    q: "family friendly attractions",
    reason: "You're travelling with family",
  },
  {
    match: /romance|scenic|\bsun\b/i,
    q: "sunset point",
    reason: "You liked scenic views",
  },
  {
    match: /beach|chill|coastal|relax/i,
    q: "quiet beach",
    reason: "You liked the beach",
  },
];

const NIGHTLIFE: Rule[] = [
  {
    match: /nightlife|party|music|festive|\bnight\b/i,
    q: "nightclub",
    reason: "You liked nightlife",
  },
];

const DEFAULTS: { food: Rule[]; activity: Rule[] } = {
  food: [FOOD[5], FOOD[1]],
  activity: [ACTIVITY[9], ACTIVITY[4], ACTIVITY[8]],
};

/** Rank rules by how many of the guest's kept tags they match. */
function pick(rules: Rule[], tags: string[], limit: number): Rule[] {
  return rules
    .map((rule, order) => ({
      rule,
      order,
      hits: tags.filter((t) => rule.match.test(t)).length,
    }))
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.order - b.order)
    .slice(0, limit)
    .map((r) => r.rule);
}

export function compileQueries(
  profile: PreferenceProfile,
  stayArea?: string,
): CompiledQuery[] {
  const near = stayArea?.trim() ? `near ${stayArea.trim()}` : "Goa";
  const vibe = profile.vibes ?? [];
  const foodTags = profile.food ?? [];
  const doTags = [...(profile.activities ?? []), ...vibe];

  // Pure veg overrides the food searches outright; a seafood shack is not a
  // fallback for someone who kept only the vegetarian deck.
  const pureVeg = foodTags.some((t) => /\bveg|vegetarian/i.test(t));
  let food = pureVeg ? [FOOD[0]] : pick(FOOD, foodTags, 3);
  if (!food.length) food = DEFAULTS.food;

  let activity = pick(ACTIVITY, doTags, 3);
  if (!activity.length) activity = DEFAULTS.activity;

  const nightlife = pick(NIGHTLIFE, doTags, 1);

  const build = (kind: LiveKind, r: Rule): CompiledQuery => ({
    kind,
    // Day trips already name their place ("Old Goa"); don't append it twice.
    q: r.goaWide ? (/\bgoa\b/i.test(r.q) ? r.q : `${r.q} Goa`) : `${r.q} ${near}`,
    reason: r.reason,
    zoom: r.goaWide ? 10 : 13,
  });

  return [
    ...food.map((r) => build("food", r)),
    ...activity.map((r) => build("activity", r)),
    ...nightlife.map((r) => build("nightlife", r)),
  ];
}

export function transportQueries(stayArea?: string): CompiledQuery[] {
  const near = stayArea?.trim() ? `near ${stayArea.trim()}` : "Goa";
  return [
    {
      kind: "transport",
      q: `scooter rental ${near}`,
      reason: "Getting around",
      zoom: 13,
    },
    {
      kind: "transport",
      q: `taxi service ${near}`,
      reason: "Getting around",
      zoom: 13,
    },
  ];
}

type Rankable = { rating?: number; reviews?: number; openState?: string };

/**
 * Best first: rating weighted by how many people stand behind it, so a 4.9
 * with six reviews does not outrank a 4.5 with three thousand. Closed-for-good
 * places are dropped; thin listings sink rather than vanish.
 */
export function rankPlaces<T extends Rankable>(places: T[]): T[] {
  return places
    .filter((p) => !/permanently closed/i.test(p.openState ?? ""))
    .map((p) => ({
      p,
      score: (p.rating ?? 3.5) * Math.log10((p.reviews ?? 0) + 10),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p);
}
