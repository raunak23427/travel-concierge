"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { House } from "lucide-react";
import type { TripItinerary } from "@/data/itineraryMock";
import type { SessionData } from "@/components/onboarding/SessionInit";
import { fromPlanner } from "@/lib/trip-updates";
import { useTravel } from "./TravelProvider";

export default function PlannerBridge({
  itinerary,
  details,
  sessionId,
  onSaved,
}: {
  itinerary: TripItinerary | null;
  details: SessionData | null;
  sessionId: string | null;
  onSaved?: () => void;
}) {
  const { ready, trip, saveTrip } = useTravel();
  const lastImport = useRef("");
  useEffect(() => {
    if (!ready || !itinerary) return;
    const signature = JSON.stringify([itinerary, details, sessionId]);
    if (
      lastImport.current === signature ||
      trip?.plannerSignature === signature
    ) { onSaved?.(); return; }
    const id = `planner:${sessionId || "local"}:${itinerary.destination}`;
    const incoming = fromPlanner(itinerary, details || {}, id);
    if (!incoming) return;
    lastImport.current = signature;
    incoming.plannerSignature = signature;
    if (trip?.id === id) {
      incoming.name = trip.name;
      incoming.timeZone = trip.timeZone;
      incoming.startDate = trip.startDate || incoming.startDate;
      incoming.endDate = trip.endDate || incoming.endDate;
    }
    if (JSON.stringify(incoming) !== JSON.stringify(trip))
      saveTrip(incoming, `Your ${incoming.destination} itinerary is ready.`);
    onSaved?.();
  }, [ready, itinerary, details, sessionId, trip, saveTrip, onSaved]);
  return (
    <Link
      href="/home"
      className="fixed z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-sm"
      style={{ left: "max(16px, calc(50vw - 224px + 16px))", bottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}
      aria-label="Back to trip homepage"
      title="My trip"
    >
      <House size={18} />
    </Link>
  );
}
