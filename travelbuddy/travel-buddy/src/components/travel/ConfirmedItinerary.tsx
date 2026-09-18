"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Map as MapIcon,
  Sparkles,
  ArrowRight,
  Check,
  Trash2,
} from "lucide-react";
import TravelShell from "./TravelShell";
import { useState } from "react";
import { useTravel } from "./TravelProvider";
import ItineraryView from "@/components/itinerary/ItineraryView";
import type { TripItinerary } from "@/data/itineraryMock";
import BrandLoader from "@/components/ui/BrandLoader";
import TelegramConnect from "./TelegramConnect";

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
  const [confirmDelete, setConfirmDelete] = useState(false);

  /** Clear the saved trip and the planner scratch state, then start over. */
  const deletePlan = () => {
    try {
      Object.keys(localStorage)
        .filter(
          (k) =>
            k.startsWith("tb:travel:v1:") ||
            k.startsWith("tb:planner:") ||
            k === "travelbuddy:transport-modes",
        )
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {
      /* private mode */
    }
    window.location.href = "/home";
  };

  if (!ready)
    return (
      <TravelShell>
        <BrandLoader message="Loading your plan" />
      </TravelShell>
    );

  // Booked and complete — hand straight over to the full itinerary view.
  if ((trip?.days?.length || 0) > 0)
    return (
      <div className="pb-[96px]">
        {/* Plan history + a way to bin it. Every item inside the view below is
            editable via its own Replace action. */}
        <div className="px-5 pt-4">
          <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#E1F3EC]">
              <Check size={16} className="text-[#2DA87F]" strokeWidth={2.6} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-black">
                {trip!.name || `Trip to ${trip!.destination}`}
              </p>
              <p className="mt-0.5 text-[11.5px] text-black/45">
                {trip!.bookedAt
                  ? `Confirmed ${new Date(trip!.bookedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                  : "Saved plan"}
                {trip!.startDate
                  ? ` · ${trip!.startDate} → ${trip!.endDate}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete this plan"
              className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#FDEAE3] text-[#E9633B] active:scale-95 transition-transform"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="mt-2.5">
            <TelegramConnect trip={trip!} />
          </div>
        </div>

        <ItineraryView
          itinerary={toItinerary(trip!)}
          onReset={() => {
            window.location.href = "/plan?new=1";
          }}
          onBack={() => {
            window.location.href = "/home";
          }}
        />

        {confirmDelete && (
          <div className="fixed inset-y-0 left-1/2 z-50 flex w-full max-w-[448px] -translate-x-1/2 items-end bg-black/40">
            <div className="w-full rounded-t-3xl bg-white p-6 pb-10">
              <h2 className="text-[19px] font-bold text-black">
                Delete this plan?
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-black/50">
                Your itinerary, swipes and transport choices for{" "}
                {trip!.destination} will be removed. This can&apos;t be undone.
              </p>
              <button
                type="button"
                onClick={deletePlan}
                className="mt-5 w-full rounded-full bg-[#E9633B] py-4 text-[15px] font-bold text-white active:scale-[0.98] transition-transform"
              >
                Delete plan
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="mt-2 w-full py-3.5 text-[14px] font-semibold text-[#8E8E93]"
              >
                Keep it
              </button>
            </div>
          </div>
        )}
      </div>
    );

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
            {"Nothing planned yet."}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-black/45">
            Once you&apos;ve answered a few questions and swiped through Goa,
            your day-by-day plan appears here.
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
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FF6B1A] text-[16px] font-bold text-black shadow-[0_8px_24px_rgba(255,107,26,0.35)] active:scale-[0.98] transition-transform"
            >
              {"Start planning"}
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
