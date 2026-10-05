"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import type { LiveEvent, Provenance } from "@/lib/live-types";
import { ProvenanceChip } from "./LivePlaceMeta";

/**
 * What is on in Goa around the trip — gigs, festivals, theatre, markets.
 * Searched live for the trip's own window, so a guest landing next week
 * sees next week rather than tonight.
 */
export default function LiveEvents({ startDate }: { startDate?: string }) {
  const [data, setData] = useState<{
    items: LiveEvent[];
    provenance: Provenance;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const qs = startDate ? `?start=${encodeURIComponent(startDate)}` : "";
    fetch(`/api/live/events${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json)
          setData({ items: json.items ?? [], provenance: json.provenance });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [startDate]);

  if (!data?.items.length) return null;

  return (
    <div className="mt-6 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-black">
            Happening during your trip
          </h3>
          <p className="mt-0.5 text-[12px] text-black/45">
            Gigs, festivals and shows in Goa, found live
          </p>
        </div>
        <ProvenanceChip provenance={data.provenance} />
      </div>
      {data.items.slice(0, 5).map((e) => {
        const href = e.ticketUrl || e.link;
        const body = (
          <div className="rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
            <p className="text-[14px] font-bold leading-snug text-black">
              {e.title}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-black/45">
              {e.when && (
                <span className="inline-flex items-center gap-1 font-semibold text-black/60">
                  <CalendarDays size={11} /> {e.when}
                </span>
              )}
              {(e.venue || e.address) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} />{" "}
                  {[e.venue, e.address].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        );
        return href ? (
          <a
            key={e.id}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="active:opacity-80"
          >
            {body}
          </a>
        ) : (
          <div key={e.id}>{body}</div>
        );
      })}
    </div>
  );
}
