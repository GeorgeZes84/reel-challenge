import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reel Challenge! — The Movie Game Show",
  description:
    "Reel Challenge! is a browser-only movie game show with a full multi-game run and quick play for Find the Director, Release Timeline, Cast Call, and Cinema Map.",
  openGraph: {
    title: "Reel Challenge! — The Movie Game Show",
    description: "Four movie games. One delightfully temperamental CRT. Movie night, game on.",
    type: "website",
    images: [{ url: "/og.png", alt: "Reel Challenge! — The Movie Game Show" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reel Challenge! — The Movie Game Show",
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
