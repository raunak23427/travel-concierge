import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/serpapi";
import { rankPlaces, transportQueries } from "@/lib/preference-queries";
import { withinLimit } from "@/lib/rate-limit";

/**
 * One live search, for the booking rows and anything else that needs places
 * on demand. Either a free-text `q`, or `kind=transport`, which expands to the
 * two getting-around searches near the stay.
 */

export const dynamic = "force-dynamic";

const GOA_CENTRE = { lat: 15.4909, lng: 73.8278 };

export async function GET(req: Request) {
  if (!(await withinLimit(req, "live-places", 20)))
    return NextResponse.json(
      { error: "Too many requests — try again in a minute." },
      { status: 429 },
    );

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.slice(0, 120) ?? "";
  const kind = url.searchParams.get("kind");
  const area = url.searchParams.get("area")?.slice(0, 80) ?? "";
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const point =
    Number.isFinite(lat) && Number.isFinite(lng) && lat > 14.8 && lat < 15.9
      ? { lat, lng }
      : GOA_CENTRE;

  const queries =
    kind === "transport"
      ? transportQueries(area).map((t) => t.q)
      : q
        ? [q]
        : [];
  if (!queries.length)
    return NextResponse.json(
      { error: "Pass q, or kind=transport." },
      { status: 400 },
    );

  const results = await Promise.all(
    queries.map((query) => searchPlaces({ q: query, ...point })),
  );
  const seen = new Set<string>();
  const items = results
    .flatMap((r) =>
      rankPlaces(r.items)
        .slice(0, 6)
        .map((p) => ({ ...p, provenance: r.provenance })),
    )
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

  return NextResponse.json({
    items,
    provenance: results.every((r) => r.provenance === "live")
      ? "live"
      : results.some((r) => r.provenance === "offline")
        ? "offline"
        : results.some((r) => r.provenance === "saved")
          ? "saved"
          : "cached",
  });
}
