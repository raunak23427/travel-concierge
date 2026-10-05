"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import type { LivePlace, Provenance } from "@/lib/live-types";
import LivePlaceMeta, { ProvenanceChip } from "./LivePlaceMeta";

/**
 * How a guest actually gets each part of the plan.
 *
 * Food and experiences show the real places already on the plan, with live
 * ratings, opening hours, a phone number and directions — no extra search,
 * because the plan was built from those results. Transport has nothing on the
 * plan to reuse, so it makes one live search for rentals and taxis near the
 * stay.
 */

type Kind = "food" | "activity" | "transport";

const HEADINGS: Record<Kind, { title: string; sub: string }> = {
  food: {
    title: "Book a table",
    sub: "The places on your plan, with live ratings and hours",
  },
  activity: {
    title: "Book an experience",
    sub: "Operators on your plan — call or get directions",
  },
  transport: {
    title: "Getting around",
    sub: "Scooter rentals and taxis near where you're staying",
  },
};

type Row = LivePlace & { provenance?: Provenance };

function PlaceRow({ p }: { p: Row }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-black">{p.name}</p>
          {(p.category || p.address) && (
            <p className="mt-0.5 flex items-center gap-1 text-[11.5px] leading-relaxed text-black/45">
              {p.address && <MapPin size={10} className="flex-none" />}
              <span className="truncate">
                {[p.category, p.address?.split(",").slice(0, 2).join(",")]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </p>
          )}
          <LivePlaceMeta place={p} />
        </div>
      </div>
    </div>
  );
}

export default function BookingOptions({
  kind,
  places,
  area,
}: {
  kind: Kind;
  /** Live places already on the plan, for food and activity. */
  places?: Row[];
  /** The guest's stay area, used to search transport near it. */
  area?: string;
}) {
  const heading = HEADINGS[kind];
  const [fetched, setFetched] = useState<{
    items: Row[];
    provenance: Provenance;
  } | null>(null);

  useEffect(() => {
    if (kind !== "transport") return;
    let cancelled = false;
    const params = new URLSearchParams({ kind: "transport" });
    if (area) params.set("area", area);
    fetch(`/api/live/places?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json)
          setFetched({ items: json.items ?? [], provenance: json.provenance });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [kind, area]);

  const rows = kind === "transport" ? (fetched?.items ?? []) : (places ?? []);
  const seen = new Set<string>();
  const unique = rows
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .slice(0, 6);
  if (!unique.length) return null;

  const provenance: Provenance =
    kind === "transport"
      ? (fetched?.provenance ?? "offline")
      : (unique[0].provenance ?? "live");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 flex flex-col gap-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-black">{heading.title}</h3>
          <p className="mt-0.5 text-[12px] text-black/45">{heading.sub}</p>
        </div>
        <ProvenanceChip provenance={provenance} />
      </div>
      {unique.map((p) => (
        <PlaceRow key={p.id} p={p} />
      ))}
    </motion.div>
  );
}
