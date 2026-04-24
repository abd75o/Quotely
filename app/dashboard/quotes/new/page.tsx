import type { Metadata } from "next";
import { QuoteForm } from "@/components/quotes/QuoteForm";

export const metadata: Metadata = {
  title: "Nouveau devis — Quotely",
};

export default function NewQuotePage() {
  return <QuoteForm />;
}
