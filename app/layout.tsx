import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quotely — Le devis signé depuis le chantier",
  description:
    "Quotely permet aux artisans, freelances et consultants de signer leurs devis depuis le chantier. Signature électronique conforme eIDAS, suivi en temps réel, facturation après signature.",
  keywords: "devis, facture, artisan, freelance, signature électronique, devis en ligne",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Quotely — Le devis signé depuis le chantier",
    description: "Le devis qui part avant que vous quittiez le chantier.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
