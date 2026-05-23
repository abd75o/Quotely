"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  Edit3,
  Download,
  Copy,
  Check,
  Loader2,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Award,
  Bell,
  Save,
  X as XIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { ProBadge } from "@/components/ui/ProBadge";
import { useUserPlan } from "@/lib/hooks/useUserState";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import { cn } from "@/lib/utils";
import { formatSiret } from "@/lib/format/siret";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Client {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface Artisan {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  siret?: string;
  logo_url?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  legal_status?: string;
  registration_number?: string;
  registration_city?: string;
  decennale_company?: string;
  decennale_number?: string;
  rc_pro_number?: string;
}

const RCS_LEGAL_STATUSES = new Set(["sarl", "sas", "sasu", "eurl"]);
const RM_LEGAL_STATUSES = new Set(["ei", "auto-entrepreneur"]);

function artisanRegistrationLabel(a: Artisan | null | undefined): string | null {
  if (!a?.registration_number) return null;
  const status = (a.legal_status ?? "").toLowerCase().trim();
  if (RCS_LEGAL_STATUSES.has(status)) {
    return a.registration_city
      ? `RCS ${a.registration_city} ${a.registration_number}`
      : `RCS ${a.registration_number}`;
  }
  if (RM_LEGAL_STATUSES.has(status)) return `RM ${a.registration_number}`;
  return `N° ${a.registration_number}`;
}

// Title-cases a multi-word string while preserving short uppercase acronyms
// (SAS, EURL, SARL…). Used by the doc-header brand fallback so "tr électricité"
// renders as "Tr Électricité" instead of all-caps shouting.
function titleCase(input: string): string {
  return input
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (/^[A-Z0-9.&]+$/.test(part) && part.length <= 5) return part;
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

function artisanBrandLabel(a: Artisan | null | undefined): string {
  if (!a) return "";
  const raw = (a.company || a.name || a.email || "").trim();
  return raw ? titleCase(raw) : "";
}

interface Quote {
  id: string;
  number: string;
  status: string;
  items: QuoteItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  valid_until: string;
  created_at: string;
  notes?: string;
  // DB has two token columns from different eras:
  //  - public_token   → legacy, route /devis/<token>
  //  - signature_token → current Émile flow, route /sign/<token>  (canonical)
  // executeSendQuote() builds `${appUrl}/sign/${signature_token}` so we mirror that.
  public_token?: string | null;
  signature_token?: string | null;
  signature_type: string;
  signed_at?: string;
  client?: Client | null;
  artisan?: Artisan | null;
}

const STATUS = {
  draft: { label: "Brouillon", icon: Edit3, color: "text-gray-600 bg-gray-100 border-gray-200" },
  pending: { label: "En attente", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
  sent: { label: "Envoyé", icon: Send, color: "text-blue-600 bg-blue-50 border-blue-200" },
  viewed: { label: "Vu", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
  signed: { label: "Signé", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  refused: { label: "Refusé", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" },
  invoiced: { label: "Facturé", icon: CheckCircle2, color: "text-violet-600 bg-violet-50 border-violet-200" },
} as const;

function fmt(n: number | undefined | null) {
  return (n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | undefined | null) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

// ISO → YYYY-MM-DD for <input type="date">
function toDateInput(d: string | undefined | null): string {
  if (!d) return "";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function buildSignLink(quote: Quote): string | null {
  const token = quote.signature_token || quote.public_token;
  if (!token) return null;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  // /sign/<token> is the canonical route (matches executeSendQuote in lib/quotes/send.ts).
  // Legacy /devis/<public_token> still works but the new public page lives at /sign/<token>.
  const path = quote.signature_token ? "sign" : "devis";
  return `${origin}/${path}/${token}`;
}

export function QuotePreview({ quote }: { quote: Quote }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signLink, setSignLink] = useState("");
  const { isStarter } = useUserPlan();
  const { showUpgradeModal } = useUpgradeModal();

  // ─── Inline edit state ─────────────────────────────────────────────────────
  const isLocked = quote.status === "signed" || quote.status === "invoiced";
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftItems, setDraftItems] = useState<QuoteItem[]>(quote.items ?? []);
  const [draftTaxRate, setDraftTaxRate] = useState<number>(Number(quote.tax_rate ?? 20));
  const [draftNotes, setDraftNotes] = useState<string>(quote.notes ?? "");
  const [draftValidUntil, setDraftValidUntil] = useState<string>(toDateInput(quote.valid_until));

  const status = STATUS[quote.status as keyof typeof STATUS] ?? STATUS.pending;
  const StatusIcon = status.icon;

  // Live totals while editing (round to 2 decimals to match the API).
  const draftSubtotal = useMemo(
    () =>
      Math.round(
        draftItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0) * 100,
      ) / 100,
    [draftItems],
  );
  const draftTaxAmount = useMemo(
    () => Math.round(draftSubtotal * (draftTaxRate / 100) * 100) / 100,
    [draftSubtotal, draftTaxRate],
  );
  const draftTotal = useMemo(
    () => Math.round((draftSubtotal + draftTaxAmount) * 100) / 100,
    [draftSubtotal, draftTaxAmount],
  );

  // Values shown in the table/totals: drafts while editing, persisted otherwise.
  const shownItems = isEditing ? draftItems : quote.items ?? [];
  const shownSubtotal = isEditing ? draftSubtotal : quote.subtotal;
  const shownTaxRate = isEditing ? draftTaxRate : quote.tax_rate;
  const shownTaxAmount = isEditing ? draftTaxAmount : quote.tax_amount;
  const shownTotal = isEditing ? draftTotal : quote.total;

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
      const data = await res.json();
      if (data.signLink) setSignLink(data.signLink);
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    const link = signLink || buildSignLink(quote);
    if (!link) {
      toast.error("Aucun lien de signature disponible pour ce devis.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Lien de signature copié ✓");
    } catch (e) {
      console.error("[COPY LINK] clipboard failed", e);
      toast.error("Impossible de copier — copie manuellement le lien.");
    }
  }

  function enterEdit() {
    if (isLocked) return;
    setDraftItems(quote.items?.map((i) => ({ ...i })) ?? []);
    setDraftTaxRate(Number(quote.tax_rate ?? 20));
    setDraftNotes(quote.notes ?? "");
    setDraftValidUntil(toDateInput(quote.valid_until));
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  function updateItem(idx: number, patch: Partial<QuoteItem>) {
    setDraftItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const next = { ...item, ...patch };
        next.quantity = Number(next.quantity) || 0;
        next.unitPrice = Number(next.unitPrice) || 0;
        next.total = Math.round(next.quantity * next.unitPrice * 100) / 100;
        return next;
      }),
    );
  }

  function addItem() {
    setDraftItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${prev.length}`,
        description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  }

  function removeItem(idx: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveEdit() {
    if (isLocked) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: draftItems,
          taxRate: draftTaxRate,
          notes: draftNotes,
          validUntil: draftValidUntil ? new Date(draftValidUntil).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      toast.success("Modifications enregistrées ✓");
      setIsEditing(false);
      router.refresh();
    } catch (e) {
      console.error("[SAVE QUOTE]", e);
      toast.error("Échec de l'enregistrement — réessaie.");
    } finally {
      setSaving(false);
    }
  }

  const editTooltip = isLocked
    ? quote.status === "signed"
      ? "Devis signé, non modifiable"
      : "Devis facturé, non modifiable"
    : undefined;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/devis"
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Mes devis
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{quote.number}</span>

          {/* Status badge */}
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", status.color)}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-white hover:bg-gray-50 border border-[var(--border)] rounded-xl cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copié !" : "Copier le lien"}
            </button>
          )}

          {isEditing ? (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-white hover:bg-gray-50 border border-[var(--border)] rounded-xl cursor-pointer transition-colors disabled:opacity-60"
              >
                <XIcon className="w-4 h-4" />
                Annuler
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 rounded-xl cursor-pointer transition-colors shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enterEdit}
              disabled={isLocked}
              title={editTooltip}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-xl transition-colors",
                isLocked
                  ? "text-[var(--text-muted)] bg-gray-50 border-[var(--border)] cursor-not-allowed"
                  : "text-[var(--text-secondary)] bg-white hover:bg-gray-50 border-[var(--border)] cursor-pointer",
              )}
            >
              <Edit3 className="w-4 h-4" />
              Modifier
            </button>
          )}
          {/* Generated by lib/pdf/quote-template.tsx — opens the real PDF in a
              new tab. window.print() was a fallback that printed the HTML
              preview instead, which doesn't match the issued document. */}
          {!isEditing && (
            <a
              href={`/api/quotes/${quote.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-white hover:bg-gray-50 border border-[var(--border)] rounded-xl cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              PDF
            </a>
          )}
          {!isEditing && quote.status === "pending" && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || sent}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-70 rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {sending ? "Envoi…" : sent ? "Envoyé !" : "Envoyer au client"}
            </button>
          )}
        </div>
      </div>

      {/* Pro features teaser — Starter uniquement */}
      {isStarter && !isEditing && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              showUpgradeModal(
                "Score de signature",
                "Découvrez la probabilité de signature de ce devis et nos conseils pour l'optimiser.",
                Award
              )
            }
            className="relative inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] bg-white border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] rounded-xl cursor-pointer transition-colors"
          >
            <Award className="w-3.5 h-3.5" />
            Score de signature
            <span className="absolute -top-1.5 -right-1.5">
              <ProBadge size="sm" withIcon={false} />
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              showUpgradeModal(
                "Relances automatiques",
                "Quovi relance automatiquement vos clients à J+3, J+7 et J+14 si le devis n'est pas signé.",
                Bell
              )
            }
            className="relative inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] bg-white border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] rounded-xl cursor-pointer transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            Configurer les relances automatiques
            <span className="absolute -top-1.5 -right-1.5">
              <ProBadge size="sm" withIcon={false} />
            </span>
          </button>
        </div>
      )}

      {/* Sent confirmation */}
      {sent && (
        <div className="mb-4 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-800">Email envoyé à {quote.client?.email}</p>
            <p className="text-xs text-emerald-600 truncate mt-0.5">
              Lien de signature : {signLink || buildSignLink(quote) || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer flex-shrink-0"
          >
            Copier
          </button>
        </div>
      )}

      {/* Document */}
      <div className="bg-white rounded-3xl border border-[var(--border)] shadow-xl overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        {/* Doc header — artisan brand, never Quovi's */}
        <div className="flex items-start justify-between p-8 pb-6 border-b border-[var(--border)]">
          <div>
            {quote.artisan?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quote.artisan.logo_url}
                alt={artisanBrandLabel(quote.artisan) || "Logo"}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {artisanBrandLabel(quote.artisan) || "Devis"}
              </h1>
            )}
            {quote.artisan && (
              <div className="mt-4 text-sm text-[var(--text-secondary)] space-y-0.5">
                {quote.artisan.company && (
                  <p className="font-semibold text-[var(--text-primary)]">
                    {quote.artisan.company}
                  </p>
                )}
                <p>{quote.artisan.name}</p>
                {quote.artisan.address && <p>{quote.artisan.address}</p>}
                {(quote.artisan.postal_code || quote.artisan.city) && (
                  <p>
                    {[quote.artisan.postal_code, quote.artisan.city]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
                <p>{quote.artisan.email}</p>
                {quote.artisan.phone && <p>{quote.artisan.phone}</p>}
                {quote.artisan.siret && (
                  <p className="text-xs text-[var(--text-muted)]">
                    SIRET {formatSiret(quote.artisan.siret) || quote.artisan.siret}
                  </p>
                )}
                {artisanRegistrationLabel(quote.artisan) && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {artisanRegistrationLabel(quote.artisan)}
                  </p>
                )}
                {quote.artisan.decennale_number && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Décennale
                    {quote.artisan.decennale_company
                      ? ` ${quote.artisan.decennale_company}`
                      : ""}{" "}
                    n°{quote.artisan.decennale_number}
                  </p>
                )}
                {quote.artisan.rc_pro_number && (
                  <p className="text-xs text-[var(--text-muted)]">
                    RC pro n°{quote.artisan.rc_pro_number}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">DEVIS</h1>
            <p className="text-sm font-mono text-[var(--text-secondary)] mt-1">{quote.number}</p>
            <div className="mt-3 text-sm text-[var(--text-secondary)] space-y-0.5">
              <p>Date : <span className="font-medium text-[var(--text-primary)]">{fmtDate(quote.created_at)}</span></p>
              <p className="flex items-center justify-end gap-2">
                <span>Valide jusqu'au :</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={draftValidUntil}
                    onChange={(e) => setDraftValidUntil(e.target.value)}
                    className="px-2 py-1 text-sm border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)]"
                  />
                ) : (
                  <span className="font-medium text-[var(--text-primary)]">{fmtDate(quote.valid_until)}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Client block */}
        {quote.client && (
          <div className="px-8 py-5">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Destinataire</p>
            <div className="p-4 bg-[var(--surface)] rounded-xl">
              <p className="font-semibold text-[var(--text-primary)]">{quote.client.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">{quote.client.email}</p>
              {quote.client.phone && <p className="text-sm text-[var(--text-secondary)]">{quote.client.phone}</p>}
              {quote.client.address && <p className="text-sm text-[var(--text-secondary)] mt-1">{quote.client.address}</p>}
            </div>
          </div>
        )}

        {/* Line items table */}
        <div className="px-8 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[var(--border)]">
                <th className="text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider pb-3">Description</th>
                <th className="text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider pb-3 w-20">Qté</th>
                <th className="text-right text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider pb-3 w-32">Prix unit. HT</th>
                <th className="text-right text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider pb-3 w-32">Total HT</th>
                {isEditing && <th className="w-10 pb-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {shownItems.map((item, idx) => (
                <tr key={item?.id ?? `item-${idx}`} className="group">
                  <td className="py-3.5 pr-4 text-sm text-[var(--text-primary)]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="Description de la prestation"
                        className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)]"
                      />
                    ) : (
                      item?.description ?? ""
                    )}
                  </td>
                  <td className="py-3.5 text-sm text-center text-[var(--text-secondary)]">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-center"
                      />
                    ) : (
                      item?.quantity ?? 0
                    )}
                  </td>
                  <td className="py-3.5 text-sm text-right text-[var(--text-secondary)] tabular-nums">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-right"
                      />
                    ) : (
                      <>{fmt(item?.unitPrice)} €</>
                    )}
                  </td>
                  <td className="py-3.5 text-sm text-right font-medium text-[var(--text-primary)] tabular-nums">
                    {fmt(item?.total)} €
                  </td>
                  {isEditing && (
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={shownItems.length <= 1}
                        aria-label="Supprimer la ligne"
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          shownItems.length > 1
                            ? "text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 cursor-pointer"
                            : "text-[var(--border)] cursor-not-allowed",
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {isEditing && (
            <button
              type="button"
              onClick={addItem}
              className="mt-3 flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-bg)] rounded-xl border border-dashed border-[var(--primary)]/40 hover:border-[var(--primary)] w-full justify-center cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter une ligne
            </button>
          )}
        </div>

        {/* Totals */}
        <div className="px-8 py-5 border-t border-[var(--border)]">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Sous-total HT</span>
                <span className="tabular-nums font-medium">{fmt(shownSubtotal)} €</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-secondary)]">
                  TVA{" "}
                  {isEditing ? (
                    <select
                      value={draftTaxRate}
                      onChange={(e) => setDraftTaxRate(parseFloat(e.target.value))}
                      className="ml-1 px-1.5 py-0.5 text-xs border border-[var(--border)] rounded outline-none focus:border-[var(--primary)]"
                    >
                      <option value={5.5}>5,5%</option>
                      <option value={10}>10%</option>
                      <option value={20}>20%</option>
                    </select>
                  ) : (
                    <>({shownTaxRate}%)</>
                  )}
                </span>
                <span className="tabular-nums font-medium">{fmt(shownTaxAmount)} €</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-3 border-t-2 border-[var(--text-primary)]">
                <span>Total TTC</span>
                <span className="text-[var(--primary)] tabular-nums">{fmt(shownTotal)} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {(isEditing || quote.notes) && (
          <div className="px-8 py-5 border-t border-[var(--border)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Notes & conditions</p>
            {isEditing ? (
              <textarea
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                rows={4}
                placeholder="Conditions de paiement, délais, garanties…"
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-xl outline-none focus:border-[var(--primary)] leading-relaxed"
              />
            ) : (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{quote.notes}</p>
            )}
          </div>
        )}

        {/* Signature zone */}
        <div className="px-8 py-6 border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-col sm:flex-row items-start gap-6 justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[var(--primary)]" />
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Signature client</p>
              </div>
              {quote.status === "signed" && quote.signed_at ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Signé le {fmtDate(quote.signed_at)}
                </div>
              ) : (
                <div>
                  <div className="h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-sm text-[var(--text-muted)]">
                    Zone de signature
                  </div>
                  {(quote.signature_token || quote.public_token) && (
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      Lien de signature :{" "}
                      <span className="font-mono text-xs text-[var(--primary)]">
                        /{quote.signature_token ? "sign" : "devis"}/
                        {(quote.signature_token ?? quote.public_token ?? "").slice(0, 8)}…
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right text-xs text-[var(--text-muted)] space-y-1">
              <p className="font-semibold text-[var(--text-secondary)]">Bon pour accord</p>
              <p>Lu et approuvé</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
