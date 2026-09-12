/**
 * Demo 1 — reactive agent, with the full tool trace printed.
 * Run: node demo/chat.js
 */
const { run, MODEL } = require("../src/agent");

const C = {
  d: "\x1b[2m",
  r: "\x1b[0m",
  b: "\x1b[1m",
  grn: "\x1b[38;5;79m",
  org: "\x1b[38;5;209m",
  wht: "\x1b[97m",
  gry: "\x1b[38;5;245m",
};

const BOOKING = "WZY-4471";
const TODAY = "2026-09-15";

const QUESTIONS = [
  "hey, where should we eat tonight? somewhere close, not too expensive",
  "is the dudhsagar trip today still happening?",
];

function hr(label) {
  console.log(`\n${C.d}${"─".repeat(74)}${C.r}`);
  if (label) console.log(`${C.b}${C.wht} ${label}${C.r}`);
}

(async () => {
  console.log(
    `${C.b}${C.grn}\n  SARATHI${C.r}${C.gry}  in-trip concierge  ·  agent loop  ·  model=${MODEL}${C.r}`,
  );
  console.log(
    `${C.gry}  booking ${BOOKING}  ·  Casa Amarela, Assagao  ·  today ${TODAY}${C.r}`,
  );

  for (const q of QUESTIONS) {
    hr();
    console.log(`${C.org}  guest ▸${C.r} ${C.wht}${q}${C.r}\n`);

    const t0 = Date.now();
    const { reply, trace } = await run(q, {
      bookingId: BOOKING,
      today: TODAY,
      onStep: (e) => {
        const a = JSON.stringify(e.args);
        const short = a.length > 78 ? a.slice(0, 75) + "..." : a;
        console.log(
          `  ${C.d}[${e.step}]${C.r} ${C.grn}${e.tool}${C.r}${C.gry}(${short})${C.r} ${C.d}${e.ms}ms${C.r}`,
        );
        const res = e.result;
        if (res.results) {
          res.results.forEach((r) =>
            console.log(
              `       ${C.d}↳${C.r} ${r.name} ${C.gry}· ${r.distance_km}km · ₹${r.avg_cost_inr} · score ${r.score}${C.r}`,
            ),
          );
        } else if (res.diff) {
          res.diff.forEach((d) =>
            console.log(
              `       ${C.d}↳${C.r} day ${d.day}: ${C.gry}${d.before}${C.r} → ${C.org}${d.after}${C.r}`,
            ),
          );
        } else if (res.advisory !== undefined) {
          console.log(
            `       ${C.d}↳${C.r} ${res.condition} · ${res.rain_mm}mm · ${C.org}${res.advisory || "no advisory"}${C.r}`,
          );
        } else if (res.status === "delivered") {
          console.log(
            `       ${C.d}↳${C.r} to ${res.to} · ${C.grn}${res.status}${C.r}`,
          );
        }
      },
    });
    const ms = Date.now() - t0;

    console.log(`\n${C.grn}  sarathi ▸${C.r} ${reply}`);
    console.log(
      `${C.d}  ${trace.length} tool call(s) · ${ms}ms end-to-end · every venue resolved from the KB${C.r}`,
    );
  }
  console.log("");
})();
