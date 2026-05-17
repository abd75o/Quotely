"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, List, Pencil, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/useEmile";
import { NewClientModal, type CreatedClient } from "./NewClientModal";

interface EmileEmptyStateProps {
  onSuggestion: (text: string) => void;
}

interface ActionDef {
  key: string;
  icon: typeof FileText;
  title: string;
  description: string;
  onClick: () => void;
}

export function EmileEmptyState({ onSuggestion }: EmileEmptyStateProps) {
  const router = useRouter();
  const { conversations, isLoading } = useConversations();
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Wait until conversations finish loading before choosing copy — otherwise
  // a returning user would briefly see the "first time" greeting.
  const isFirstTime = !isLoading && conversations.length === 0;

  const title = isFirstTime
    ? "Bienvenue ! Par où on commence ?"
    : "Que veux-tu faire ?";
  const subtitle = isFirstTime
    ? "Émile est ton rédacteur de devis. Choisis une action."
    : "";

  function handleClientCreated(client: CreatedClient) {
    setIsClientModalOpen(false);
    const label =
      [client.first_name, client.name].filter(Boolean).join(" ").trim() ||
      client.name;
    onSuggestion(`Je veux faire un devis pour ${label}`);
  }

  const actions: ActionDef[] = [
    {
      key: "create-quote",
      icon: FileText,
      title: "Créer un devis",
      description: "Démarre une conversation avec Émile",
      onClick: () => onSuggestion("Je veux créer un nouveau devis"),
    },
    {
      key: "add-client",
      icon: UserPlus,
      title: "Ajouter un client",
      description: "Crée une nouvelle fiche client",
      onClick: () => setIsClientModalOpen(true),
    },
    {
      key: "see-quotes",
      icon: List,
      title: "Voir mes devis",
      description: "Liste de tous tes devis récents",
      onClick: () => router.push("/dashboard/devis"),
    },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-bg)]">
        <Pencil className="h-7 w-7 text-[var(--primary)]" />
      </div>
      <h2 className="font-fraunces max-w-md text-center text-2xl font-bold text-[var(--text-primary)]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 max-w-md text-center text-sm text-[var(--text-secondary)]">
          {subtitle}
        </p>
      )}

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3">
        {actions.map((action) => (
          <ActionCard key={action.key} action={action} />
        ))}
      </div>

      <NewClientModal
        open={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onCreated={handleClientCreated}
      />
    </div>
  );
}

function ActionCard({ action }: { action: ActionDef }) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={action.onClick}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 text-left transition-all",
        "hover:border-[var(--primary)] hover:shadow-md",
      )}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary-bg)] text-[var(--primary)] transition-colors group-hover:bg-[var(--primary)] group-hover:text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {action.title}
        </p>
        <p className="text-[12px] text-[var(--text-secondary)]">
          {action.description}
        </p>
      </div>
    </button>
  );
}
