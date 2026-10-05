"use client";

import { Navigation, Phone, Star } from "lucide-react";
import type { LivePlace, Provenance } from "@/lib/live-types";

/**
 * The live facts about a place, and the two things a guest does with them.
 *
 * Rating, review count and open-now come straight from Google Maps via
 * SerpApi. The source chip is not decoration: it is how a saved demo result
 * stays distinguishable from a live one.
 */

const LABEL: Record<Provenance, string> = {
  live: "Live",
  cached: "Live · cached",
  saved: "Saved example",
  offline: "Offline sample",
};

export function ProvenanceChip({ provenance }: { provenance: Provenance }) {
  const live = provenance === "live" || provenance === "cached";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
        live ? "bg-[#E1F3EC] text-[#1A7A3A]" : "bg-[#F2F2F7] text-[#6B6B6B]"
      }`}
      title={
        live
          ? "Fetched from Google Maps through SerpApi"
          : provenance === "saved"
            ? "A real SerpApi response saved for demos — not fetched just now"
            : "No live search available; showing the built-in sample"
      }
    >
      {live && <span className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />}
      {LABEL[provenance]} · SerpApi
    </span>
  );
}

const dialable = (phone: string) => phone.replace(/[^0-9+]/g, "");

export default function LivePlaceMeta({
  place,
  provenance,
}: {
  place: LivePlace;
  provenance?: Provenance;
}) {
  // SerpApi separates with "·" in practice and "⋅" in its docs; accept both.
  const open = place.openState?.split(/[⋅·]/)[0]?.trim();
  const isOpen = open ? /^open/i.test(open) : undefined;

  return (
    <div
      className="mt-1.5 flex flex-col gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-[#6B6B6B]">
        {place.rating !== undefined && (
          <span className="inline-flex items-center gap-0.5 font-bold text-[#1A1A1A]">
            <Star size={10} className="fill-[#F5A623] text-[#F5A623]" />
            {place.rating.toFixed(1)}
            {place.reviews !== undefined && (
              <span className="font-semibold text-[#8E8E93]">
                ({place.reviews.toLocaleString("en-IN")})
              </span>
            )}
          </span>
        )}
        {open && (
          <span
            className={`font-semibold ${isOpen ? "text-[#34C759]" : "text-[#8E8E93]"}`}
          >
            {place.openState}
          </span>
        )}
        {place.price && <span className="font-semibold">{place.price}</span>}
        {provenance && <ProvenanceChip provenance={provenance} />}
      </div>
      <div className="flex gap-1.5">
        {place.phone && (
          <a
            href={`tel:${dialable(place.phone)}`}
            className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEA] px-2.5 py-1 text-[10.5px] font-bold text-[#B8860B] active:opacity-70"
          >
            <Phone size={10} /> Call
          </a>
        )}
        <a
          href={place.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F7] px-2.5 py-1 text-[10.5px] font-bold text-[#1A1A1A] active:opacity-70"
        >
          <Navigation size={10} /> Directions
        </a>
      </div>
    </div>
  );
}
