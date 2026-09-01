import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Director Game",
  description:
    "A no-backend director-matching game: sort a continuous field of ten film tickets into five slots inside a playful 90s CRT.",
  openGraph: {
    title: "The Director Game",
    description: "Ten film tickets. Five director slots. One delightfully temperamental CRT.",
    type: "website",
    images: [{ url: "/og.png", alt: "The Director Game" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Director Game",
    description: "Ten film tickets. Five director slots. One delightfully temperamental CRT.",
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
