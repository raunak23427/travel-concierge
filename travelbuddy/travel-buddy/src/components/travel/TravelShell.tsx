"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, Compass, House, Map, Sparkles, Luggage, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTravel } from "./TravelProvider";
import TravelChatbot from "@/components/itinerary/TravelChatbot";
import styles from "./travel.module.css";

export default function TravelShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { unread, trip, error } = useTravel();
  const pathname = usePathname();
  const notifications = pathname === "/notifications";
  const myTrip = pathname === "/my-trip";
  const [planSelected, setPlanSelected] = useState(false);

  useEffect(() => {
    const syncPlanSelection = () => setPlanSelected(window.location.hash === "#itinerary-title");
    syncPlanSelection();
    window.addEventListener("hashchange", syncPlanSelection);
    return () => window.removeEventListener("hashchange", syncPlanSelection);
  }, [pathname]);
  return (
    <div className={styles.app}>
      <a href="#travel-content" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <Link href="/home" className={styles.brand} aria-label="TravelBuddy home">
          <span className={styles.brandIcon}>
            <Compass size={32} />
          </span>
          <span>
            Travel<span className={styles.brandLight}>Buddy</span>
          </span>
        </Link>
        <div className={styles.headerActions}>
          <Link className={styles.desktopLink} href="/plan?new=1">
            Plan a trip <Compass size={16} />
          </Link>
          <button className={styles.smallIconButton} title="Sign out" aria-label="Sign out" onClick={() => signOut({ callbackUrl: "/welcome" })}><LogOut size={18} /></button>
          <Link
            className={`${styles.iconButton} ${notifications ? styles.selected : ""}`}
            href="/notifications"
            title="Notifications"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            aria-current={notifications ? "page" : undefined}
          >
            <Bell size={21} />
            {unread > 0 && (
              <span className={styles.badge}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>
      <main id="travel-content" className={styles.main}>
        {notifications && (
          <Link href="/home" className={styles.back}>
            <ArrowLeft size={16} /> Home
          </Link>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {children}
      </main>
      <footer className={styles.footer}>
        <Sparkles size={17} />
        <span>TravelBuddy assistant</span>
      </footer>
      <nav aria-label="Main navigation" className={styles.bottomNav}>
        <Link href="/home" onClick={() => setPlanSelected(false)} aria-current={!notifications && !myTrip && !planSelected ? "page" : undefined}>
          <House size={19} />
          <span>Home</span>
        </Link>
        <Link href="/home#itinerary-title" onClick={() => setPlanSelected(true)} aria-current={planSelected ? "page" : undefined}>
          <Map size={19} />
          <span>Plan</span>
        </Link>
        <Link href="/my-trip" aria-current={myTrip ? "page" : undefined}><Luggage size={19} /><span>My trip</span></Link>
        <Link
          href="/notifications"
          aria-current={notifications ? "page" : undefined}
        >
          <Bell size={19} />
          <span>Updates</span>
        </Link>
      </nav>
      <TravelChatbot
        destination={trip?.destination || "your next trip"}
        country={trip?.country || ""}
        launcherClassName={styles.assistant}
      />
    </div>
  );
}
