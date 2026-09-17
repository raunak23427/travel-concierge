"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock3,
  RefreshCw,
  TriangleAlert,
  WifiOff,
} from "lucide-react";
import { useTravel } from "./TravelProvider";
import TravelShell from "./TravelShell";
import styles from "./travel.module.css";

const labels = {
  reminder: "Reminder",
  change: "Schedule update",
  alert: "Travel alert",
};
const icons = { reminder: Clock3, change: RefreshCw, alert: TriangleAlert };
function relativeTime(value: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60000));
  if (!minutes) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export default function NotificationsScreen() {
  const {
    notifications,
    ready,
    unread,
    markRead,
    reminders,
    setReminders,
    connection,
    trip,
  } = useTravel();
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const filtered = notifications.filter(
    (n) =>
      filter === "all" || (filter === "unread" ? !n.read : n.kind === filter),
  );
  const today = new Date(now).toDateString();
  const groups = [
    {
      title: "Today",
      items: filtered.filter(
        (n) => new Date(n.createdAt).toDateString() === today,
      ),
    },
    {
      title: "Earlier",
      items: filtered.filter(
        (n) => new Date(n.createdAt).toDateString() !== today,
      ),
    },
  ];
  const connectionText = {
    local: "On-device updates",
    connecting: "Connecting...",
    live: "Live updates connected",
    reconnecting: "Reconnecting...",
    offline: "Offline",
  }[connection];
  return (
    <TravelShell>
      <div className={styles.pageHeading}>
        <div>
          <p className={styles.eyebrow}>Along for the journey</p>
          <h1>Notifications</h1>
        </div>
        <span className={styles.largeIcon}>
          <BellRing size={24} />
        </span>
      </div>
      <div className={styles.notificationSummary}>
        <p>
          {unread
            ? `${unread} unread ${unread === 1 ? "update" : "updates"}`
            : "You're all caught up"}
          {trip ? ` for ${trip.destination}` : ""}
        </p>
        <span
          className={`${styles.connection} ${connection === "live" ? styles.connected : ""}`}
          role="status"
        >
          {connection === "offline" ? <WifiOff size={14} /> : <span />}
          {connectionText}
        </span>
      </div>
      <div className={styles.notificationToolbar}>
        <div
          role="group"
          aria-label="Filter notifications"
          className={styles.filters}
        >
          {[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread" },
            { id: "reminder", label: "Reminders" },
            { id: "alert", label: "Alerts" },
          ].map((item) => (
            <button
              key={item.id}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          className={styles.iconButton}
          disabled={!unread}
          onClick={() => markRead()}
          title="Mark all as read"
          aria-label="Mark all as read"
        >
          <CheckCheck size={21} />
        </button>
      </div>
      <div className={styles.notificationLayout}>
        <section aria-label="Notification feed">
          <span
            className={styles.srOnly}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {unread} unread notifications
          </span>
          {!ready ? (
            <div role="status" className={styles.loading}>
              Loading notifications...
            </div>
          ) : !filtered.length ? (
            <div className={styles.empty}>
              <span className={styles.largeIcon}>
                <Bell size={28} />
              </span>
              <h2>
                {filter === "unread" ? "All caught up" : "No updates here yet"}
              </h2>
              <p>
                {filter === "all"
                  ? "Your next adventure is looking clear."
                  : "Nothing in this category."}
              </p>
              <Link href="/home" className={styles.textLink}>
                Back to my trip <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            groups.map(
              (group) =>
                group.items.length > 0 && (
                  <section key={group.title} className={styles.noticeGroup}>
                    <h2>
                      {group.title}
                      <span>{group.items.length}</span>
                    </h2>
                    <ul className={styles.noticeList}>
                      {group.items.map((notice) => {
                        const Icon = icons[notice.kind];
                        return (
                          <li
                            key={notice.id}
                            className={`${styles.notice} ${!notice.read ? styles.unread : ""}`}
                          >
                            <span
                              className={`${styles.noticeIcon} ${styles[notice.kind]}`}
                            >
                              <Icon size={21} />
                            </span>
                            <div className={styles.noticeBody}>
                              <div className={styles.noticeMeta}>
                                <span>{labels[notice.kind]}</span>
                                <time
                                  dateTime={notice.createdAt}
                                  title={new Date(
                                    notice.createdAt,
                                  ).toLocaleString()}
                                >
                                  {relativeTime(notice.createdAt, now)}
                                </time>
                              </div>
                              <h3>{notice.title}</h3>
                              <p>{notice.message}</p>
                              <Link
                                className={styles.textLink}
                        href={notice.day ? `/home#day-${notice.day}` : "/my-trip"}
                                onClick={() => markRead(notice.id)}
                              >
                                View {notice.day ? `day ${notice.day}` : "trip"}
                                <ArrowUpRight size={15} />
                              </Link>
                            </div>
                            <button
                              className={styles.smallIconButton}
                              disabled={notice.read}
                              onClick={() => markRead(notice.id)}
                              title={notice.read ? "Read" : "Mark as read"}
                              aria-label={`Mark ${notice.title} as read`}
                            >
                              {notice.read ? (
                                <Check size={16} />
                              ) : (
                                <span className={styles.unreadDot} />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ),
            )
          )}
        </section>
        <aside className={styles.notificationPreferences}>
          <h2>Your preferences</h2>
          <label className={styles.toggleLabel}>
            <span>
              <strong>Activity reminders</strong>
              <small>30 minutes before</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={reminders}
              disabled={!ready}
              onChange={(e) => setReminders(e.target.checked)}
            />
            <span className={styles.toggle} aria-hidden="true" />
          </label>
          <div className={styles.preferenceDetail}>
            <Clock3 size={17} />
            <span>
              {trip?.timeZone.replaceAll("_", " ") || "Destination local time"}
            </span>
          </div>
        </aside>
      </div>
    </TravelShell>
  );
}
