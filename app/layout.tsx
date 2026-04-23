import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quotely — Créez des devis professionnels en 30 secondes",
  description:
    "Quotely aide les artisans, freelances et consultants à créer des devis professionnels en quelques secondes. Signature électronique, suivi en temps réel, facturation en 1 clic.",
  keywords: "devis, facture, artisan, freelance, signature électronique, devis en ligne",
  openGraph: {
    title: "Quotely — Devis professionnels en 30 secondes",
    description: "Créez, envoyez et suivez vos devis professionnels avec l'IA.",
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
