import { FacturationClient } from "@/components/dashboard/FacturationClient";

export const metadata = {
  title: "Facturation et abonnement — Quotely",
  robots: { index: false, follow: false },
};

export default function FacturationPage() {
  return <FacturationClient />;
}
