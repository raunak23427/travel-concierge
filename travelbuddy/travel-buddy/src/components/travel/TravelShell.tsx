"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, House, Map, Sparkles, Luggage, LogOut } from "lucide-react";
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
    <div className={`${styles.app} bg-[#FAFAFC]`}>
      <a href="#travel-content" className={styles.skip}>
        Skip to content
      </a>
      <header className="sticky top-0 z-40 w-full max-w-[448px] mx-auto backdrop-blur-xl bg-white/70 px-5 py-4 flex justify-between items-center transition-all border-b border-black/[0.04]">
        <Link href="/home" className="flex items-center gap-2" aria-label="TravelBuddy home">
          {/* Wayzyy mark, recoloured to the yellow/ink theme — the supplied
              orange version clashed with everything around it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/wayzyy-logo.svg"
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl shadow-[0_4px_12px_rgba(255,210,51,0.35)]"
          />
          <span className="font-bold text-[17px] tracking-tight text-black">
            Travel<span className="font-medium text-black/60">Buddy</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/70 transition-colors" title="Sign out" aria-label="Sign out" onClick={() => signOut({ callbackUrl: "/welcome" })}>
            <LogOut size={16} />
          </button>
          <Link
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${notifications ? "bg-black text-white shadow-md" : "bg-black/5 hover:bg-black/10 text-black/70"}`}
            href="/notifications"
            title="Notifications"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            aria-current={notifications ? "page" : undefined}
          >
            <Bell size={18} strokeWidth={notifications ? 2.5 : 2} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>
      
      <main id="travel-content" className="w-full pb-32 relative">
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {children}
      </main>
      
      <nav aria-label="Main navigation" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        {[
          { id: "home", href: "/home", icon: House, label: "Home", active: !notifications && !myTrip && !planSelected, onClick: () => setPlanSelected(false) },
          { id: "plan", href: "/home#itinerary-title", icon: Map, label: "Plan", active: planSelected, onClick: () => setPlanSelected(true) },
          { id: "trip", href: "/my-trip", icon: Luggage, label: "Trip", active: myTrip },
          { id: "updates", href: "/notifications", icon: Bell, label: "Updates", active: notifications }
        ].map(item => (
          <Link key={item.id} href={item.href} onClick={item.onClick} aria-current={item.active ? "page" : undefined}
            className={`relative flex items-center justify-center w-[60px] h-[46px] rounded-[20px] transition-all duration-300 ${item.active ? "text-black" : "text-black/40 hover:bg-black/5 hover:text-black/70"}`}>
            {item.active && (
              <span className="absolute inset-0 bg-[#FFD233] rounded-[20px] shadow-[0_2px_10px_rgba(255,210,51,0.3)] z-0" />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
              <item.icon size={18} strokeWidth={item.active ? 2.5 : 2} />
              <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>
      
      <TravelChatbot
        destination={trip?.destination || "your next trip"}
        country={trip?.country || ""}
        launcherClassName={`fixed z-50 w-14 h-14 rounded-full bg-[#1A1A1A] text-[#FFD233] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-105 active:scale-95 transition-all ${styles.assistantHome}`}
      />
    </div>
  );
}
