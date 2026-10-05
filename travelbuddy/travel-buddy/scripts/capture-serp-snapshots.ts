/**
 * Capture real SerpApi responses for Demo Mode.
 *
 * Demo Mode serves these when there is no SERPAPI_API_KEY, or the credit cap
 * is reached, and labels them "Saved example" in the UI. They are only ever
 * written by this script, from real searches — never by hand.
 *
 *   npx tsx --env-file=.env.local scripts/capture-serp-snapshots.ts
 *
 * Queries already in the Redis cache cost nothing; the rest cost one credit.
 * One query per preference rule, centred on Candolim, so any swipe profile
 * finds a close saved match.
 */
import { writeFileSync } from "node:fs";
import { searchEvents, searchPlaces } from "../src/lib/serpapi";

const CANDOLIM = { lat: 15.5167, lng: 73.7625 };

const PLACES: { q: string; zoom?: number }[] = [
  { q: "seafood beach shack near Candolim" },
  { q: "authentic Goan restaurant near Candolim" },
  { q: "local Goan thali near Candolim" },
  { q: "pure veg thali restaurant near Candolim" },
  { q: "cafe near Candolim" },
  { q: "Goan Portuguese restaurant near Candolim" },
  { q: "water sports near Candolim" },
  { q: "quiet beach near Candolim" },
  { q: "dolphin watching boat trip near Candolim" },
  { q: "sunset cruise near Candolim" },
  { q: "flea market near Candolim" },
  { q: "yoga retreat near Candolim" },
  { q: "family friendly attractions near Candolim" },
  { q: "sunset point near Candolim" },
  { q: "nightclub near Candolim" },
  { q: "scooter rental near Candolim" },
  { q: "taxi service near Candolim" },
  { q: "heritage churches Old Goa", zoom: 10 },
  { q: "waterfall trek Goa", zoom: 10 },
];

async function main() {
  const places: Record<string, unknown[]> = {};
  const tally: Record<string, number> = {};
  for (const { q, zoom } of PLACES) {
    const r = await searchPlaces({ q, zoom, ...CANDOLIM });
    tally[r.provenance] = (tally[r.provenance] ?? 0) + 1;
    if (r.provenance === "live" || r.provenance === "cached") {
      places[q.toLowerCase()] = r.items.slice(0, 20);
    }
    console.log(
      `${r.provenance.padEnd(7)} ${String(r.items.length).padStart(3)}  ${q}`,
    );
  }
  const ev = await searchEvents({ window: "this month" });
  console.log(
    `${ev.provenance.padEnd(7)} ${String(ev.items.length).padStart(3)}  ${ev.query}`,
  );

  const out = {
    capturedAt: new Date().toISOString(),
    note: "Real SerpApi responses captured by scripts/capture-serp-snapshots.ts. Served only in Demo Mode and labelled as saved.",
    places,
    events:
      ev.provenance === "live" || ev.provenance === "cached"
        ? { [ev.query.toLowerCase()]: ev.items.slice(0, 10) }
        : {},
  };
  writeFileSync(
    "src/data/serp-snapshots.json",
    JSON.stringify(out, null, 1) + "\n",
  );
  console.log(
    "\nprovenance tally:",
    tally,
    "→ wrote",
    Object.keys(places).length,
    "place queries",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
