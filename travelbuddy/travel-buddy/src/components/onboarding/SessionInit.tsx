"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  Users,
  MapPin,
  Search,
  UtensilsCrossed,
  Bike,
  Ticket,
  ShoppingBag,
} from "lucide-react";

export type BudgetCategory = "food" | "travel" | "activities" | "shopping";

export type SessionData = {
  duration: "3-5" | "5-7" | "7-10";
  intendedTravelWindow:
    "within-7-days" | "within-1-month" | "within-3-months" | "within-6-months";
  travelers: number;
  adults: number;
  children: number;
  budget: number; // total — kept as the sum of budgetSplit so downstream code is unchanged
  budgetSplit: Record<BudgetCategory, number>;
  departureCity: string;
  // ── Goa stay preferences ──
  stayArea: string;
  stayProperty: string;
  checkIn: string; // yyyy-mm-dd
  checkOut: string;
  arriveGoa: string;
  departGoa: string;
  nights: number;
  days: number;
  sessionDate: Date; // Captured when the user first opens the onboarding flow
};

const CITIES = [
  "New Delhi",
  "Mumbai",
  "Bangalore",
  "Chennai",
  "Hyderabad",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Kochi",
  "Goa",
  "Indore",
  "Bhopal",
  "Visakhapatnam",
  "Thiruvananthapuram",
  "Coimbatore",
  "Nagpur",
  "Surat",
  "Varanasi",
  "Amritsar",
];

// Where in Goa the guest is actually based — this decides what counts as "nearby".
const GOA_AREAS: { name: string; sub: string }[] = [
  { name: "Assagao", sub: "Cafés & villas" },
  { name: "Anjuna", sub: "Markets & music" },
  { name: "Vagator", sub: "Cliffs & nightlife" },
  { name: "Siolim", sub: "Quiet, riverside" },
  { name: "Morjim", sub: "Long, calm beach" },
  { name: "Arambol", sub: "Bohemian north" },
  { name: "Candolim", sub: "Central & easy" },
  { name: "Calangute", sub: "Busy & built-up" },
  { name: "Panjim", sub: "Heritage capital" },
  { name: "Palolem", sub: "Slow south" },
  { name: "Agonda", sub: "Quietest south" },
  { name: "Colva", sub: "South beach town" },
];

const BUDGET_META: {
  key: BudgetCategory;
  label: string;
  hint: string;
  Icon: typeof UtensilsCrossed;
  colour: string;
  tint: string;
}[] = [
  {
    key: "food",
    label: "Food & drink",
    hint: "Shacks, cafés, dinners",
    Icon: UtensilsCrossed,
    colour: "#E9633B",
    tint: "#FDEAE3",
  },
  {
    key: "travel",
    label: "Travel",
    hint: "Scooter, taxis, transfers",
    Icon: Bike,
    colour: "#2F7FD6",
    tint: "#E4EFFB",
  },
  {
    key: "activities",
    label: "Activities",
    hint: "Tours, forts, boat trips",
    Icon: Ticket,
    colour: "#2DA87F",
    tint: "#E1F3EC",
  },
  {
    key: "shopping",
    label: "Shopping",
    hint: "Markets, crafts, gifts",
    Icon: ShoppingBag,
    colour: "#B45FC4",
    tint: "#F5E8F8",
  },
];

const BUDGET_PRESETS: {
  name: string;
  split: Record<BudgetCategory, number>;
}[] = [
  {
    name: "Shoestring",
    split: { food: 6000, travel: 3000, activities: 4000, shopping: 2000 },
  },
  {
    name: "Comfortable",
    split: { food: 14000, travel: 7000, activities: 11000, shopping: 6000 },
  },
  {
    name: "Premium",
    split: { food: 30000, travel: 16000, activities: 24000, shopping: 15000 },
  },
];

const CATEGORY_MAX = 60000;
const CATEGORY_STEP = 500;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const nightsBetween = (a: string, b: string) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 86400000) : 0;
};
const prettyDate = (d: string) => {
  const x = new Date(d);
  return Number.isFinite(x.getTime())
    ? x.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "—";
};
const inr = (n: number) =>
  `₹${Math.max(0, Math.round(n)).toLocaleString("en-IN")}`;

const deriveDuration = (nights: number): SessionData["duration"] =>
  nights <= 5 ? "3-5" : nights <= 7 ? "5-7" : "7-10";

const deriveWindow = (
  checkIn: string,
  from: Date,
): SessionData["intendedTravelWindow"] => {
  const days = Math.round(
    (new Date(checkIn).getTime() - from.getTime()) / 86400000,
  );
  if (days <= 7) return "within-7-days";
  if (days <= 31) return "within-1-month";
  if (days <= 93) return "within-3-months";
  return "within-6-months";
};

export default function SessionInit({
  onComplete,
}: {
  onComplete: (data: SessionData) => void;
}) {
  const [step, setStep] = useState(0);
  const [citySearch, setCitySearch] = useState("");
  const startedAt = useRef(new Date());

  const defaults = useMemo(() => {
    const inDate = addDays(startedAt.current, 30);
    const outDate = addDays(inDate, 4);
    return { checkIn: iso(inDate), checkOut: iso(outDate) };
  }, []);

  const [data, setData] = useState<SessionData>({
    duration: "3-5",
    intendedTravelWindow: "within-1-month",
    travelers: 2,
    adults: 2,
    children: 0,
    budget: 38000,
    budgetSplit: { ...BUDGET_PRESETS[1].split },
    departureCity: "New Delhi",
    stayArea: "Assagao",
    stayProperty: "",
    checkIn: defaults.checkIn,
    checkOut: defaults.checkOut,
    arriveGoa: defaults.checkIn,
    departGoa: defaults.checkOut,
    nights: 4,
    days: 5,
    sessionDate: startedAt.current,
  });
  const [activePreset, setActivePreset] = useState<string | null>(
    "Comfortable",
  );

  const filteredCities = CITIES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase()),
  );

  // ── Derived values kept in sync with the dates and the budget split ──
  const nights = nightsBetween(data.checkIn, data.checkOut);
  const goaNights = nightsBetween(data.arriveGoa, data.departGoa);
  const budgetTotal = BUDGET_META.reduce(
    (sum, m) => sum + (data.budgetSplit[m.key] || 0),
    0,
  );
  const perNight = Math.round(budgetTotal / Math.max(1, nights));
  const perGuestPerNight = Math.round(perNight / Math.max(1, data.travelers));

  useEffect(() => {
    setData((d) => ({
      ...d,
      nights,
      days: nights > 0 ? nights + 1 : 0,
      duration: deriveDuration(nights),
      intendedTravelWindow: deriveWindow(d.checkIn, startedAt.current),
      budget: budgetTotal,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nights, budgetTotal, data.checkIn]);

  const setBudget = (key: BudgetCategory, value: number) => {
    setActivePreset(null);
    setData((d) => ({
      ...d,
      budgetSplit: {
        ...d.budgetSplit,
        [key]: Math.max(0, Math.round(value) || 0),
      },
    }));
  };

  const applyPreset = (name: string) => {
    const p = BUDGET_PRESETS.find((x) => x.name === name);
    if (!p) return;
    setActivePreset(name);
    setData((d) => ({ ...d, budgetSplit: { ...p.split } }));
  };

  const STEPS = [
    { title: "Where are you flying from?", sub: "Select your departure city" },
    {
      title: "Where are you staying in Goa?",
      sub: "This decides what counts as nearby",
    },
    {
      title: "When is the trip?",
      sub: "Stay dates, and your travel in and out of Goa",
    },
    { title: "How many travellers?", sub: "Who's joining the adventure?" },
    { title: "What's the budget?", sub: "Split it up — we'll plan inside it" },
  ];
  const totalSteps = STEPS.length;

  const datesValid = nights > 0 && goaNights > 0;
  const canContinue = step === 2 ? datesValid : true;

  const next = () => {
    if (!canContinue) return;
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else onComplete({ ...data, nights, days: nights + 1, budget: budgetTotal });
  };
  const back = () => step > 0 && setStep((s) => s - 1);

  const cardCls = "bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.06)]";
  const dateInputCls =
    "w-full rounded-2xl bg-white border-2 border-[#E5E5EA] focus:border-[#FFD233] outline-none transition-colors text-[15px] font-semibold text-[#1A1A1A] px-4 py-3";

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 pt-6 pb-8">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-3 min-h-[36px]">
        {step > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={back}
            className="flex items-center gap-1 text-sm font-medium text-[#6B6B6B] active:opacity-60"
            style={{ marginBottom: 5 }}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </motion.button>
        )}
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-full bg-[#E5E5EA] overflow-hidden"
            style={{ marginBottom: 5 }}
          >
            <motion.div
              className="h-full bg-[#FFD233] rounded-full"
              animate={{ width: i <= step ? "100%" : "0%" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        ))}
      </div>

      {/* Title */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p
            className="text-xs font-semibold text-[#F5A623] tracking-wide uppercase mb-2"
            style={{ marginBottom: 5 }}
          >
            Step {step + 1} of {totalSteps}
          </p>
          <h2
            className="text-[24px] font-bold text-[#1A1A1A] leading-tight"
            style={{ marginBottom: 3 }}
          >
            {STEPS[step].title}
          </h2>
          <p
            className="text-[#8E8E93] text-sm mt-2"
            style={{ marginBottom: 5 }}
          >
            {STEPS[step].sub}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Content — all steps always mounted, shown/hidden via CSS only.
          This is intentional: AnimatePresence mode="wait" has a known race condition
          where the entering step can get stuck at opacity 0. CSS transitions are
          100% reliable and execute synchronously. */}
      <div className="flex-1 flex flex-col" style={{ position: "relative" }}>
        {/* ── STEP 0 · DEPARTURE CITY ── */}
        <div
          className="flex flex-col"
          style={{ gap: 0, display: step === 0 ? "flex" : "none" }}
        >
          <div className="relative" style={{ marginBottom: "16px" }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search city..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="w-full py-3 pl-11 pr-4 rounded-2xl bg-white text-[15px] text-[#1A1A1A] placeholder-[#8E8E93] outline-none border-2 border-[#E5E5EA] focus:border-[#FFD233] transition-colors"
            />
          </div>
          <div
            className="flex flex-col overflow-y-auto pr-5"
            style={{ gap: "12px", maxHeight: "55vh" }}
          >
            {filteredCities.map((city) => {
              const active = data.departureCity === city;
              return (
                <motion.button
                  key={city}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setData({ ...data, departureCity: city })}
                  className={`w-full rounded-2xl flex items-center text-left transition-all duration-200 ${
                    active
                      ? "bg-[#FFD233] shadow-[0_4px_20px_rgba(255,210,51,0.3)]"
                      : "bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                  }`}
                  style={{ padding: "14px 16px", gap: "12px" }}
                >
                  <MapPin
                    className={`w-4 h-4 ${active ? "text-[#1A1A1A]" : "text-[#8E8E93]"}`}
                  />
                  <span className="font-semibold text-[15px] text-[#1A1A1A]">
                    {city}
                  </span>
                  {active && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 1 · STAY AREA ── */}
        <div
          className="flex flex-col"
          style={{ gap: "16px", display: step === 1 ? "flex" : "none" }}
        >
          <div className="grid grid-cols-2 gap-3">
            {GOA_AREAS.map((area) => {
              const active = data.stayArea === area.name;
              return (
                <motion.button
                  key={area.name}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setData({ ...data, stayArea: area.name })}
                  className={`relative rounded-2xl p-4 text-left transition-all duration-200 ${
                    active
                      ? "bg-[#FFF4BF] border-2 border-[#FFD233] shadow-[0_4px_20px_rgba(255,210,51,0.18)]"
                      : "bg-white border-2 border-transparent shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <p className="pr-5 text-[14px] font-bold text-[#1A1A1A] leading-snug">
                    {area.name}
                  </p>
                  <p
                    className={`mt-1 text-[11px] ${active ? "text-[#1A1A1A]/65" : "text-[#8E8E93]"}`}
                  >
                    {area.sub}
                  </p>
                  {active && (
                    <div className="absolute right-3 top-3 w-4 h-4 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className={`${cardCls} p-5`}>
            <p className="text-[13px] font-bold text-[#1A1A1A]">
              Property name{" "}
              <span className="font-medium text-[#8E8E93]">(optional)</span>
            </p>
            <input
              type="text"
              value={data.stayProperty}
              onChange={(e) =>
                setData({ ...data, stayProperty: e.target.value })
              }
              placeholder="e.g. Casa Amarela"
              className="mt-3 w-full rounded-2xl bg-[#F7F7FA] border-2 border-transparent focus:border-[#FFD233] outline-none transition-colors text-[15px] text-[#1A1A1A] placeholder-[#8E8E93] px-4 py-3"
            />
            <p className="mt-3 text-[11px] text-[#8E8E93] leading-relaxed">
              If you've already booked, adding the name lets us plan travel time
              from your actual doorstep.
            </p>
          </div>
        </div>

        {/* ── STEP 2 · DATES ── */}
        <div
          className="flex flex-col"
          style={{ gap: "16px", display: step === 2 ? "flex" : "none" }}
        >
          <div className={`${cardCls} p-5`}>
            <p className="text-[13px] font-bold text-[#1A1A1A] mb-3">
              Hotel / stay dates
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold text-[#8E8E93] mb-1.5">
                  Check in
                </p>
                <input
                  type="date"
                  value={data.checkIn}
                  onChange={(e) => {
                    const checkIn = e.target.value;
                    setData((d) => ({
                      ...d,
                      checkIn,
                      arriveGoa:
                        nightsBetween(checkIn, d.arriveGoa) > 0 ||
                        d.arriveGoa > checkIn
                          ? checkIn
                          : d.arriveGoa,
                    }));
                  }}
                  className={dateInputCls}
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8E8E93] mb-1.5">
                  Check out
                </p>
                <input
                  type="date"
                  value={data.checkOut}
                  min={data.checkIn}
                  onChange={(e) => {
                    const checkOut = e.target.value;
                    setData((d) => ({
                      ...d,
                      checkOut,
                      departGoa:
                        d.departGoa < checkOut ? checkOut : d.departGoa,
                    }));
                  }}
                  className={dateInputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { n: nights > 0 ? nights + 1 : 0, l: "Days" },
                { n: nights, l: "Nights" },
                { n: data.travelers, l: "Guests" },
              ].map((b) => (
                <div
                  key={b.l}
                  className="rounded-2xl bg-[#F7F7FA] py-3 text-center"
                >
                  <p className="text-[22px] font-bold text-[#1A1A1A] leading-none">
                    {b.n}
                  </p>
                  <p className="text-[10px] font-semibold tracking-wide uppercase text-[#8E8E93] mt-1.5">
                    {b.l}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`${cardCls} p-5`}>
            <p className="text-[13px] font-bold text-[#1A1A1A] mb-3">
              Travel in &amp; out of Goa
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold text-[#8E8E93] mb-1.5">
                  Arrive in Goa
                </p>
                <input
                  type="date"
                  value={data.arriveGoa}
                  max={data.checkIn}
                  onChange={(e) =>
                    setData({ ...data, arriveGoa: e.target.value })
                  }
                  className={dateInputCls}
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#8E8E93] mb-1.5">
                  Leave Goa
                </p>
                <input
                  type="date"
                  value={data.departGoa}
                  min={data.checkOut}
                  onChange={(e) =>
                    setData({ ...data, departGoa: e.target.value })
                  }
                  className={dateInputCls}
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[#FFF9E0] px-4 py-3">
              <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                {!datesValid ? (
                  <span className="text-[#E9633B] font-semibold">
                    Check-out must be after check-in, and your Goa dates must
                    cover the stay.
                  </span>
                ) : goaNights > nights ? (
                  <>
                    You're in Goa{" "}
                    <span className="font-bold text-[#1A1A1A]">
                      {goaNights} nights
                    </span>{" "}
                    but booked for {nights}. We'll plan the {goaNights - nights}{" "}
                    extra {goaNights - nights === 1 ? "night" : "nights"} around
                    your stay.
                  </>
                ) : (
                  <>
                    {prettyDate(data.arriveGoa)} – {prettyDate(data.departGoa)}{" "}
                    in Goa — your stay covers the whole trip.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── STEP 3 · TRAVELERS ── */}
        <div
          className="flex-1 flex flex-col justify-center gap-4"
          style={{ display: step === 3 ? "flex" : "none" }}
        >
          {(
            [
              {
                label: "Adults",
                sub: "Age 18+",
                key: "adults",
                min: 1,
                max: 9,
              },
              {
                label: "Children",
                sub: "Age 2–17",
                key: "children",
                min: 0,
                max: 6,
              },
            ] as const
          ).map((row) => (
            <div
              key={row.key}
              className={`${cardCls} px-8 py-7 flex items-center justify-between`}
            >
              <div>
                <p className="text-[17px] font-bold text-[#1A1A1A]">
                  {row.label}
                </p>
                <p className="text-[12px] text-[#8E8E93] mt-0.5">{row.sub}</p>
              </div>
              <div className="flex items-center gap-5">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() =>
                    setData((d) => {
                      const v = Math.max(row.min, d[row.key] - 1);
                      const adults = row.key === "adults" ? v : d.adults;
                      const children = row.key === "children" ? v : d.children;
                      return {
                        ...d,
                        adults,
                        children,
                        travelers: adults + children,
                      };
                    })
                  }
                  className="w-11 h-11 rounded-full bg-[#F2F2F7] flex items-center justify-center text-xl font-bold text-[#6B6B6B] select-none"
                >
                  −
                </motion.button>
                <span className="text-[32px] font-bold text-[#1A1A1A] min-w-[36px] text-center select-none">
                  {data[row.key]}
                </span>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() =>
                    setData((d) => {
                      const v = Math.min(row.max, d[row.key] + 1);
                      const adults = row.key === "adults" ? v : d.adults;
                      const children = row.key === "children" ? v : d.children;
                      return {
                        ...d,
                        adults,
                        children,
                        travelers: adults + children,
                      };
                    })
                  }
                  className="w-11 h-11 rounded-full bg-[#FFD233] flex items-center justify-center text-xl font-bold text-[#1A1A1A] select-none"
                >
                  +
                </motion.button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-center gap-2 mt-1">
            <Users className="w-4 h-4 text-[#8E8E93]" />
            <p className="text-[13px] text-[#8E8E93] font-medium">
              {data.travelers}{" "}
              {data.travelers === 1 ? "traveller" : "travellers"} total
            </p>
          </div>
        </div>

        {/* ── STEP 4 · SPLIT BUDGET ── */}
        <div
          className="flex flex-col gap-3"
          style={{ display: step === 4 ? "flex" : "none" }}
        >
          <div className="flex gap-2">
            {BUDGET_PRESETS.map((p) => {
              const total = Object.values(p.split).reduce((a, b) => a + b, 0);
              const active = activePreset === p.name;
              return (
                <motion.button
                  key={p.name}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => applyPreset(p.name)}
                  className={`flex-1 rounded-2xl py-2.5 transition-all duration-200 ${
                    active
                      ? "bg-[#FFF4BF] border-2 border-[#FFD233]"
                      : "bg-white border-2 border-transparent shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <p className="text-[13px] font-bold text-[#1A1A1A]">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5">
                    {inr(total)}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {BUDGET_META.map(({ key, label, hint, Icon, colour, tint }) => {
            const value = data.budgetSplit[key] || 0;
            const pct = Math.min(100, (value / CATEGORY_MAX) * 100);
            return (
              <div key={key} className={`${cardCls} px-4 py-3.5`}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
                    style={{ background: tint }}
                  >
                    <Icon className="w-4 h-4" style={{ color: colour }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[#1A1A1A] leading-tight">
                      {label}
                    </p>
                    <p className="text-[11px] text-[#8E8E93] mt-0.5">{hint}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-xl bg-[#F2F2F7] px-2.5 py-1.5 flex-none">
                    <span className="text-[13px] font-semibold text-[#8E8E93]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={CATEGORY_STEP}
                      value={value}
                      onChange={(e) => setBudget(key, Number(e.target.value))}
                      className="w-[68px] bg-transparent text-right text-[15px] font-bold text-[#1A1A1A] outline-none"
                      aria-label={`${label} budget`}
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={CATEGORY_MAX}
                  step={CATEGORY_STEP}
                  value={Math.min(CATEGORY_MAX, value)}
                  onChange={(e) => setBudget(key, Number(e.target.value))}
                  className="w-full cursor-pointer mt-3"
                  style={{
                    height: "5px",
                    background: `linear-gradient(to right, ${colour} ${pct}%, #E5E5EA ${pct}%)`,
                  }}
                  aria-label={`${label} slider`}
                />
              </div>
            );
          })}

          <div className="rounded-3xl bg-[#1A1A1A] px-5 py-4 mt-1">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-white/45">
              Total trip budget
            </p>
            <p className="text-[30px] font-bold text-white leading-tight mt-0.5">
              {inr(budgetTotal)}
            </p>
            <p className="text-[11px] text-white/50">
              {inr(perNight)} a night · {inr(perGuestPerNight)} per guest per
              night
            </p>
            <div className="flex gap-[2px] h-2 rounded-full overflow-hidden mt-3">
              {BUDGET_META.map((m) => (
                <div
                  key={m.key}
                  style={{
                    flexGrow: Math.max(0.001, data.budgetSplit[m.key] || 0),
                    background: m.colour,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: canContinue ? 1.01 : 1 }}
        whileTap={{ scale: canContinue ? 0.97 : 1 }}
        onClick={next}
        disabled={!canContinue}
        className={`w-full py-4 rounded-full text-[15px] font-semibold flex items-center justify-center gap-2 mt-8 transition-opacity ${
          canContinue
            ? "bg-[#FFD233] text-[#1A1A1A] shadow-[0_4px_16px_rgba(255,210,51,0.3)]"
            : "bg-[#E5E5EA] text-[#8E8E93] cursor-not-allowed"
        }`}
      >
        {step < totalSteps - 1 ? "Continue" : "Start Discovering"}
        <ArrowRight className="w-4 h-4" />
      </motion.button>

      {/* HotelAPI branding */}
      <p className="text-center text-[10px] text-[#8E8E93]/60 mt-3">
        Powered by HotelAPI Inventory
      </p>
    </div>
  );
}
