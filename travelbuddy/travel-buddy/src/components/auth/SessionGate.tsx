"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export const DEMO_MODE_STORAGE_KEY = "travelbuddy:demo-mode";

export function startDemoMode() {
  window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, "true");
}

function useDemoMode() {
  const [demoMode, setDemoMode] = useState<boolean | null>(null);

  useEffect(() => {
    setDemoMode(window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true");
  }, []);

  return demoMode;
}

export function SessionGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const demoMode = useDemoMode();
  const hasAccess = status === "authenticated" || demoMode === true;

  useEffect(() => {
    if (status === "unauthenticated" && demoMode === false) router.replace("/welcome");
  }, [status, demoMode, router]);

  if (status === "loading" || demoMode === null || !hasAccess) {
    return <div role="status" className="min-h-[100dvh] grid place-items-center text-sm text-gray-600">Loading your journey...</div>;
  }

  return children;
}

export function EntryRedirect() {
  const { status } = useSession();
  const router = useRouter();
  const demoMode = useDemoMode();

  useEffect(() => {
    // Always open on the starting screen. Forwarding straight to /home meant a
    // previously saved trip made the app look like it had skipped onboarding.
    if (status !== "loading" && demoMode !== null) router.replace("/welcome");
  }, [status, demoMode, router]);

  return <div role="status" className="min-h-[100dvh] grid place-items-center text-sm text-gray-600">Loading TravelBuddy...</div>;
}
