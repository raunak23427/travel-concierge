"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Compass,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Sparkles,
  Users,
  Utensils,
  Coffee,
  ChevronDown,
} from "lucide-react";
import { dayDate, formatDate } from "@/lib/trip-updates";
import { useTravel } from "./TravelProvider";
import TravelShell from "./TravelShell";
import { ActivityEditor, TripEditor } from "./TripEditors";
import styles from "./travel.module.css";

const activityIcons = {
  travel: Plane,
  food: Utensils,
  relax: Coffee,
  activity: MapPin,
};
const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function HomeScreen({ view = "home" }: { view?: "home" | "trip" }) {
  const { trip, ready, unread } = useTravel();
  const [editing, setEditing] = useState(false);
  const [activityEdit, setActivityEdit] = useState<{
    day: number;
    index?: number;
  } | null>(null);
  const [failedImage, setFailedImage] = useState("");
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const toggleDay = (day: number) => {
    setExpandedDays((current) => {
      const next = new Set(current);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };
  return (
    <TravelShell>
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>
            A little planning. A lot to look forward to.
          </p>
          <h1>{view === "trip" ? "My trip" : "Home"}</h1>
        </div>
        {trip && view === "trip" ? <button
          disabled={!ready}
          className={styles.iconButton}
          onClick={() => setEditing(true)}
          aria-label="Edit trip details"
          title="Edit trip details"
        >
          <Pencil size={20} />
        </button> : <Link href="/plan?new=1" className={styles.primary}><Plus size={18} />Create new plan</Link>}
      </div>
      {!ready ? (
        <div role="status" className={styles.loading}>
          Loading your trip...
        </div>
      ) : !trip ? (
        <>
          <img
            className={styles.emptyPhoto}
            src="/goa/beaches-of-goa.jpg"
            alt="A beach on the coast of Goa"
          />
          <section className={styles.empty}>
            <span className={styles.largeIcon}>
              <Compass size={30} />
            </span>
            <h2>Where are we off to?</h2>
            <p>No trip planned yet.</p>
            <Link href="/plan?new=1" className={styles.textLink}>
              Start planning <ArrowRight size={16} />
            </Link>
          </section>
        </>
      ) : (
        <>
          <section className={styles.tripSummary} aria-labelledby="trip-name">
            {trip.image && failedImage !== trip.image && (
              <img
                className={styles.tripPhoto}
                src={trip.image}
                alt={`${trip.destination}, ${trip.country}`}
                onError={() => setFailedImage(trip.image)}
              />
            )}
            <div className={styles.tripInfo}>
              <p className={styles.destination}>
                <MapPin size={16} />
                {trip.destination}
                {trip.country && `, ${trip.country}`}
              </p>
              <h2 id="trip-name">{trip.name}</h2>
              <div className={styles.tripMeta}>
                <span>
                  <CalendarDays size={16} />
                  {formatDate(trip.startDate)}
                  {trip.endDate &&
                    trip.endDate !== trip.startDate &&
                    ` - ${formatDate(trip.endDate)}`}
                </span>
                <span>
                  <Users size={16} />
                  {trip.travelers}{" "}
                  {trip.travelers === 1 ? "traveler" : "travelers"}
                </span>
              </div>
              <div className={styles.tripStats}>
                <span>{trip.days.length} days</span>
                <span>
                  {trip.days.reduce((sum, day) => sum + day.items.length, 0)}{" "}
                  activities
                </span>
                <span>{trip.timeZone.replaceAll("_", " ")}</span>
              </div>
            </div>
          </section>
          {unread > 0 && (
            <Link className={styles.updateBanner} href="/notifications">
              <Sparkles size={19} />
              <span>
                {unread} new {unread === 1 ? "update" : "updates"} for your trip
              </span>
              <ArrowRight size={18} />
            </Link>
          )}
          <div className={view === "trip" ? styles.tripDetailsLayout : styles.itineraryLayout}>
            {view === "home" && <section aria-labelledby="itinerary-title">
              <div className={styles.sectionHeading}>
                <h2 id="itinerary-title">Your plan</h2>
                <span>Day by day</span>
              </div>
              <nav aria-label="Itinerary days" className={styles.dayNav}>
                {trip.days.map((day) => (
                  <a key={day.day} href={`#day-${day.day}`} onClick={() => setExpandedDays((current) => new Set(current).add(day.day))}>
                    Day {day.day}
                  </a>
                ))}
              </nav>
              {trip.days.map((day) => (
                <section
                  className={styles.day}
                  key={day.day}
                  id={`day-${day.day}`}
                >
                  <div className={styles.dayHeading}>
                    <span className={styles.dayNumber}>
                      {String(day.day).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      className={styles.dayToggle}
                      onClick={() => toggleDay(day.day)}
                      aria-expanded={expandedDays.has(day.day)}
                      aria-controls={`day-content-${day.day}`}
                    >
                      <span className={styles.dayDate}>
                        {trip.startDate
                          ? formatDate(dayDate(trip.startDate, day.day))
                          : `Day ${day.day}`}
                      </span>
                      <span className={styles.dayTitle}>{day.title}</span>
                      <ChevronDown className={expandedDays.has(day.day) ? styles.chevronOpen : ""} size={19} />
                    </button>
                    <button
                      className={styles.iconButton}
                      onClick={() => setActivityEdit({ day: day.day })}
                      title={`Add activity to day ${day.day}`}
                      aria-label={`Add activity to day ${day.day}`}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {expandedDays.has(day.day) && <div id={`day-content-${day.day}`}>
                  {day.mustDo && (
                    <div className={styles.mustDo}>
                      <Sparkles size={18} />
                      <div>
                        <strong>{day.mustDo.activity}</strong>
                        <p>{day.mustDo.description}</p>
                      </div>
                    </div>
                  )}
                  {!day.items.length && (
                    <p className={styles.dayEmpty}>
                      A little room for adventure.
                    </p>
                  )}
                  <ol className={styles.timeline}>
                    {day.items.map((item, index) => {
                      const Icon = activityIcons[item.type] || MapPin;
                      return (
                        <li key={`${index}-${item.activity}`}>
                          <time className={styles.activityTime}>
                            {item.time}
                          </time>
                          <span
                            className={`${styles.activityIcon} ${styles[item.type] || ""}`}
                          >
                            <Icon size={19} />
                          </span>
                          <div className={styles.activityBody}>
                            <h4>{item.activity}</h4>
                            <p>{item.description}</p>
                            {item.cost > 0 && (
                              <span className={styles.cost}>
                                {money(item.cost)}
                              </span>
                            )}
                          </div>
                          <button
                            className={styles.smallIconButton}
                            onClick={() =>
                              setActivityEdit({ day: day.day, index })
                            }
                            aria-label={`Edit ${item.activity}, day ${day.day}`}
                            title="Edit activity"
                          >
                            <Pencil size={15} />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                  </div>}
                </section>
              ))}
              <Link href="/plan" className={styles.textLink}>Booking & trip options <ArrowRight size={16} /></Link>
            </section>}
            <aside className={styles.logistics} aria-label="Trip logistics">
              <h2>The essentials</h2>
              {trip.flights.length > 0 && (
                <section>
                  <h3>
                    <Plane size={18} />
                    Flights
                  </h3>
                  {trip.flights.map((flight, i) => (
                    <div key={i} className={styles.logisticItem}>
                      <strong>
                        {flight.from} <ArrowRight size={14} /> {flight.to}
                      </strong>
                      <p>
                        {flight.airline} {flight.flightNo}
                      </p>
                      <span>
                        {flight.departure} - {flight.arrival}
                      </span>
                    </div>
                  ))}
                </section>
              )}
              {trip.hotel && (
                <section>
                  <h3>
                    <BedDouble size={18} />
                    Your stay
                  </h3>
                  <div className={styles.logisticItem}>
                    <strong>{trip.hotel.name}</strong>
                    <p>{trip.hotel.location}</p>
                    <span>{trip.hotel.nights} nights</span>
                  </div>
                </section>
              )}
              {trip.transfers.length > 0 && (
                <section>
                  <h3>
                    <MapPin size={18} />
                    Transfers
                  </h3>
                  {trip.transfers.map((transfer, i) => (
                    <div className={styles.logisticItem} key={i}>
                      <strong>
                        {transfer.from} to {transfer.to}
                      </strong>
                      <p>{transfer.type}</p>
                      <span>{money(transfer.cost)}</span>
                    </div>
                  ))}
                </section>
              )}
              <section>
                <h3>
                  <CalendarDays size={18} />
                  Trip details
                </h3>
                <dl className={styles.details}>
                  <dt>Destination</dt>
                  <dd>{trip.destination}</dd>
                  <dt>Start</dt>
                  <dd>{formatDate(trip.startDate)}</dd>
                  <dt>End</dt>
                  <dd>{formatDate(trip.endDate)}</dd>
                  <dt>Travelers</dt>
                  <dd>{trip.travelers}</dd>
                  {trip.planning && <>
                    <dt>Stay area</dt><dd>{trip.planning.stayArea || "Not specified"}</dd>
                    <dt>Property</dt><dd>{trip.planning.stayProperty || "Not specified"}</dd>
                    <dt>Arrival in Goa</dt><dd>{formatDate(trip.planning.arriveGoa)}</dd>
                    <dt>Departure from Goa</dt><dd>{formatDate(trip.planning.departGoa)}</dd>
                    <dt>Adults / children</dt><dd>{trip.planning.adults} / {trip.planning.children}</dd>
                    <dt>Trip budget</dt><dd>{money(trip.planning.budget)}</dd>
                  </>}
                </dl>
                <button
                  className={styles.textLink}
                  onClick={() => setEditing(true)}
                >
                  Edit details <Pencil size={15} />
                </button>
              </section>
            </aside>
          </div>
        </>
      )}
      {editing && trip && <TripEditor trip={trip} onClose={() => setEditing(false)} />}
      {activityEdit && trip && (
        <ActivityEditor
          trip={trip}
          {...activityEdit}
          onClose={() => setActivityEdit(null)}
        />
      )}
    </TravelShell>
  );
}
