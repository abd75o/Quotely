"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Gift, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStartEmileQuote } from "@/lib/emile/use-start-quote";
import {
  NewClientModal,
  type CreatedClient,
} from "@/components/emile/NewClientModal";
import { toastSuccess } from "@/lib/toast";

type Tone = "primary" | "emerald" | "amber";

const TONE_BG: Record<Tone, string> = {
  primary: "bg-[var(--primary-bg)] text-[var(--primary)]",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

export function QuickActions({ className }: { className?: string }) {
  const router = useRouter();
  const { startNewQuote, starting } = useStartEmileQuote();
  const [clientModalOpen, setClientModalOpen] = useState(false);

  const handleNewQuote = useCallback(() => {
    void startNewQuote();
  }, [startNewQuote]);

  const handleNewClient = useCallback(() => setClientModalOpen(true), []);
  const handleClientCreated = useCallback(
    (client: CreatedClient) => {
      const full =
        [client.first_name, client.name].filter(Boolean).join(" ").trim() ||
        client.name;
      toastSuccess(`${full} ajouté à ton carnet.`);
    },
    [],
  );

  const handleAffiliate = useCallback(
    () => router.push("/dashboard/parrainage"),
    [router],
  );

  return (
    <>
      <section
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-3",
          className,
        )}
        aria-label="Actions rapides"
      >
        <ActionCard
          tone="primary"
          icon={FileText}
          title="Créer un devis"
          subtitle="Démarre une conversation avec Émile"
          onClick={handleNewQuote}
          loading={starting}
        />
        <ActionCard
          tone="emerald"
          icon={UserPlus}
          title="Ajouter un client"
          subtitle="Crée une nouvelle fiche"
          onClick={handleNewClient}
        />
        <ActionCard
          tone="amber"
          icon={Gift}
          title="Parrainage"
          subtitle="Invite des collègues, gagne des mois gratuits"
          onClick={handleAffiliate}
        />
      </section>

      <NewClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onCreated={handleClientCreated}
      />
    </>
  );
}

interface ActionCardProps {
  tone: Tone;
  icon: typeof FileText;
  title: string;
  subtitle: string;
  onClick: () => void;
  loading?: boolean;
}

function ActionCard({
  tone,
  icon: Icon,
  title,
  subtitle,
  onClick,
  loading,
}: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "dashboard-card group flex h-full flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all duration-200 sm:p-6",
        "hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-lg",
        "active:translate-y-0 active:shadow-sm",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
          TONE_BG[tone],
        )}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--text-primary)] sm:text-base">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)] sm:text-[13px]">
          {subtitle}
        </p>
      </div>
    </button>
  );
}
