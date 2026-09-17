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
  bookedAt,
  onSaved,
}: {
  itinerary: TripItinerary | null;
  details: SessionData | null;
  sessionId: string | null;
  /** Set once the guest confirms; the home screen only shows booked trips. */
  bookedAt?: string | null;
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
    if (bookedAt) incoming.bookedAt = bookedAt;
    if (trip?.id === id) {
      incoming.name = trip.name;
      incoming.timeZone = trip.timeZone;
      incoming.startDate = trip.startDate || incoming.startDate;
      incoming.endDate = trip.endDate || incoming.endDate;
    }
    if (JSON.stringify(incoming) !== JSON.stringify(trip))
      saveTrip(incoming, `Your ${incoming.destination} itinerary is ready.`);
    onSaved?.();
  }, [ready, itinerary, details, sessionId, bookedAt, trip, saveTrip, onSaved]);
  return (
    // Sits opposite "Back to Suggestions" in the hero rather than floating a
    // bare circle over the bottom CTA, where it collided with the download
    // button and read as a stray dot.
    <Link
      href="/home"
      className="fixed z-30 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-2 text-[13px] font-bold text-[#1A1A1A] shadow-sm backdrop-blur-sm active:scale-95 transition-transform"
      style={{
        right: "max(16px, calc(50vw - 224px + 16px))",
        top: "calc(20px + env(safe-area-inset-top, 0px))",
      }}
      aria-label="Back to trip homepage"
      title="My trip"
    >
      <House size={15} strokeWidth={2.4} />
      Home
    </Link>
  );
}
