
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { THEME_BOOTSTRAP } from "@/components/travel/ThemeProvider";

export const metadata: Metadata = {
  icons: { icon: "/wayzyy-logo.svg", apple: "/wayzyy-logo.svg" },
  title: "TravelBuddy - Discover Your Next Adventure",
  description: "AI-powered travel discovery platform. Stop searching, start discovering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Sets data-theme before first paint. Without it every navigation
            flashes white for dark-mode users. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="tb-shell flex justify-center">
        <div className="tb-frame w-full max-w-[448px] min-h-[100dvh] relative shadow-[0_0_80px_rgba(0,0,0,0.1)] overflow-x-hidden">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
