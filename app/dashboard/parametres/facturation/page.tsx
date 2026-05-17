import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { FacturationClient } from "@/components/dashboard/FacturationClient";

export const metadata = {
  title: "Facturation et abonnement — Quovi",
  robots: { index: false, follow: false },
};

// FacturationClient uses useSearchParams() to read ?upgrade=success after a
// Stripe return — Next 16 requires the consumer to be inside a Suspense
// boundary or the static export bails.
export default function FacturationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      }
    >
      <FacturationClient />
    </Suspense>
  );
}
