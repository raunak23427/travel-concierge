"use client";

import { useEffect, useState } from "react";
import { Send, Check, Copy, Users, Loader2 } from "lucide-react";
import { connectedTripId, markConnected, syncTrip } from "@/lib/trip-sync";
import type { SavedTrip } from "@/lib/trip-updates";

/**
 * Connect the trip to the Telegram guide.
 *
 * Two jobs in one card. The obvious one is the deep link that binds a chat to
 * this trip. The quieter one is keeping the server's copy of the itinerary
 * fresh: whenever the trip changes here, it is pushed again, so the bot and
 * the nudges never work from a plan the guest has already edited.
 */

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT;

export default function TelegramConnect({ trip }: { trip: SavedTrip | null }) {
  const [state, setState] = useState<"idle" | "working" | "ready" | "error">(
    "idle",
  );
  const [link, setLink] = useState("");
  const [followers, setFollowers] = useState(0);
  const [copied, setCopied] = useState(false);
  const [warning, setWarning] = useState("");
  const [connected, setConnected] = useState(false);

  // Connecting is remembered, so re-opening the app shows the connected state
  // rather than inviting the guest to link a trip they already linked. The
  // itinerary itself is kept in sync by TravelProvider, app-wide.
  useEffect(() => {
    if (!trip?.id) return;
    if (connectedTripId() === trip.id) setConnected(true);
  }, [trip?.id]);

  // Show the current follower count when returning to an already-linked trip.
  useEffect(() => {
    if (!connected || !trip?.id || state === "ready") return;
    let cancelled = false;
    void fetch(`/api/trip?tripId=${encodeURIComponent(trip.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setFollowers(data.followers ?? 0);
      })
      .catch(() => {
        /* a stale count is not worth surfacing */
      });
    return () => {
      cancelled = true;
    };
  }, [connected, trip?.id, state]);

  if (!trip?.days?.length) return null;

  if (!BOT)
    return (
      <div className="rounded-2xl bg-[#FFF9E0] px-4 py-3.5">
        <p className="text-[13px] font-bold text-black">Telegram guide</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-black/50">
          Set <code>NEXT_PUBLIC_TELEGRAM_BOT</code> to your bot&apos;s username
          to switch this on.
        </p>
      </div>
    );

  const connect = async () => {
    setState("working");
    setWarning("");
    const result = await syncTrip(trip, { withToken: true });
    if (!result?.token) {
      setState("error");
      return;
    }
    markConnected(trip.id);
    setConnected(true);
    setLink(`https://t.me/${BOT}?start=${result.token}`);
    setFollowers(result.followers);
    if (!result.durable)
      setWarning(
        "Storage isn't configured, so this link won't survive a restart.",
      );
    setState("ready");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the link is on screen anyway */
    }
  };

  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#E4F1FB]">
          <Send size={16} className="text-[#2F7FD6]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-black">
            Your guide on Telegram
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-black/45">
            Nudges before every stop, and answers to anything about the trip —
            without opening the app.
          </p>
        </div>
      </div>

      {state !== "ready" ? (
        <>
          <button
            type="button"
            onClick={connect}
            disabled={state === "working"}
            className="mt-3.5 flex h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#FFD233] text-[14.5px] font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {state === "working" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Preparing your link
              </>
            ) : connected ? (
              <>
                <Users size={15} />
                Get an invite link
              </>
            ) : (
              <>
                <Send size={15} />
                Connect Telegram
              </>
            )}
          </button>

          {connected && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11.5px] text-[#2DA87F]">
              <Check size={12} />
              Connected — your guide is following this plan
              {followers > 0
                ? ` (${followers} ${followers === 1 ? "person" : "people"})`
                : ""}
            </p>
          )}
          {state === "error" && (
            <p className="mt-2 text-center text-[11.5px] text-[#E9633B]">
              Couldn&apos;t create the link. Check your connection and try
              again.
            </p>
          )}
        </>
      ) : (
        <>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-3.5 flex h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#2F7FD6] text-[14.5px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            <Send size={15} />
            Open in Telegram
          </a>

          <button
            type="button"
            onClick={copy}
            className="mt-2 flex h-[42px] w-full items-center justify-center gap-2 rounded-full bg-[#F7F7FA] text-[13.5px] font-semibold text-black/70 transition-transform active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check size={14} className="text-[#2DA87F]" />
                Link copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy link for your group
              </>
            )}
          </button>

          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] text-black/45">
            <Users size={12} />
            {followers > 0
              ? `${followers} ${followers === 1 ? "person is" : "people are"} following this trip`
              : "Share it — everyone on the trip gets the same updates"}
          </p>

          {warning && (
            <p className="mt-2 text-center text-[11px] text-[#E9633B]">
              {warning}
            </p>
          )}
        </>
      )}
    </div>
  );
}
