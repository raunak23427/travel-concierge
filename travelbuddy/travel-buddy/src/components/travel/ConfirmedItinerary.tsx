"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Map as MapIcon,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import TravelShell from "./TravelShell";
import { useTravel } from "./TravelProvider";
import ItineraryView from "@/components/itinerary/ItineraryView";
import type { TripItinerary } from "@/data/itineraryMock";

/**
 * The Plan tab.
 *
 * Home is the overview and never shows the plan; this is where the finished
 * day-by-day lives, once the trip has actually been booked. Before that it
 * says what is still missing rather than quietly showing a half-made plan.
 */

/** The saved trip carries everything ItineraryView needs bar a few display fields. */
function toItinerary(
  trip: NonNullable<ReturnType<typeof useTravel>["trip"]>,
): TripItinerary {
  const days = trip.days || [];
  const nights = Math.max(0, days.length - 1);
  const activities = days
    .flatMap((d) => d.items || [])
    .reduce((sum, i) => sum + (i.cost || 0), 0);
  const stay = trip.hotel?.totalCost || 0;
  const flights = (trip.flights || []).reduce<number>(
    (sum, f) => sum + ((f as { price?: number }).price || 0),
    0,
  );
  const transfers = (trip.transfers || []).reduce<number>(
    (sum, t) => sum + ((t as { cost?: number }).cost || 0),
    0,
  );

  return {
    destination: trip.destination,
    country: trip.country,
    duration: `${days.length} Days / ${nights} Nights`,
    image: trip.image,
    matchScore: 98,
    totalCost: activities + stay + flights + transfers,
    breakdown: { flights, stay, activities, transfers },
    flights: trip.flights || [],
    hotel: trip.hotel as TripItinerary["hotel"],
    transfers: trip.transfers || [],
    days,
  };
}

export default function ConfirmedItinerary() {
  const { trip, ready } = useTravel();

  if (!ready)
    return (
      <TravelShell>
        <div className="grid min-h-[60vh] place-items-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FFD233] border-t-transparent" />
            <p className="text-sm font-medium text-black/40">
              Loading your plan…
            </p>
          </div>
        </div>
      </TravelShell>
    );

  // Booked and complete — hand straight over to the full itinerary view.
  if (trip?.bookedAt && (trip.days?.length || 0) > 0)
    return (
      <div className="pb-[96px]">
        <ItineraryView
          itinerary={toItinerary(trip)}
          onReset={() => {
            window.location.href = "/plan?new=1";
          }}
          onBack={() => {
            window.location.href = "/home";
          }}
        />
      </div>
    );

  const hasDraft = (trip?.days?.length || 0) > 0;

  return (
    <TravelShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pb-32"
      >
        <div className="pt-2 pb-6">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-black/35 mb-2">
            Your plan
          </p>
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em] text-black leading-[1.08]">
            {hasDraft ? "Almost there." : "Nothing planned yet."}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-black/45">
            {hasDraft
              ? "Your itinerary is drafted but not confirmed. Accept it and the full day-by-day plan lives here."
              : "Once you've answered a few questions and swiped through Goa, your day-by-day plan appears here."}
          </p>
        </div>

        <div className="relative h-[220px] overflow-hidden rounded-[28px] shadow-[0_18px_36px_rgba(0,0,0,0.14)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/goa/fontainhas-street.jpg"
            alt="Fontainhas, Panjim"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <Link
              href="/plan"
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FFD233] text-[16px] font-bold text-black shadow-[0_8px_24px_rgba(255,210,51,0.35)] active:scale-[0.98] transition-transform"
            >
              {hasDraft ? "Review and accept" : "Start planning"}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
          {[
            {
              Icon: CalendarDays,
              tint: "#E1F3EC",
              colour: "#2DA87F",
              t: "Day by day",
              d: "Every stop with times and costs.",
            },
            {
              Icon: MapIcon,
              tint: "#E4EFFB",
              colour: "#2F7FD6",
              t: "Routed for real",
              d: "Distances and times on actual Goa roads.",
            },
            {
              Icon: Sparkles,
              tint: "#F5E8F8",
              colour: "#B45FC4",
              t: "Yours to change",
              d: "Swap any meal, activity or transfer.",
            },
          ].map(({ Icon, tint, colour, t, d }) => (
            <div
              key={t}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]"
            >
              <span
                className="grid h-9 w-9 flex-none place-items-center rounded-xl"
                style={{ background: tint }}
              >
                <Icon size={16} style={{ color: colour }} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-black">
                  {t}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-black/45">
                  {d}
                </span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </TravelShell>
  );
}
