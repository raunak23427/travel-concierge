"use client";

import {
  activitySchedule,
  tripLocalNow,
  type SavedTrip,
  type ScheduledActivity,
  type WeatherAlertContext,
  type WeatherAlertInsight,
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
  feelsLike?: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeed: number;
  uvIndex?: number;
};

type WeatherResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    apparent_temperature?: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
    wind_speed_10m?: number[];
    uv_index?: number[];
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
      "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,uv_index",
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
  const feelsLike = data.hourly?.apparent_temperature?.[index];
  const precipitationProbability = data.hourly?.precipitation_probability?.[index];
  const weatherCode = data.hourly?.weather_code?.[index];
  const windSpeed = data.hourly?.wind_speed_10m?.[index];
  const uvIndex = data.hourly?.uv_index?.[index];
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
  return {
    temperature,
    precipitationProbability,
    weatherCode,
    windSpeed,
    ...(typeof feelsLike === "number" && Number.isFinite(feelsLike) ? { feelsLike } : {}),
    ...(typeof uvIndex === "number" && Number.isFinite(uvIndex) ? { uvIndex } : {}),
  };
}

function weatherText(weather: Weather) {
  return `${weatherLabel(weather.weatherCode)}, ${Math.round(weather.temperature)}°C, ${Math.round(weather.precipitationProbability)}% rain chance, wind ${Math.round(weather.windSpeed)} km/h.`;
}

function isRainy(weather: Weather) {
  return weather.precipitationProbability >= 45 || [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weather.weatherCode);
}

function weatherSeverity(weather: Weather): WeatherAlertContext["severity"] {
  if (weather.precipitationProbability >= 70 || weather.temperature >= 38 || weather.windSpeed >= 35 || [95, 96, 99].includes(weather.weatherCode)) return "warning";
  if (weather.precipitationProbability >= 35 || weather.temperature >= 32 || weather.windSpeed >= 22 || (weather.uvIndex ?? 0) >= 7) return "advisory";
  return "info";
}

function activityIsOutdoor(entry: ScheduledActivity) {
  const value = `${entry.activity.activity} ${entry.activity.description} ${entry.activity.type}`.toLowerCase();
  return /beach|walk|hike|park|boat|cruise|market|outdoor|tour|sightsee|water|cycling|sunset/.test(value);
}

function activityImpact(entry: ScheduledActivity, weather: Weather): WeatherAlertInsight {
  const severity = weatherSeverity(weather);
  const outdoor = activityIsOutdoor(entry);
  const name = entry.activity.activity;
  const time = entry.activity.time;
  if (isRainy(weather) && outdoor) return { activity: name, time, impact: severity === "warning" ? "warning" : "caution", message: `${Math.round(weather.precipitationProbability)}% rain chance around this outdoor plan.` };
  if (weather.temperature >= 32 && outdoor) return { activity: name, time, impact: severity === "warning" ? "warning" : "caution", message: `Warm conditions around ${Math.round(weather.temperature)}°C may make this feel intense.` };
  if (weather.windSpeed >= 22 && outdoor) return { activity: name, time, impact: "caution", message: `Breezy conditions around ${Math.round(weather.windSpeed)} km/h are expected.` };
  return { activity: name, time, impact: "good", message: outdoor ? "Outdoor conditions look suitable." : "Comfortable conditions are expected." };
}

function weatherHeading(entry: ScheduledActivity, weather: Weather, destination: string) {
  const activity = entry.activity.activity;
  const activityText = `${activity} ${entry.activity.type}`.toLowerCase();
  if (/arriv|airport|flight/.test(activityText)) return `Weather when you arrive in ${destination}`;
  if (weatherSeverity(weather) === "warning" && isRainy(weather)) return `Rain may affect ${activity}`;
  if (weatherSeverity(weather) === "warning" && weather.temperature >= 38) return `Very hot weather during ${activity}`;
  if (weatherSeverity(weather) === "advisory" && weather.temperature >= 32) return `Hot weather during ${activity}`;
  if (weatherSeverity(weather) === "advisory" && isRainy(weather)) return `Showers may affect ${activity}`;
  return `Good weather for ${activity}`;
}

function weatherSummary(entry: ScheduledActivity, weather: Weather) {
  const condition = weatherLabel(weather.weatherCode).toLowerCase();
  const activityText = `${entry.activity.activity} ${entry.activity.type}`.toLowerCase();
  const subject = /arriv|airport|flight/.test(activityText) ? `You arrive at ${entry.activity.time}.` : `You have ${entry.activity.activity} at ${entry.activity.time}.`;
  if (weatherSeverity(weather) === "warning") return `${subject} ${condition} is expected, so this could meaningfully affect your plans.`;
  if (weatherSeverity(weather) === "advisory") return `${subject} Expect ${condition}; a little preparation will help keep your plans comfortable.`;
  return `${subject} It should be ${condition} with no major weather disruption expected.`;
}

function weatherRecommendations(weather: Weather, entries: ScheduledActivity[]) {
  const recommendations: string[] = [];
  const outdoor = entries.some(activityIsOutdoor);
  if (weather.temperature >= 30 || (weather.uvIndex ?? 0) >= 6) recommendations.push("Carry sunscreen");
  if (weather.temperature >= 30) recommendations.push("Keep water with you");
  if (weather.temperature >= 32) recommendations.push("Choose light, breathable clothing");
  if (isRainy(weather)) recommendations.push("Pack a compact umbrella or rain layer");
  if (weatherSeverity(weather) === "warning" && outdoor) recommendations.push("Consider moving outdoor plans to a milder time");
  if (weather.windSpeed >= 22 && outdoor) recommendations.push("Allow extra time for outdoor transfers");
  if (!recommendations.length) recommendations.push(outdoor ? "Outdoor plans look good" : "No weather changes needed");
  return recommendations.slice(0, 4);
}

function weatherWhy(entry: ScheduledActivity, weather: Weather) {
  const outdoor = activityIsOutdoor(entry);
  if (weather.temperature >= 32 && outdoor) return "You have an outdoor activity when temperatures are expected to be high.";
  if (isRainy(weather) && outdoor) return "You have an outdoor activity when rain is possible.";
  if (weather.windSpeed >= 22 && outdoor) return "You have an outdoor activity during stronger winds.";
  return `This alert is timed for ${entry.activity.activity} at ${entry.activity.time}.`;
}

function weatherContext(
  trip: SavedTrip,
  entry: ScheduledActivity,
  weather: Weather,
  insights: WeatherAlertInsight[],
  relatedEntries: ScheduledActivity[],
): WeatherAlertContext {
  return {
    heading: weatherHeading(entry, weather, trip.destination),
    severity: weatherSeverity(weather),
    condition: weatherLabel(weather.weatherCode),
    temperature: Math.round(weather.temperature),
    ...(weather.feelsLike !== undefined ? { feelsLike: Math.round(weather.feelsLike) } : {}),
    rainProbability: Math.round(weather.precipitationProbability),
    windSpeed: Math.round(weather.windSpeed),
    ...(weather.uvIndex !== undefined ? { uvIndex: Math.round(weather.uvIndex) } : {}),
    summary: weatherSummary(entry, weather),
    insights,
    recommendations: weatherRecommendations(weather, relatedEntries),
    why: weatherWhy(entry, weather),
  };
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
  weather?: WeatherAlertContext,
): TripNotice {
  return {
    id,
    tripId: trip.id,
    kind,
    title,
    message,
    createdAt: now.toISOString(),
    day,
    read: false,
    ...(weather ? { weather } : {}),
  };
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

  // First sight of this plan. Every weather window below needs the trip to
  // already be under way — something starting inside 30 minutes, something
  // running now, or tomorrow's list after 9pm. A guest who has just confirmed
  // a trip that starts next week matches none of them and sees nothing, which
  // reads as the feature being broken rather than as nothing to report.
  //
  // So: one opening briefing for the first planned day, on a stable id that
  // publishNotices dedupes, after which the live windows take over. Mirrors
  // the opening summary syncPriceNotices already sends.
  // One briefing per planned day, not just the first. A single weather notice
  // next to a stream of price alerts reads as an afterthought; a forecast for
  // each day of the trip is the shape a guest expects.
  const upcomingDays = [
    ...new Set(
      schedule
        .filter((entry) => entry.startsAt > current)
        .map((entry) => entry.day),
    ),
  ].slice(0, 5);

  for (const dayNumber of upcomingDays) {
    const firstUpcoming = schedule.find(
      (entry) => entry.day === dayNumber && entry.startsAt > current,
    );
    if (!firstUpcoming) continue;
    try {
      const openingEntries = schedule
        .filter((entry) => entry.day === dayNumber)
        .slice(0, 4);

      const resolved = await Promise.all(
        openingEntries.map(async (entry) => {
          // Nominatim allows about one request a second and these run in
          // parallel, so on a phone the geocode is the step most likely to
          // fail. The app is Goa-only, so fall back to the nearest known
          // location unconditionally rather than gating on the destination
          // string containing "goa" — "Vagator Nightclub, India" does not.
          const point =
            points.get(keyFor(entry)) ||
            (await pointFor(entry, trip)) ||
            nearestKnownLocation(GOA_CENTRE);
          const weather = await weatherAt(point, entry.startsAt);
          return weather ? { entry, weather } : null;
        }),
      );
      const found = resolved.filter(
        (item): item is { entry: ScheduledActivity; weather: Weather } => !!item,
      );

      // Open-Meteo only forecasts 16 days out, so every stop on a trip further
      // away resolves to null and the briefing goes silent — which looks
      // identical to the feature being broken. Fall back to conditions at the
      // destination now, worded as an outlook rather than a forecast.
      let outlook = false;
      if (!found.length) {
        const point =
          (await pointFor(firstUpcoming, trip)) ||
          nearestKnownLocation(GOA_CENTRE);
        const nowWeather = await weatherAt(point, Date.now());
        if (nowWeather) {
          outlook = true;
          found.push({ entry: firstUpcoming, weather: nowWeather });
        }
      }

      if (found.length) {
        const lead = found[0];
        const insights = found.map((item) =>
          activityImpact(item.entry, item.weather),
        );
        const context = weatherContext(
          trip,
          lead.entry,
          lead.weather,
          insights,
          found.map((item) => item.entry),
        );
        const flagged = insights.filter(
          (insight) => insight.impact !== "good",
        ).length;

        notices.push(
          notice(
            trip,
            `weather:opening:${trip.id}:${dayNumber}`,
            flagged ? "alert" : "change",
            outlook
              ? `${trip.destination} right now — ${weatherLabel(lead.weather.weatherCode).toLowerCase()}, ${Math.round(lead.weather.temperature)}°C`
              : `Weather for day ${firstUpcoming.day} — ${weatherLabel(lead.weather.weatherCode).toLowerCase()}, ${Math.round(lead.weather.temperature)}°C`,
            found
              .map(
                (item) =>
                  `${item.entry.activity.time} ${item.entry.activity.activity}: ${weatherText(item.weather)}`,
              )
              .join(" • ") +
              (outlook
                ? " Your trip is beyond the 16-day forecast window, so this is current conditions — you'll get a proper forecast for each stop closer to the day."
                : flagged
                  ? ` ${flagged} plan${flagged === 1 ? "" : "s"} worth watching — you'll get an alert here before each one.`
                  : " You'll get an alert here before each stop."),
            now,
            firstUpcoming.day,
            context,
          ),
        );
      }
    } catch {
      // A briefing is a nicety. If geocoding or the forecast is unavailable,
      // stay silent rather than take the rest of the sync down with it.
    }
  }

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
        // Keep the alert focused on the next few real itinerary items. Each
        // item gets its own forecast when its location resolves; otherwise we
        // use the same local forecast as a graceful, destination-level fallback.
        const relatedEntries = schedule
          .filter((entry) => entry.day === upcoming.day && entry.startsAt >= upcoming.startsAt)
          .slice(0, 4);
        const insightResults = await Promise.all(
          relatedEntries.map(async (entry) => {
            const entryPoint = points.get(keyFor(entry)) || (await pointFor(entry, trip)) || point;
            const entryWeather = await weatherAt(entryPoint, entry.startsAt);
            return entryWeather ? activityImpact(entry, entryWeather) : null;
          }),
        );
        const insights = insightResults.filter(
          (insight): insight is WeatherAlertInsight => insight !== null,
        );
        const context = weatherContext(
          trip,
          upcoming,
          weather,
          insights.length ? insights : [activityImpact(upcoming, weather)],
          relatedEntries.length ? relatedEntries : [upcoming],
        );
        notices.push(
          notice(
            trip,
            `weather-before:${trip.id}:${keyFor(upcoming)}`,
            "alert",
            context.heading,
            context.summary,
            now,
            upcoming.day,
            context,
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
          const context = weatherContext(
            trip,
            active,
            currentWeather,
            [activityImpact(active, currentWeather)],
            [active],
          );
          notices.push(
            notice(
              trip,
              `weather-change:${trip.id}:${keyFor(active)}:${currentWeather.weatherCode}:${Math.round(currentWeather.temperature)}:${Math.round(currentWeather.precipitationProbability)}`,
              "alert",
              context.heading,
              context.summary,
              now,
              active.day,
              context,
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
