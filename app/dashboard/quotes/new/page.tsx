import type { Metadata } from "next";
import { QuoteForm } from "@/components/quotes/QuoteForm";

export const metadata: Metadata = {
  title: "Nouveau devis — Quovi",
};

export default function NewQuotePage() {
  return <QuoteForm />;
}
