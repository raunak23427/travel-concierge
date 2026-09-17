"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { ItineraryActivity } from "@/data/itineraryMock";
import {
  dayDate,
  validDate,
  validTimeZone,
  type SavedTrip,
} from "@/lib/trip-updates";
import { useTravel } from "./TravelProvider";
import styles from "./travel.module.css";

export function TravelDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="travel-dialog-title"
      onCancel={onClose}
    >
      <div className={styles.dialogHeading}>
        <h2 id="travel-dialog-title">{title}</h2>
        <button
          className={styles.iconButton}
          onClick={onClose}
          aria-label="Close dialog"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function TripEditor({
  trip,
  onClose,
}: {
  trip: SavedTrip | null;
  onClose: () => void;
}) {
  const { saveTrip } = useTravel();
  const [error, setError] = useState("");
  const zones = Array.from(
    new Set([
      trip?.timeZone || "Asia/Kolkata",
      ...Intl.supportedValuesOf("timeZone"),
    ]),
  );
  return (
    <TravelDialog
      title={trip ? "Edit trip details" : "A new adventure"}
      onClose={onClose}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const get = (key: string) => String(form.get(key) || "").trim();
          const startDate = get("startDate"),
            endDate = get("endDate"),
            timeZone = get("timeZone");
          if (!get("name") || !get("destination")) {
            setError("Enter a trip name and destination.");
            return;
          }
          if (
            !validDate(startDate) ||
            !validDate(endDate) ||
            endDate < startDate
          ) {
            setError("Choose an end date on or after your start date.");
            return;
          }
          const dayCount =
            Math.round(
              (Date.parse(endDate) - Date.parse(startDate)) / 86400000,
            ) + 1;
          if (dayCount > 90) {
            setError("Choose a trip of 90 days or fewer.");
            return;
          }
          if (
            trip?.days.some(
              (day) => day.day > dayCount && (day.items.length || day.mustDo),
            )
          ) {
            setError(
              "These dates would exclude scheduled activities. Choose a later end date.",
            );
            return;
          }
          if (!validTimeZone(timeZone)) {
            setError("Choose a valid destination time zone.");
            return;
          }
          const saved: SavedTrip = {
        plannerSignature: trip?.plannerSignature,
        planning: trip?.planning,
            id: trip?.id || crypto.randomUUID(),
            name: get("name"),
            destination: get("destination"),
            country: get("country"),
            startDate,
            endDate,
            timeZone,
            travelers: Number(get("travelers")),
            image:
              trip?.destination === get("destination")
                ? trip.image
                : get("destination").toLowerCase() === "goa"
                  ? "/goa/beaches-of-goa.jpg"
                  : "",
            days: Array.from(
              { length: dayCount },
              (_, i) =>
                trip?.days.find((d) => d.day === i + 1) || {
                  day: i + 1,
                  title:
                    i === 0
                      ? "Arrival & first impressions"
                      : i === dayCount - 1
                        ? "One last adventure"
                        : "Explore at your own pace",
                  items: [],
                },
            ),
            flights: trip?.flights || [],
            hotel: trip?.hotel || null,
            transfers: trip?.transfers || [],
          };
          saveTrip(
            saved,
            trip
              ? `Details for ${saved.name} have changed.`
              : `${saved.name} is ready to plan.`,
          );
          onClose();
        }}
      >
        <label>
          Trip name
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={trip?.name}
            placeholder="A little coastal escape"
          />
        </label>
        <div className={styles.formGrid}>
          <label>
            Destination
            <input
              name="destination"
              required
              maxLength={100}
              defaultValue={trip?.destination}
              placeholder="Goa"
            />
          </label>
          <label>
            Country
            <input
              name="country"
              maxLength={80}
              defaultValue={trip?.country}
              placeholder="India"
            />
          </label>
        </div>
        <div className={styles.formGrid}>
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              required
              defaultValue={trip?.startDate}
            />
          </label>
          <label>
            End date
            <input
              name="endDate"
              type="date"
              required
              defaultValue={trip?.endDate}
            />
          </label>
        </div>
        <label>
          Destination time zone
          <select
            name="timeZone"
            defaultValue={trip?.timeZone || "Asia/Kolkata"}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Travelers
          <input
            name="travelers"
            type="number"
            min={1}
            max={50}
            required
            defaultValue={trip?.travelers || 1}
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.primary} type="submit">
          <Check size={18} />
          {trip ? "Save changes" : "Create trip"}
        </button>
      </form>
    </TravelDialog>
  );
}

export function ActivityEditor({
  trip,
  day,
  index,
  onClose,
}: {
  trip: SavedTrip;
  day: number;
  index?: number;
  onClose: () => void;
}) {
  const { saveTrip } = useTravel();
  const current = trip.days.find((d) => d.day === day)?.items[index ?? -1];
  const [error, setError] = useState("");
  return (
    <TravelDialog
      title={current ? "Edit activity" : `Add to day ${day}`}
      onClose={onClose}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const activity = String(data.get("activity") || "").trim();
          if (!activity) {
            setError("Enter an activity name.");
            return;
          }
          const item: ItineraryActivity = {
            activity,
            time: String(data.get("time")),
            description: String(data.get("description") || "").trim(),
            cost: Number(data.get("cost")),
            type: data.get("type") as ItineraryActivity["type"],
          };
          const days = trip.days.map((d) => {
            if (d.day !== day) return d;
            const items = [...d.items];
            if (index !== undefined) items[index] = item;
            else items.push(item);
            items.sort((a, b) => a.time.localeCompare(b.time));
            return { ...d, items };
          });
          saveTrip(
            { ...trip, days },
            `${activity} ${current ? "updated to" : "added for"} ${item.time} on day ${day}${trip.startDate ? ` (${dayDate(trip.startDate, day)})` : ""}.`,
            day,
          );
          onClose();
        }}
      >
        <label>
          Activity
          <input
            name="activity"
            required
            maxLength={160}
            defaultValue={current?.activity}
            placeholder="Sunset at the beach"
          />
        </label>
        <div className={styles.formGrid}>
          <label>
            Local time
            <input
              name="time"
              type="time"
              required
              defaultValue={current?.time || "09:00"}
            />
          </label>
          <label>
            Category
            <select name="type" defaultValue={current?.type || "activity"}>
              <option value="activity">Experience</option>
              <option value="food">Food & drink</option>
              <option value="travel">Travel</option>
              <option value="relax">Relax</option>
            </select>
          </label>
        </div>
        <label>
          Details
          <textarea
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={current?.description}
          />
        </label>
        <label>
          Estimated cost (INR)
          <input
            name="cost"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={current?.cost || 0}
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={styles.primary}>
          <Check size={18} />
          Save activity
        </button>
      </form>
    </TravelDialog>
  );
}
