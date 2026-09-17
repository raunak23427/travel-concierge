"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, Info } from "lucide-react";
import {
  locate,
  route,
  modeEstimate,
  formatMinutes,
  readTransportModes,
  TRANSPORT_META,
  type LatLng,
  type TransportMode,
  type Leg,
} from "@/lib/goa-geo";
import type { ItineraryDay } from "@/data/itineraryMock";

/**
 * Getting around, costed against the modes the guest actually chose.
 *
 * Each hop between consecutive stops is geocoded and routed through OSRM, so
 * the distances and durations are real road numbers rather than guesses. Where
 * the router can't be reached we fall back to a great-circle estimate and say
 * so rather than presenting it as routed.
 */

type Hop = {
  day: number;
  from: string;
  to: string;
  leg: Leg;
};

export default function TransportTab({ days }: { days: ItineraryDay[] }) {
  const [modes, setModes] = useState<TransportMode[]>([]);
  const [hops, setHops] = useState<Hop[]>([]);
  const [loading, setLoading] = useState(true);
  const [anyEstimated, setAnyEstimated] = useState(false);

  useEffect(() => {
    setModes(readTransportModes());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const out: Hop[] = [];
      let estimated = false;

      for (const day of days) {
        const items = (day.items || []).filter((i) => i.activity);
        const located: { label: string; at: LatLng }[] = [];
        for (const it of items) {
          const at = await locate(it.activity);
          if (at) located.push({ label: it.activity, at });
        }
        for (let i = 0; i < located.length - 1; i++) {
          const a = located[i];
          const b = located[i + 1];
          const leg = await route(a.at, b.at, "driving");
          if (!leg.routed) estimated = true;
          out.push({ day: day.day, from: a.label, to: b.label, leg });
        }
      }

      if (!cancelled) {
        setHops(out);
        setAnyEstimated(estimated);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const totalKm = Math.round(hops.reduce((s, h) => s + h.leg.km, 0) * 10) / 10;
  const active = modes.length
    ? modes
    : (["Scooter", "Taxi"] as TransportMode[]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4"
    >
      <div>
        <h2 className="font-display text-[21px] font-semibold text-[#1A1A1A]">Getting Around</h2>
        <p className="text-[12.5px] text-[#8E8E93] mt-1">
          Distances and times from OpenStreetMap routing, costed for the modes
          you picked.
        </p>
      </div>

      {/* Chosen modes, with what the whole trip would cost on each */}
      <div className="flex flex-col gap-2.5">
        {active.map((m) => {
          const meta = TRANSPORT_META[m];
          const totalCost = hops.reduce(
            (s, h) => s + modeEstimate(h.leg, m).cost,
            0,
          );
          const totalMin = hops.reduce(
            (s, h) => s + modeEstimate(h.leg, m).minutes,
            0,
          );
          return (
            <div
              key={m}
              className="bg-white rounded-2xl shadow-[0_1px_6px_rgba(0,0,0,0.05)] px-4 py-3.5 flex items-center gap-3"
            >
              <span className="w-10 h-10 rounded-xl bg-[#F7F7FA] grid place-items-center text-[18px] flex-none">
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#1A1A1A]">{m}</p>
                <p className="text-[11px] text-[#8E8E93] mt-0.5">{meta.note}</p>
              </div>
              <div className="text-right flex-none">
                <p className="tnum text-[14px] font-bold text-[#1A1A1A]">
                  {totalCost > 0
                    ? `₹${totalCost.toLocaleString("en-IN")}`
                    : "Free"}
                </p>
                <p className="text-[11px] text-[#8E8E93]">
                  {loading ? "—" : formatMinutes(totalMin)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-hop breakdown */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-[14.5px] font-bold text-[#1A1A1A]">
            Journey by journey
          </h3>
          {!loading && (
            <span className="text-[12px] text-[#8E8E93]">
              {totalKm} km total
            </span>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl px-4 py-8 grid place-items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8E8E93]" />
            <p className="text-[12.5px] text-[#8E8E93]">
              Routing your stops on OpenStreetMap…
            </p>
          </div>
        ) : hops.length === 0 ? (
          <p className="text-center text-[#8E8E93] py-8 text-[13px]">
            No journeys to plan yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {hops.map((h, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-[0_1px_6px_rgba(0,0,0,0.05)] px-4 py-3.5"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#F5A623]">
                  Day {h.day}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[13.5px] font-semibold text-[#1A1A1A] truncate flex-1 min-w-0">
                    {h.from}
                  </p>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8E8E93] flex-none" />
                  <p className="text-[13.5px] font-semibold text-[#1A1A1A] truncate flex-1 min-w-0 text-right">
                    {h.to}
                  </p>
                </div>
                <p className="text-[11.5px] text-[#8E8E93] mt-1.5">
                  {h.leg.km} km{h.leg.routed ? "" : " (estimated)"}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {active.map((m) => {
                    const e = modeEstimate(h.leg, m);
                    const silly = m === "Walking" && h.leg.km > 3;
                    return (
                      <span
                        key={m}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          silly
                            ? "bg-[#F7F7FA] text-[#C4C4CC] line-through"
                            : "bg-[#F7F7FA] text-[#1A1A1A]"
                        }`}
                      >
                        {e.icon} {formatMinutes(e.minutes)}
                        {e.cost > 0 ? ` · ₹${e.cost}` : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {anyEstimated && !loading && (
        <div className="flex items-start gap-2 rounded-2xl bg-[#FFF9E0] px-4 py-3">
          <Info className="w-3.5 h-3.5 text-[#F5A623] mt-0.5 flex-none" />
          <p className="text-[11.5px] text-[#6B6B6B] leading-relaxed">
            Some legs are straight-line estimates — the public routing service
            didn't answer in time for those.
          </p>
        </div>
      )}
    </motion.div>
  );
}
