"use client";

import { motion } from "framer-motion";
import { CheckCircle, MapPin, ArrowRight, Download } from "lucide-react";
import { TripItinerary } from "@/data/itineraryMock";
import type { PaymentSuccessDetails } from "@/components/itinerary/PaymentGateway";
import { downloadBookingConfirmationPdf } from "@/lib/bookingPdf";
import LivePlaceMeta, { ProvenanceChip } from "./LivePlaceMeta";
import {
  calculateItineraryCosts,
  withCalculatedItineraryCosts,
} from "@/lib/itineraryCosts";

export default function BookingSuccess({
  destination,
  country,
  duration,
  totalCost,
  image,
  onReset,
  onGoHome,
  itinerary,
  paymentDetails,
  bookedAt,
}: {
  destination: string;
  country: string;
  duration: string;
  totalCost: number;
  image: string;
  onReset: () => void;
  onGoHome: () => void;
  userEmail?: string | null;
  itinerary?: TripItinerary | null;
  paymentDetails?: PaymentSuccessDetails | null;
  bookedAt?: string;
}) {
  const displayedTotalCost = itinerary
    ? calculateItineraryCosts(itinerary).totalCost
    : totalCost;
  // The stops on this plan that are real places found through SerpApi.
  const seenPlace = new Set<string>();
  const livePlaces = (itinerary?.days ?? [])
    .flatMap((d) => d.items.map((i) => i.place))
    .filter((p): p is NonNullable<typeof p> =>
      !!p && (seenPlace.has(p.id) ? false : (seenPlace.add(p.id), true)),
    );

  return (
    <div
      className="min-h-[100dvh] overflow-y-auto"
      style={{ background: "var(--tb-page-grad)" }}
    >
      {/* ═══ Full-bleed Hero Image with Confirmation ═══ */}
      <motion.div
        className="relative w-full h-[300px] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Background destination image */}
        <img
          src={image}
          alt={destination}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = "none";
            if (e.currentTarget.parentElement) {
              e.currentTarget.parentElement.style.background =
                "linear-gradient(135deg, #2D7D6F, #1A1A2E)";
            }
          }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/85" />

        {/* Confirmation content overlaid on image */}
        {/* One confirmation, stated once, sitting on the destination. */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-7">
          <motion.div
            className="w-12 h-12 rounded-full bg-[#34C759] flex items-center justify-center mb-4 shadow-[0_6px_20px_rgba(52,199,89,0.45)]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 220 }}
          >
            <CheckCircle className="w-7 h-7 text-white" strokeWidth={2.2} />
          </motion.div>
          <motion.p
            className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-white/70"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            Plan confirmed
          </motion.p>
          <motion.h1
            className="font-display text-white text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] mt-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {destination}
          </motion.h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-white/55" />
            <span className="text-white/55 text-[12.5px] font-medium">
              {country}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ═══ Trip Details Bar ═══ */}
      <motion.div
        className="mx-5 -mt-5 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] px-5 py-4 flex justify-between items-center mb-6 relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.45 }}
      >
        <div>
          <p className="text-[10px] text-[#8E8E93] font-medium uppercase tracking-wider mb-0.5">
            Duration
          </p>
          <p className="tnum text-[15.5px] font-bold text-[#1A1A1A]">
            {duration}
          </p>
        </div>
        <div className="w-px h-8 bg-[#F2F2F7]" />
        <div className="text-right">
          <p className="text-[10px] text-[#8E8E93] font-medium uppercase tracking-wider mb-0.5">
            Estimated Cost
          </p>
          <p className="tnum font-display text-[24px] font-semibold text-[#1A1A1A]">
            ₹{displayedTotalCost.toLocaleString("en-IN")}
          </p>
        </div>
      </motion.div>

      {/* ═══ What on this plan is real ═══ */}
      {livePlaces.length > 0 && (
        <motion.div
          className="mx-5 mb-8 rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-[#E25A0F] tracking-[0.12em] uppercase mb-1.5">
                Real places, found live
              </p>
              <h2 className="text-[18px] font-bold text-[#1A1A1A] leading-snug">
                {livePlaces.length} stops on your plan are on Google Maps
              </h2>
            </div>
            <ProvenanceChip provenance={itinerary?.live?.provenance ?? "live"} />
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#8E8E93]">
            Ratings, opening hours and phone numbers come from SerpApi searches
            made for your swipes, around where you&apos;re staying.
          </p>
          <div className="mt-4 flex flex-col gap-3.5">
            {livePlaces.slice(0, 3).map((p) => (
              <div key={p.id}>
                <p className="flex items-center gap-1 text-[14px] font-bold text-[#1A1A1A]">
                  <MapPin className="w-3.5 h-3.5 text-[#E25A0F]" /> {p.name}
                </p>
                <LivePlaceMeta place={p} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ CTA ═══ */}
      <motion.div
        className="px-5 pb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
      >
        {itinerary && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() =>
              downloadBookingConfirmationPdf({
                itinerary: withCalculatedItineraryCosts(itinerary),
                payment: paymentDetails || undefined,
                bookedAt,
              })
            }
            className="w-full py-[17px] mb-2.5 bg-[#FF6B1A] text-[#1A1A1A] rounded-full text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(255,107,26,0.35)]"
          >
            <Download className="w-4 h-4" strokeWidth={2.4} />
            Download & Share PDF Plan
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onGoHome}
          className="w-full py-[17px] bg-[#1A1A1A] text-white rounded-full text-[15px] font-bold flex items-center justify-center gap-2"
        >
          Go to my trip
          <ArrowRight className="w-4 h-4" />
        </motion.button>

        <button
          onClick={onReset}
          className="w-full py-3.5 mt-1 text-[13.5px] font-semibold text-[#8E8E93] active:text-[#1A1A1A] transition-colors"
        >
          Plan another trip
        </button>
        <p className="text-center text-[11px] text-[#C7C7CC] mt-1">
          Saved to your profile
        </p>
      </motion.div>
    </div>
  );
}
