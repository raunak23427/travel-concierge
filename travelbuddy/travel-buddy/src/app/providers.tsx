"use client";
import { SessionProvider } from "next-auth/react";
import { TravelProvider } from "@/components/travel/TravelProvider";
import { ThemeProvider } from "@/components/travel/ThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <TravelProvider>{children}</TravelProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}
