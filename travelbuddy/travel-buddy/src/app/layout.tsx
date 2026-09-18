
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import { THEME_BOOTSTRAP } from "@/components/travel/ThemeProvider";

export const metadata: Metadata = {
  // Makes the site installable, and is what the Android wrapper reads for
  // its name, icon and splash colours.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "TravelBuddy", statusBarStyle: "default" },
  icons: {
    icon: "/wayzyy-logo.svg",
    apple: "/icon-192.png",
  },
  title: "TravelBuddy - Discover Your Next Adventure",
  description: "AI-powered travel discovery platform. Stop searching, start discovering.",
};

/** Tints the Android status bar to the brand yellow. */
export const viewport: Viewport = {
  themeColor: "#FF6B1A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
