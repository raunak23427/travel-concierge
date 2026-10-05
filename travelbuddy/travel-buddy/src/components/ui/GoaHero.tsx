"use client";

import { useEffect, useState } from "react";

/**
 * Slow crossfading hero of real Goa photographs, with a gentle Ken Burns
 * drift so a still image still feels alive. Replaces the generic stock
 * aeroplane clip — this is the actual place the app plans trips for.
 *
 * Photos are the same Wikimedia Commons set used by the swipe deck; see
 * /public/goa/credits.json for attribution.
 */

const FRAMES = [
  { src: "/goa/sunset-anjuna.jpg", label: "Anjuna" },
  { src: "/goa/fontainhas-street.jpg", label: "Fontainhas, Panjim" },
  { src: "/goa/dudhsagar.jpg", label: "Dudhsagar Falls" },
  { src: "/goa/shack-curlies.jpg", label: "Anjuna beach shack" },
  { src: "/goa/palolem-south.jpg", label: "Palolem" },
  { src: "/goa/fire-dancing.jpg", label: "Morjim" },
];

const HOLD_MS = 3800;

export default function GoaHero() {
  const [i, setI] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % FRAMES.length), HOLD_MS);
    return () => clearInterval(t);
  }, [reduced]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1A1A1A]">
      {FRAMES.map((f, n) => {
        const active = n === i;
        return (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={f.src}
            src={f.src}
            alt={f.label}
            aria-hidden={!active}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: active ? 1 : 0,
              transform: reduced
                ? "none"
                : `scale(${active ? 1.08 : 1}) translateZ(0)`,
              transition: reduced
                ? "opacity 600ms ease"
                : `opacity 1200ms ease, transform ${HOLD_MS + 1200}ms linear`,
              willChange: "opacity, transform",
            }}
            draggable={false}
          />
        );
      })}

      {/* Legibility scrim for the copy that sits over the bottom of the image */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />

      {/* Location caption */}
      <div className="absolute left-5 bottom-14 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFD233]" />
        <span
          className="text-white/85 text-[11px] font-semibold tracking-wide uppercase"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,.5)" }}
        >
          {FRAMES[i].label}
        </span>
      </div>

      {/* Progress dots */}
      <div className="absolute left-5 bottom-7 flex gap-1.5">
        {FRAMES.map((f, n) => (
          <span
            key={f.src}
            className="h-[3px] rounded-full transition-all duration-500"
            style={{
              width: n === i ? 18 : 6,
              background: n === i ? "#FFD233" : "rgba(255,255,255,.45)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
