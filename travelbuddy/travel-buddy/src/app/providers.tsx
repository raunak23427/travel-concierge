"use client";
import { SessionProvider } from "next-auth/react";
import { TravelProvider } from "@/components/travel/TravelProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return <SessionProvider><TravelProvider>{children}</TravelProvider></SessionProvider>;
}
