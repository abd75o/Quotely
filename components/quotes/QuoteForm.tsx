"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Save, Eye, Loader2, Mic, AlertCircle, Plus, Info, X, Edit, TrendingUp } from "lucide-react";
import { ClientSelector } from "./ClientSelector";
import { LineItemsEditor, LineItem } from "./LineItemsEditor";
import { toastSuccess, toastError } from "@/lib/toast";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { ProBadge } from "@/components/ui/ProBadge";
import { cn } from "@/lib/utils";

type ClientValue =
  | { type: "existing"; clientId: string; client: { id: string; name: string; email: string; phone?: string } }
  | { type: "new"; data: { name: string; email: string; phone: string } }
  | null;

function generateNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `QTL-${year}-${seq}`;
}

function defaultValidUntil(): string {
  const d = new Date(Date.now() + 30 * 86400_000);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function QuoteForm() {
  const router = useRouter();
  const { isStarter } = useUserPlan();
  const { showUpgradeModal } = useUpgradeModal();

  // Metadata
  const [number] = useState(generateNumber);
  const [date] = useState(todayStr);
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [taxRate, setTaxRate] = useState<10 | 20>(20);
  const [notes, setNotes] = useState("");

  // Client
  const [client, setClient] = useState<ClientValue>(null);

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    { id: "item-1", description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);

  // AI generation
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiText, setAiText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiMarginNote, setAiMarginNote] = useState("");
  const [aiClientType, setAiClientType] = useState<"particulier" | "professionnel" | null>(null);

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateWithAI = useCallback(async () => {
    if (!aiText.trim()) {
      setAiError("Décrivez d'abord votre prestation.");
      return;
    }
    setAiError("");
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setItems(data.items);
      if (data.tvaRate === 10 || data.tvaRate === 20) setTaxRate(data.tvaRate);
      setAiSuggestions(data.suggestions ?? []);
      setAiMarginNote(data.marginNote ?? "");
      setAiClientType(data.clientType ?? null);
      setAiExpanded(false);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Génération échouée");
    } finally {
      setIsGenerating(false);
    }
  }, [aiText]);

  function addSuggestionAsItem(suggestion: string) {
    const newItem: LineItem = {
      id: `sugg-${Date.now()}`,
      description: suggestion.replace(/\s*—.*$/, "").replace(/^(Ajouter|Prévoir|Inclure)\s+/i, "").trim(),
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setAiSuggestions((prev) => prev.filter((s) => s !== suggestion));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!client) errs.client = "Sélectionnez ou créez un client.";
    if (items.every((i) => !i.description.trim())) errs.items = "Ajoutez au moins une prestation.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const body = {
        number,
        taxRate,
        items,
        validUntil,
        notes: notes.trim() || undefined,
        ...(client?.type === "existing"
          ? { clientId: client.clientId }
          : { newClient: client?.data }),
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur");

      toastSuccess("Devis créé avec succès");
      router.push(`/dashboard/quotes/${data.quote.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création";
      setErrors({ submit: msg });
      toastError(msg);
      setIsSubmitting(false);
    }
  }

  const total = items.reduce((s, i) => s + i.total, 0) * (1 + taxRate / 100);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Nouveau devis</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">N° {number}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isStarter) {
                  showUpgradeModal(
                    "Génération IA",
                    "Décrivez la prestation en quelques mots. L'IA structure automatiquement les lignes, détecte le type de client et suggère la TVA adaptée.",
                    Sparkles
                  );
                  return;
                }
                setAiExpanded(!aiExpanded);
              }}
              className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--primary)] bg-[var(--primary-bg)] hover:bg-indigo-100 rounded-xl cursor-pointer transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Générer avec l&apos;IA
              {isStarter && (
                <span className="absolute -top-1.5 -right-1.5">
                  <ProBadge size="sm" />
                </span>
              )}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-60 rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {isSubmitting ? "Création…" : "Prévisualiser"}
            </button>
          </div>
        </div>

        {/* AI Panel */}
        {aiExpanded && (
          <div className="mb-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-[var(--primary)]/20 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              <h3 className="text-sm font-bold text-[var(--primary)]">Génération IA — Claude</h3>
            </div>
            <p className="text-xs text-indigo-700 mb-3">
              Décrivez votre prestation. Claude génère les lignes, détecte le type de client et suggère la TVA adaptée.
            </p>
            <div className="relative">
              <textarea
                value={aiText}
                onChange={(e) => { setAiText(e.target.value); setAiError(""); }}
                placeholder="Ex: pose carrelage salle de bain 12m² pour M. Dupont, dépose ancien carrelage incluse…"
                rows={4}
                aria-label="Description de la prestation pour la génération IA"
                className="w-full px-4 py-3 text-sm bg-white border border-[var(--primary)]/30 rounded-xl outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 resize-none placeholder:text-indigo-300 text-[var(--text-primary)]"
              />
              <button
                type="button"
                aria-label="Dictée vocale"
                onClick={() => {
                  if (isStarter) {
                    showUpgradeModal(
                      "Dictée vocale",
                      "Créez vos devis en parlant. L'IA structure automatiquement votre dictée en lignes de prestations.",
                      Mic
                    );
                    return;
                  }
                  // TODO Phase 2 — démarrer la reconnaissance vocale Web Speech API
                  toastSuccess("Dictée vocale bientôt disponible");
                }}
                className="absolute bottom-3 right-3 p-1.5 rounded-lg text-indigo-400 hover:text-[var(--primary)] hover:bg-indigo-50 cursor-pointer transition-colors"
              >
                <Mic className="w-4 h-4" />
                {isStarter && (
                  <span className="absolute -top-2 -right-2">
                    <ProBadge size="sm" withIcon={false} />
                  </span>
                )}
              </button>
            </div>
            {aiError && (
              <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {aiError}
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-indigo-500">Tarifs 2026 · Détection client · TVA auto</p>
              <button
                type="button"
                onClick={generateWithAI}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-60 rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? "Génération…" : "Générer les lignes"}
              </button>
            </div>
          </div>
        )}

        {/* AI result metadata — client type + margin note */}
        {(aiClientType || aiMarginNote) && !aiExpanded && (
          <div className="mb-4 flex flex-wrap gap-2">
            {aiClientType && (
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                aiClientType === "professionnel"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              )}>
                Client {aiClientType} · TVA {taxRate}% détectée
              </span>
            )}
            {aiMarginNote && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <Info className="w-3 h-3 flex-shrink-0" />
                {aiMarginNote}
              </span>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
              <ClientSelector value={client} onChange={setClient} />
              {errors.client && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.client}
                </p>
              )}
            </div>

            {/* Line items */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">
                Prestations
              </h2>
              <LineItemsEditor
                items={items}
                onChange={setItems}
                taxRate={taxRate}
                onTaxRateChange={setTaxRate}
              />
              {errors.items && (
                <p className="mt-3 text-xs text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.items}
                </p>
              )}

              {/* AI suggestions */}
              {aiSuggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
                    Prestations suggérées
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSuggestionAsItem(s)}
                        className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary-bg)] hover:bg-indigo-100 border border-[var(--primary)]/30 hover:border-[var(--primary)] rounded-xl cursor-pointer transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        {s}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAiSuggestions([])}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors"
                      aria-label="Ignorer les suggestions"
                    >
                      <X className="w-3 h-3" />
                      Ignorer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
              <label
                htmlFor="notes"
                className="text-sm font-bold text-[var(--text-primary)] mb-3 block"
              >
                Notes & conditions{" "}
                <span className="font-normal text-[var(--text-muted)]">(optionnel)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Conditions de paiement, délais d'intervention, garanties…"
                rows={3}
                className="w-full px-4 py-3 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl outline-none focus:bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 resize-none placeholder:text-[var(--text-muted)] transition-all"
              />
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Devis info */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Infos du devis</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    N° du devis
                  </label>
                  <div className="px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-mono text-[var(--text-secondary)]">
                    {number}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Date du devis
                  </label>
                  <div className="px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)]">
                    {new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </div>
                </div>

                <div>
                  <label htmlFor="validUntil" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Valide jusqu'au
                  </label>
                  <input
                    id="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Total recap */}
            <div className="bg-gradient-to-br from-[var(--primary)] to-indigo-700 rounded-2xl p-5 text-white">
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Total TTC</p>
              <p className="text-3xl font-black tabular-nums">
                {total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
              <p className="text-indigo-300 text-xs mt-2">
                HT {(total / (1 + taxRate / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € · TVA {taxRate}%
              </p>
            </div>

            {/* Submit error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-60 rounded-xl cursor-pointer transition-colors shadow-md"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSubmitting ? "Création en cours…" : "Créer le devis"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
