/**
 * Demo 2 — the proactive scheduler.
 * Ticks across the stay. On the day the advisory lands, the agent wakes,
 * decides the guest needs to hear from it, reroutes the itinerary and
 * messages the host — with no guest input at all.
 *
 * Run: node demo/proactive.js
 */
const { tick } = require("../src/scheduler");
const { impl } = require("../src/tools");
const { run } = require("../src/agent");

const C = {
  d: "\x1b[2m",
  r: "\x1b[0m",
  b: "\x1b[1m",
  grn: "\x1b[38;5;79m",
  org: "\x1b[38;5;209m",
  wht: "\x1b[97m",
  gry: "\x1b[38;5;245m",
  red: "\x1b[38;5;203m",
};

const DAYS = ["2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16"];

(async () => {
  console.log(
    `${C.b}${C.grn}\n  SARATHI SCHEDULER${C.r}${C.gry}  ·  proactive trigger evaluation  ·  no guest input${C.r}\n`,
  );

  for (const now of DAYS) {
    console.log(`${C.d}${"─".repeat(74)}${C.r}`);
    console.log(`${C.b}${C.wht}  tick ${now}${C.r}`);

    const fired = tick(now, {
      onEvaluate: (e) => {
        const mark = e.fired ? `${C.org}FIRE${C.r}` : `${C.d}quiet${C.r}`;
        console.log(
          `    ${mark}  ${C.gry}${e.trigger.padEnd(16)}${C.r}${C.d}${e.describe}${C.r}`,
        );
      },
    });

    for (const f of fired) {
      console.log(
        `\n  ${C.org}▲ ${f.trigger}${C.r} — ${C.wht}${f.reason}${C.r}`,
      );

      if (f.action === "propose_reroute") {
        // Deterministic pre-check, then the agent composes and acts.
        const safe = impl.find_nearby({
          category: "activity",
          area: f.booking.area,
          monsoon_safe: true,
          limit: 2,
        });
        console.log(
          `    ${C.d}monsoon-safe alternatives:${C.r} ${safe.results.map((r) => `${r.name} (${r.distance_km}km)`).join(", ")}`,
        );

        const { reply, trace } = await run(
          `The weather advisory for today is: ${f.weather.advisory} (${f.weather.rain_mm}mm). ` +
            `Day ${f.day} of the guest's plan is not monsoon-safe. Move it to the last day, ` +
            `substitute a monsoon-safe activity for today, tell the host the scooter is needed ` +
            `one day later, then write the guest a short WhatsApp message explaining what you changed.`,
          { bookingId: f.booking.booking_id, today: now },
        );

        trace.forEach((t) => {
          console.log(`    ${C.d}[${t.step}]${C.r} ${C.grn}${t.tool}${C.r}`);
          if (t.result.diff)
            t.result.diff.forEach((d) =>
              console.log(
                `         ${C.gry}day ${d.day}: ${d.before}${C.r} → ${C.org}${d.after}${C.r}`,
              ),
            );
          if (t.result.status === "delivered")
            console.log(
              `         ${C.gry}host ${t.result.to} ←${C.r} ${C.grn}delivered${C.r}`,
            );
        });

        console.log(`\n  ${C.grn}  sarathi → guest ▸${C.r} ${reply}\n`);
      } else {
        console.log(`    ${C.d}action: ${f.action}${C.r}\n`);
      }
    }
    console.log("");
  }

  console.log(
    `${C.d}  Triggers are idempotent — re-running a tick sends nothing twice.${C.r}\n`,
  );
})();
