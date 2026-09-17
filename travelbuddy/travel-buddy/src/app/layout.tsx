
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-[#E5E5EA] flex justify-center">
        <div className="w-full max-w-[448px] min-h-[100dvh] bg-[#F5F3FF] relative shadow-[0_0_80px_rgba(0,0,0,0.1)] overflow-x-hidden">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
