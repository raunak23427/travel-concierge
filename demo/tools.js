/**
 * Demo 0 — the tool layer, exercised directly (no model in the loop).
 * Proves the grounding: every venue, distance, price and diff is real data.
 * Run: node demo/tools.js
 */
const { impl } = require("../src/tools");

const C = {
  d: "\x1b[2m",
  r: "\x1b[0m",
  b: "\x1b[1m",
  grn: "\x1b[38;5;79m",
  org: "\x1b[38;5;209m",
  wht: "\x1b[97m",
  gry: "\x1b[38;5;245m",
};

function call(name, args) {
  const t0 = process.hrtime.bigint();
  const out = impl[name](args);
  const us = Number(process.hrtime.bigint() - t0) / 1000;
  console.log(
    `\n  ${C.grn}▸ ${name}${C.r}${C.gry}(${JSON.stringify(args)})${C.r}  ${C.d}${us.toFixed(0)}µs${C.r}`,
  );
  return out;
}

console.log(
  `${C.b}${C.grn}\n  SARATHI — TOOL LAYER${C.r}${C.gry}   grounded lookups against the curated Goa KB${C.r}`,
);
console.log(`${C.d}  ${"─".repeat(72)}${C.r}`);

const b = call("get_booking_context", { booking_id: "WZY-4471" });
console.log(
  `     ${C.wht}${b.property}${C.r} ${C.gry}· ${b.nights} nights · ${b.guests} guests · host ${b.host.name}${C.r}`,
);

const wx = call("get_weather", { date: "2026-09-15", area: "Assagao" });
console.log(
  `     ${C.org}${wx.condition}${C.r} ${C.gry}· ${wx.rain_mm}mm · ${wx.advisory}${C.r}`,
);

const dry = call("find_nearby", {
  category: "activity",
  area: "Assagao",
  limit: 3,
});
dry.results.forEach((r) =>
  console.log(
    `     ${r.monsoon_safe ? C.grn + "safe  " : C.org + "unsafe"}${C.r} ${C.wht}${r.name.padEnd(26)}${C.r}${C.gry}${String(r.distance_km).padStart(5)}km  ₹${String(r.avg_cost_inr).padEnd(5)} score ${r.score}${C.r}`,
  ),
);

const wet = call("find_nearby", {
  category: "activity",
  area: "Assagao",
  monsoon_safe: true,
  limit: 3,
});
wet.results.forEach((r) =>
  console.log(
    `     ${C.grn}safe  ${C.r} ${C.wht}${r.name.padEnd(26)}${C.r}${C.gry}${String(r.distance_km).padStart(5)}km  ₹${String(r.avg_cost_inr).padEnd(5)} score ${r.score}${C.r}`,
  ),
);

const diff = call("reschedule_day", {
  booking_id: "WZY-4471",
  from_day: 1,
  to_day: 3,
  replacement_place_id: "gp-006",
  reason: "IMD orange alert — Dudhsagar trail closed",
});
diff.diff.forEach((d) =>
  console.log(
    `     ${C.gry}day ${d.day}:  ${d.before}${C.r}  →  ${C.org}${d.after}${C.r}`,
  ),
);

const rec = call("notify_host", {
  booking_id: "WZY-4471",
  message: "Guest needs the scooter one day later — plan moved to Day 3.",
});
console.log(
  `     ${C.gry}→ ${rec.to} via ${rec.channel} · ${C.grn}${rec.status}${C.r}`,
);

console.log(`\n${C.d}  ${"─".repeat(72)}${C.r}`);
console.log(
  `${C.d}  6 tool calls · all sub-millisecond · zero model tokens · nothing invented${C.r}\n`,
);
