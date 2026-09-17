"use client";

import {
  activitySchedule,
  tripLocalNow,
  type SavedTrip,
  type ScheduledActivity,
  type TripNotice,
} from "@/lib/trip-updates";
import {
  GOA_CENTRE,
  formatMinutes,
  locate,
  nearestKnownLocation,
  readTransportModes,
  route,
  type LatLng,
  type Leg,
  type TransportMode,
} from "@/lib/goa-geo";

type Weather = {
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeed: number;
};

type WeatherResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
    wind_speed_10m?: number[];
  };
};

const weatherCache = new Map<string, { checkedAt: number; data: WeatherResponse }>();
const trafficCache = new Map<string, { checkedAt: number; leg: Leg }>();
const liveWeather = new Map<string, Weather>();

function keyFor(entry: ScheduledActivity) {
  return `${entry.day}:${entry.index}:${entry.date}:${entry.activity.activity}`;
}

function hourKey(value: number) {
  return new Date(value).toISOString().slice(0, 13);
}

function weatherLabel(code: number) {
  if (code === 0) return "Clear skies";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Misty";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle possible";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain possible";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow possible";
  if ([95, 96, 99].includes(code)) return "Thunderstorms possible";
  return "Mixed conditions";
}

async function weatherAt(point: LatLng, target: number): Promise<Weather | null> {
  const cacheKey = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  let data = cached?.data;
  if (!data || Date.now() - cached!.checkedAt > 5 * 60 * 1000) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(point.lat));
    url.searchParams.set("longitude", String(point.lng));
    url.searchParams.set(
      "hourly",
      "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
    );
    url.searchParams.set("forecast_days", "16");
    url.searchParams.set("timezone", "auto");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (!response.ok) return null;
      data = (await response.json()) as WeatherResponse;
      weatherCache.set(cacheKey, { checkedAt: Date.now(), data });
    } catch {
      return null;
    }
  }

  const times = data.hourly?.time || [];
  const targetHour = hourKey(target);
  let index = times.findIndex((time) => time.startsWith(targetHour));
  if (index < 0) {
    index = times.findIndex((time) => time > targetHour);
  }
  if (index < 0) return null;
  const temperature = data.hourly?.temperature_2m?.[index];
  const precipitationProbability = data.hourly?.precipitation_probability?.[index];
  const weatherCode = data.hourly?.weather_code?.[index];
  const windSpeed = data.hourly?.wind_speed_10m?.[index];
  if (
    typeof temperature !== "number" ||
    typeof precipitationProbability !== "number" ||
    typeof weatherCode !== "number" ||
    typeof windSpeed !== "number" ||
    !Number.isFinite(temperature) ||
    !Number.isFinite(precipitationProbability) ||
    !Number.isFinite(weatherCode) ||
    !Number.isFinite(windSpeed)
  )
    return null;
  return { temperature, precipitationProbability, weatherCode, windSpeed };
}

function weatherText(weather: Weather) {
  return `${weatherLabel(weather.weatherCode)}, ${Math.round(weather.temperature)}°C, ${Math.round(weather.precipitationProbability)}% rain chance, wind ${Math.round(weather.windSpeed)} km/h.`;
}

function weatherChanged(previous: Weather, next: Weather) {
  return (
    previous.weatherCode !== next.weatherCode ||
    Math.abs(previous.temperature - next.temperature) >= 2 ||
    Math.abs(previous.precipitationProbability - next.precipitationProbability) >= 20 ||
    Math.abs(previous.windSpeed - next.windSpeed) >= 10
  );
}

function modeForTraffic(): TransportMode {
  return readTransportModes()[0] || "Rental Car";
}

async function pointFor(entry: ScheduledActivity, trip: SavedTrip) {
  return locate(`${entry.activity.activity}, ${trip.destination}`);
}

async function trafficBetween(from: LatLng, to: LatLng, mode: TransportMode) {
  const cacheKey = `${mode}|${from.lat.toFixed(3)},${from.lng.toFixed(3)}|${to.lat.toFixed(3)},${to.lng.toFixed(3)}`;
  const cached = trafficCache.get(cacheKey);
  if (cached && Date.now() - cached.checkedAt < 5 * 60 * 1000) return cached.leg;
  const leg = await route(from, to, "driving", mode, { fresh: true });
  trafficCache.set(cacheKey, { checkedAt: Date.now(), leg });
  return leg;
}

function trafficText(leg: Leg) {
  if (!leg.routed)
    return `Estimated drive ${formatMinutes(leg.minutes)} for about ${leg.km} km. Live traffic details are unavailable right now.`;
  if (leg.trafficDelayMinutes)
    return `About ${formatMinutes(leg.minutes)} for ${leg.km} km, including roughly ${formatMinutes(leg.trafficDelayMinutes)} due to current traffic.`;
  return `About ${formatMinutes(leg.minutes)} for ${leg.km} km. Traffic is currently moving well.`;
}

function notice(
  trip: SavedTrip,
  id: string,
  kind: TripNotice["kind"],
  title: string,
  message: string,
  now: Date,
  day: number,
): TripNotice {
  return { id, tripId: trip.id, kind, title, message, createdAt: now.toISOString(), day, read: false };
}

/** Fetches only the current/next activity data and returns new feed notices. */
export async function syncActivityNotices(trip: SavedTrip, now: Date): Promise<TripNotice[]> {
  const schedule = activitySchedule(trip);
  const current = tripLocalNow(trip.timeZone, now);
  const localDate = new Date(current).toISOString().slice(0, 10);
  const tomorrow = new Date(`${localDate}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);
  const localNow = new Date(current);
  const localMinutes = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();
  const nextDayWeatherTime = localMinutes >= 21 * 60;
  const activeIndex = schedule.findIndex((entry) => current >= entry.startsAt && current < entry.endsAt);
  const active = activeIndex >= 0 ? schedule[activeIndex] : undefined;
  const next = schedule.find((entry) => entry.startsAt > current);
  const sameDayNext = active && next && next.day === active.day ? next : undefined;
  const nextDayEntries = nextDayWeatherTime
    ? schedule.filter((entry) => entry.date === tomorrowDate)
    : [];
  const upcoming = schedule.find(
    (entry) => entry.startsAt >= current && (entry.startsAt - current) / 60000 <= 30,
  );
  const weatherEntries = [upcoming, active, sameDayNext, ...nextDayEntries].filter(
    (entry, index, list): entry is ScheduledActivity => !!entry && list.indexOf(entry) === index,
  );
  const previous = activeIndex > 0 ? schedule[activeIndex - 1] : undefined;
  const points = new Map<string, LatLng>();
  await Promise.all(
    weatherEntries.map(async (entry) => {
      const point = await pointFor(entry, trip);
      if (point) points.set(keyFor(entry), point);
    }),
  );

  // Descriptive labels such as “Dinner at Fisherman's Wharf” may not resolve
  // through geocoding. Use the nearest known Goa location so updates remain
  // available when an exact place name is not available.
  const isGoaTrip = `${trip.destination} ${trip.country}`
    .toLowerCase()
    .includes("goa");
  if (isGoaTrip) {
    for (const entry of weatherEntries) {
      const id = keyFor(entry);
      if (points.has(id)) continue;
      const nearbyEntry = weatherEntries.find(
        (candidate) => candidate !== entry && points.has(keyFor(candidate)),
      );
      const reference = nearbyEntry
        ? points.get(keyFor(nearbyEntry))
        : previous
          ? await pointFor(previous, trip)
          : undefined;
      points.set(id, nearestKnownLocation(reference || GOA_CENTRE));
    }
  }

  const notices: TripNotice[] = [];
  const mode = modeForTraffic();

  if (nextDayEntries.length) {
    const tomorrowWeather = await Promise.all(
      nextDayEntries.map(async (entry) => {
        const point = points.get(keyFor(entry));
        if (!point) return null;
        const weather = await weatherAt(point, entry.startsAt);
        return weather
          ? `${entry.activity.time} ${entry.activity.activity}: ${weatherText(weather)}`
          : null;
      }),
    );
    const places = tomorrowWeather.filter((item): item is string => !!item);
    if (places.length) {
      notices.push(
        notice(
          trip,
          `next-day-weather:${trip.id}:${tomorrowDate}`,
          "change",
          "Tomorrow's weather plan",
          places.join(" • "),
          now,
          nextDayEntries[0].day,
        ),
      );
    }
  }

  if (upcoming) {
    const minutes = Math.round((upcoming.startsAt - current) / 60000);
    const point = points.get(keyFor(upcoming));
    if (point && minutes >= 0 && minutes <= 30) {
      const weather = await weatherAt(point, upcoming.startsAt);
      if (weather) {
        notices.push(
          notice(
            trip,
            `weather-before:${trip.id}:${keyFor(upcoming)}`,
            "alert",
            `Weather outlook for ${upcoming.activity.activity}`,
            `${weatherText(weather)} Forecast for ${upcoming.activity.time}.`,
            now,
            upcoming.day,
          ),
        );
      }
      const origin = previous ? points.get(keyFor(previous)) || (await pointFor(previous, trip)) : GOA_CENTRE;
      if (origin) {
        const leg = await trafficBetween(origin, point, mode);
        notices.push(
          notice(
            trip,
            `traffic-before:${trip.id}:${keyFor(upcoming)}`,
            "alert",
            `Traffic check for ${upcoming.activity.activity}`,
            `${trafficText(leg)} Leave enough time for the ${upcoming.activity.time} start.`,
            now,
            upcoming.day,
          ),
        );
      }
    }
  }

  if (active) {
    const activePoint = points.get(keyFor(active));
    if (activePoint) {
      const currentWeather = await weatherAt(activePoint, current);
      if (currentWeather) {
        const weatherKey = `weather:${trip.id}:${keyFor(active)}`;
        const oldWeather = liveWeather.get(weatherKey);
        liveWeather.set(weatherKey, currentWeather);
        if (oldWeather && weatherChanged(oldWeather, currentWeather)) {
          notices.push(
            notice(
              trip,
              `weather-change:${trip.id}:${keyFor(active)}:${currentWeather.weatherCode}:${Math.round(currentWeather.temperature)}:${Math.round(currentWeather.precipitationProbability)}`,
              "alert",
              `Weather changed: ${active.activity.activity}`,
              `Weather update: ${weatherText(currentWeather)}`,
              now,
              active.day,
            ),
          );
        }
      }
    }

    if (sameDayNext) {
      const nextPoint = points.get(keyFor(sameDayNext)) || (await pointFor(sameDayNext, trip));
      const origin = activePoint || (await pointFor(active, trip));
      if (nextPoint && origin) {
        let leg: Leg | null = null;
        const elapsedMinutes = Math.floor((current - active.startsAt) / 60000);
        // The first in-activity check is deliberately after 30 minutes, then
        // repeats every 30 minutes while this activity remains current.
        if (elapsedMinutes >= 30) {
          const elapsedBucket = Math.floor(elapsedMinutes / 30);
          leg = await trafficBetween(origin, nextPoint, mode);
          notices.push(
            notice(
              trip,
              `traffic-live:${trip.id}:${keyFor(active)}:${elapsedBucket}`,
              "alert",
              `Traffic check for ${active.activity.activity}`,
              `30-minute activity check. ${trafficText(leg)} Next up: ${sameDayNext.activity.activity} at ${sameDayNext.activity.time}.`,
              now,
              active.day,
            ),
          );
        }

        const nextWeather = await weatherAt(nextPoint, sameDayNext.startsAt);
        if (nextWeather) {
          const trafficPreview = leg ? ` ${trafficText(leg)}` : "";
          notices.push(
            notice(
              trip,
              `next-preview:${trip.id}:${keyFor(active)}:${keyFor(sameDayNext)}:${nextWeather.weatherCode}:${Math.round(nextWeather.temperature)}:${Math.round(nextWeather.precipitationProbability)}`,
              "change",
              `Next activity plan: ${sameDayNext.activity.activity}`,
              `Starts at ${sameDayNext.activity.time}. ${weatherText(nextWeather)}${trafficPreview}`,
              now,
              sameDayNext.day,
            ),
          );
        }
      }
    } else if (activePoint && previous) {
      // Keep the live traffic signal useful for the final activity too: it
      // describes the route the traveller used to reach the current stop.
      const previousPoint = await pointFor(previous, trip);
      if (previousPoint) {
        const elapsedMinutes = Math.floor((current - active.startsAt) / 60000);
        if (elapsedMinutes >= 30) {
          const elapsedBucket = Math.floor(elapsedMinutes / 30);
          const leg = await trafficBetween(previousPoint, activePoint, mode);
          notices.push(
            notice(
              trip,
              `traffic-live:${trip.id}:${keyFor(active)}:${elapsedBucket}`,
              "alert",
              `Traffic check for ${active.activity.activity}`,
              `30-minute activity check. ${trafficText(leg)} You are currently at the final planned stop.`,
              now,
              active.day,
            ),
          );
        }
      }
    }
  }
  return notices;
}
