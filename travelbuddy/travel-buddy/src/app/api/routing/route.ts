import { NextResponse } from "next/server";

type Point = { lat: number; lng: number };
type TravelMode = "car" | "motorcycle" | "pedestrian" | "bicycle" | "taxi" | "bus";

function validPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const point = value as Record<string, unknown>;
  return (
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

function validTravelMode(value: unknown): value is TravelMode {
  return ["car", "motorcycle", "pedestrian", "bicycle", "taxi", "bus"].includes(String(value));
}

export async function POST(request: Request) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey || apiKey === "REPLACE_ME" || apiKey === "YOUR_API_KEY_HERE") {
    return NextResponse.json({ error: "TomTom API key is not configured" }, { status: 503 });
  }

  let body: { start?: unknown; end?: unknown; transportMode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!validPoint(body.start) || !validPoint(body.end) || !validTravelMode(body.transportMode)) {
    return NextResponse.json({ error: "Invalid route parameters" }, { status: 400 });
  }

  const locations = `${body.start.lat},${body.start.lng}:${body.end.lat},${body.end.lng}`;
  const url = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${locations}/json`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("travelMode", body.transportMode);
  url.searchParams.set("traffic", "true");
  url.searchParams.set("sectionType", "traffic");
  url.searchParams.set("computeTravelTimeFor", "all");
  url.searchParams.set("routeRepresentation", "summaryOnly");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return NextResponse.json({ error: `TomTom routing failed (${response.status})` }, { status: 502 });
    }

    const data = await response.json();
    const summary = data?.routes?.[0]?.summary;
    if (typeof summary?.lengthInMeters !== "number" || typeof summary?.travelTimeInSeconds !== "number") {
      return NextResponse.json({ error: "TomTom returned no route" }, { status: 502 });
    }

    return NextResponse.json({
      distanceMeters: summary.lengthInMeters,
      durationSeconds: summary.travelTimeInSeconds,
      trafficDelaySeconds:
        typeof summary.trafficDelayInSeconds === "number"
          ? summary.trafficDelayInSeconds
          : null,
    });
  } catch {
    return NextResponse.json({ error: "TomTom routing request failed" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
