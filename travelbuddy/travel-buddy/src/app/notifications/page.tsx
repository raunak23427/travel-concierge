import type { Metadata } from "next";
import NotificationsScreen from "@/components/travel/NotificationsScreen";
import { SessionGate } from "@/components/auth/SessionGate";

export const metadata: Metadata = { title: "Notifications | TravelBuddy" };

export default function Page() {
  return <SessionGate><NotificationsScreen /></SessionGate>;
}
