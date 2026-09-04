import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineRuckus — The Movie-Night Game Show",
  description:
    "CineRuckus is a browser-only movie-night game show with a full multi-game run and quick play for Find the Director, Release Timeline, Cast Call, and Cinema Map.",
  openGraph: {
    title: "CineRuckus — The Movie-Night Game Show",
    description: "Four movie games. One delightfully temperamental CRT. Movie night, game on.",
    type: "website",
    images: [{ url: "/og.png", alt: "CineRuckus — The Movie-Night Game Show" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CineRuckus — The Movie-Night Game Show",
    description: "Four movie games. One delightfully temperamental CRT. Movie night, game on.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
