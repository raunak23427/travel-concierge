/**
 * Duration helpers shared by itinerary endpoints.
 *
 * `duration` is a legacy bucket (for example, "3-5").  New sessions also
 * store the exact number of calendar days selected in onboarding as
 * `tripDays`; that exact value always takes precedence.
 */
const LEGACY_DURATION_DAYS = {
  '3-5': 4,
  '5-7': 6,
  '7-10': 8,
};

function asDayCount(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= 60 ? count : null;
}

function getTripDays(source = {}, fallback = 5) {
  const exactDays = asDayCount(source.tripDays) || asDayCount(source.days);
  if (exactDays) return exactDays;

  const directDuration = asDayCount(source.duration);
  if (directDuration) return directDuration;

  return LEGACY_DURATION_DAYS[source.duration] || fallback;
}

function formatTripDuration(days) {
  const safeDays = asDayCount(days) || 1;
  const nights = Math.max(0, safeDays - 1);
  return `${safeDays} ${safeDays === 1 ? 'Day' : 'Days'}, ${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
}

/**
 * Keep an AI or seed plan to the requested number of calendar days. When a
 * longer plan is shortened, retain its arrival day and final departure day.
 */
function normalizeItineraryDays(days, targetDays) {
  if (!Array.isArray(days) || days.length === 0) return [];

  const target = asDayCount(targetDays) || days.length;
  const copy = (day) => JSON.parse(JSON.stringify(day));
  const source = days.map(copy);
  let selected;

  if (target === 1) {
    selected = [source[0]];
  } else if (source.length >= target) {
    // The final source day normally contains checkout/departure logistics.
    selected = [...source.slice(0, target - 1), source[source.length - 1]];
  } else {
    selected = [source[0]];
    const middleDays = source.slice(1, -1);

    for (let index = 1; index < target - 1; index += 1) {
      const template = middleDays[(index - 1) % middleDays.length] || source[0];
      const extraDay = copy(template);
      if (index >= source.length - 1) {
        extraDay.title = `More to explore: ${extraDay.title || 'your personalised highlights'}`;
      }
      selected.push(extraDay);
    }

    selected.push(source[source.length - 1]);
  }

  return selected.map((day, index) => ({ ...day, day: index + 1 }));
}

/**
 * Align the visible duration, hotel nights, and day cards in an itinerary.
 */
function applyTripDuration(itinerary, targetDays) {
  const result = JSON.parse(JSON.stringify(itinerary || {}));
  const days = getTripDays({ tripDays: targetDays }, Array.isArray(result.days) ? result.days.length : 5);

  result.days = normalizeItineraryDays(result.days, days);
  result.duration = formatTripDuration(days);

  if (result.hotel) {
    result.hotel.nights = Math.max(0, days - 1);
  }

  return result;
}

module.exports = {
  asDayCount,
  getTripDays,
  formatTripDuration,
  normalizeItineraryDays,
  applyTripDuration,
};
