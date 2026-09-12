/**
 * Sarathi — proactive scheduler.
 *
 * A chatbot waits. This wakes on a tick, evaluates every active booking against
 * a set of trigger conditions, and decides — on its own — whether the guest
 * should hear from it. An idempotent send log guarantees a trigger fires once.
 */

const { impl, BOOKINGS } = require("./tools");

const sent = new Set(); // idempotent send log: `${booking_id}:${trigger}:${date}`

function alreadySent(key) {
  return sent.has(key);
}
function markSent(key) {
  sent.add(key);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

/**
 * Trigger definitions. Each returns null (stay quiet) or a payload describing
 * what the agent should act on.
 */
const TRIGGERS = [
  {
    id: "pre_checkin",
    describe: "24h before check-in → logistics",
    evaluate(booking, now) {
      if (daysBetween(now, booking.check_in) !== 1) return null;
      return {
        reason: "check-in is tomorrow",
        action: "send_arrival_logistics",
      };
    },
  },
  {
    id: "weather_reroute",
    describe: "outdoor plan + official rain advisory → reroute",
    evaluate(booking, now) {
      const today = booking.itinerary.find((d) => d.date === now);
      if (!today) return null;
      const wx = impl.get_weather({ date: now, area: booking.area });
      if (!wx.advisory) return null;
      const planned = impl
        .find_nearby({ category: "activity", area: booking.area, limit: 50 })
        .results.find((r) => r.id === today.place_id);
      if (planned && planned.monsoon_safe) return null;
      return {
        reason: `${wx.advisory} — day ${today.day} plan "${today.plan}" is not monsoon-safe`,
        action: "propose_reroute",
        day: today.day,
        weather: wx,
      };
    },
  },
  {
    id: "checkout_prep",
    describe: "2h before checkout → cab + review",
    evaluate(booking, now) {
      if (now !== booking.check_out) return null;
      return { reason: "checkout today", action: "send_checkout_steps" };
    },
  },
];

/**
 * One scheduler tick. Returns the list of triggers that fired.
 */
function tick(now, { onEvaluate } = {}) {
  const fired = [];
  for (const booking of BOOKINGS) {
    for (const trigger of TRIGGERS) {
      const key = `${booking.booking_id}:${trigger.id}:${now}`;
      const result = trigger.evaluate(booking, now);
      if (onEvaluate)
        onEvaluate({
          booking: booking.booking_id,
          trigger: trigger.id,
          describe: trigger.describe,
          fired: !!result,
          suppressed: !!result && alreadySent(key),
        });
      if (!result) continue;
      if (alreadySent(key)) continue;
      markSent(key);
      fired.push({ booking, trigger: trigger.id, ...result });
    }
  }
  return fired;
}

module.exports = { tick, TRIGGERS, sent };
