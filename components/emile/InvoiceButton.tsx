"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";

interface InvoiceButtonProps {
  invoiceId: string;
}

// Bouton "Voir la facture" rendu dans une bulle Émile à partir du marker
// [OPEN_INVOICE:<id>] (notif posée à la signature). Calqué sur ProfileButton.
export function InvoiceButton({ invoiceId }: InvoiceButtonProps) {
  return (
    <Link
      href={`/dashboard/factures/${invoiceId}`}
      className="mt-2 inline-flex items-center gap-1.5 self-start rounded-lg border border-[var(--primary)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
    >
      <Receipt className="h-3.5 w-3.5" />
      Voir la facture
    </Link>
  );
}
