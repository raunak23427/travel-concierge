"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  MessageCircle,
  Star,
  BadgeCheck,
  ChevronDown,
} from "lucide-react";
import {
  byKind,
  commissionOn,
  dialable,
  rupees,
  type Vendor,
  type VendorKind,
} from "@/data/vendors";

/**
 * Bookable supply under each itinerary tab.
 *
 * The plan tells a guest where to go; this is how they actually book it, and
 * how the app earns. Every row is a real transaction we take a cut of, so the
 * call and WhatsApp actions are the primary controls rather than an
 * afterthought buried in a detail sheet.
 *
 * Commission is shown to us, not to the guest — a traveller does not need to
 * see our margin, and showing it would make the recommendation look bought.
 * It is behind the same toggle the team uses to sanity-check the numbers.
 */

const HEADINGS: Record<VendorKind, { title: string; sub: string }> = {
  food: {
    title: "Book a table",
    sub: "Local kitchens we work with, in the areas you're staying",
  },
  activity: {
    title: "Book an experience",
    sub: "Operators with their own boats, jeeps and guides",
  },
  transport: {
    title: "Book transport",
    sub: "Rentals and drivers, delivered to where you're staying",
  },
};

function VendorRow({ v }: { v: Vendor }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[14px] font-bold text-black">
              {v.name}
            </p>
            {v.partner && (
              <BadgeCheck size={13} className="flex-none text-[#FF6B1A]" />
            )}
          </div>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-black/45">
            {v.blurb}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-black/45">
            <span className="inline-flex items-center gap-0.5 font-semibold text-black/60">
              <Star size={10} className="fill-[#F5A623] text-[#F5A623]" />
              {v.rating}
            </span>
            <span>·</span>
            <span>{v.area}</span>
          </div>
        </div>

        <div className="flex-none text-right">
          <p className="tnum text-[14px] font-bold text-black">
            {v.price > 0 ? rupees(v.price) : "Free"}
          </p>
          <p className="text-[10.5px] text-black/40">{v.unit}</p>
        </div>
      </div>

      {v.phone !== "—" && (
        <div className="mt-3 flex gap-2">
          <a
            href={`tel:${dialable(v.phone)}`}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#FF6B1A] text-[12.5px] font-bold text-[#1A1A1A] transition-transform active:scale-[0.97]"
          >
            <Phone size={13} /> Call
          </a>
          <a
            href={`https://wa.me/${dialable(v.phone).replace(/^\+/, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#E1F3EC] text-[12.5px] font-bold text-[#1A7A3A] transition-transform active:scale-[0.97]"
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

export default function BookingOptions({ kind }: { kind: VendorKind }) {
  const vendors = byKind(kind);
  const [showEarnings, setShowEarnings] = useState(false);
  const heading = HEADINGS[kind];

  if (!vendors.length) return null;

  // What the app makes if the guest books one of each. Useful for us; never
  // framed as something the traveller pays on top.
  const potential = vendors.reduce((sum, v) => sum + commissionOn(v), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 flex flex-col gap-2.5"
    >
      <div>
        <h3 className="text-[15px] font-bold text-black">{heading.title}</h3>
        <p className="mt-0.5 text-[12px] text-black/45">{heading.sub}</p>
      </div>

      {vendors.map((v) => (
        <VendorRow key={v.id} v={v} />
      ))}

      <button
        type="button"
        onClick={() => setShowEarnings((s) => !s)}
        className="mt-1 flex items-center justify-center gap-1.5 py-2 text-[11.5px] font-semibold text-black/35"
      >
        Partner economics
        <ChevronDown
          size={12}
          className={
            showEarnings
              ? "rotate-180 transition-transform"
              : "transition-transform"
          }
        />
      </button>

      {showEarnings && (
        <div className="rounded-2xl bg-[#FFF1E8] px-4 py-3.5">
          <p className="text-[12px] font-bold text-[#C2410C]">
            {rupees(potential)} to TravelBuddy if one of each is booked
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {vendors
              .filter((v) => v.commission > 0)
              .map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 text-[11px] text-black/50"
                >
                  <span className="min-w-0 flex-1 truncate">{v.name}</span>
                  <span className="tnum flex-none">
                    {Math.round(v.commission * 100)}% ·{" "}
                    {rupees(commissionOn(v))}
                  </span>
                </div>
              ))}
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-black/40">
            Sample supply for the prototype. Real rates, real venues,
            placeholder numbers — no partner agreements are signed yet.
          </p>
        </div>
      )}
    </motion.div>
  );
}
