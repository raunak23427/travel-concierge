"use client";

import { useEffect, useState } from "react";

/**
 * The one loading screen for the whole app: the Wayzyy mark, a breathing
 * ring, and a fact about Goa so the wait reads as part of the trip rather
 * than dead time.
 */

const GOA_FACTS = [
  "Goa faces west, so every single evening of your trip ends in a sunset over the Arabian Sea.",
  "Portugal ruled Goa for 451 years — longer than the British ruled India.",
  "Fontainhas in Panjim is the best-preserved Latin Quarter in Asia, and residents repaint it every year after the rains.",
  "Feni is the only Indian spirit with a Geographical Indication. It can legally only be made in Goa.",
  "Beach shacks are rebuilt from scratch every October, after the monsoon takes the last ones away.",
  "Bebinca has sixteen layers, each grilled separately. A proper one takes most of a day.",
  "Goa is one of the only Indian states where casinos are legal — and the big ones float on the Mandovi.",
  "Dudhsagar means 'sea of milk'. It falls 310 metres, and private cars can't reach the base.",
  "Goan fish curry is soured with kokum, not tamarind. That's what makes it taste unlike anywhere else.",
  "Anjuna's flea market has run every Wednesday since the 1970s, when hippies sold their things to fund the trip home.",
  "Old Goa was once larger than London or Lisbon, until cholera emptied it.",
  "At 3,702 km², Goa is India's smallest state — you can drive coast to border in under two hours.",
];

export default function BrandLoader({
  message = "Loading",
  fact,
}: {
  message?: string;
  /** Pin a specific fact; otherwise one is picked at random and rotates. */
  fact?: string;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (fact) return;
    setI(Math.floor(Math.random() * GOA_FACTS.length));
    const t = setInterval(() => setI((n) => (n + 1) % GOA_FACTS.length), 5200);
    return () => clearInterval(t);
  }, [fact]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-[60vh] place-items-center px-8"
    >
      <div className="flex w-full max-w-[320px] flex-col items-center text-center">
        <div className="relative mb-6 grid h-[76px] w-[76px] place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#FF6B1A]/25" />
          <span className="absolute inset-0 rounded-full border-[3px] border-[#FF6B1A]/35 border-t-[#FF6B1A] animate-spin" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/wayzyy-logo.svg"
            alt=""
            width={48}
            height={48}
            className="relative h-12 w-12 rounded-2xl"
          />
        </div>

        <p className="text-[13.5px] font-bold text-black/70">{message}</p>

        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#E25A0F]">
          Did you know
        </p>
        <p
          key={fact || i}
          className="mt-2 text-[13px] leading-relaxed text-black/45"
          style={{ animation: "tbFactIn 500ms ease both" }}
        >
          {fact || GOA_FACTS[i]}
        </p>
      </div>

      <style jsx global>{`
        @keyframes tbFactIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
