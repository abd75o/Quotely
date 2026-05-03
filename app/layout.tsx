import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { UserStateProvider } from "@/lib/hooks/useUserState";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quotely — Le devis signé où que vous soyez",
  description:
    "Quotely permet aux artisans, freelances, commerçants et consultants de signer leurs devis sur le terrain. Signature électronique conforme eIDAS, suivi en temps réel, facturation après signature.",
  keywords: "devis, facture, artisan, freelance, signature électronique, devis en ligne",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Quotely — Le devis signé où que vous soyez",
    description: "Le devis qui part avant que vous passiez à autre chose.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
        <UserStateProvider>{children}</UserStateProvider>
      </body>
    </html>
  );
}
