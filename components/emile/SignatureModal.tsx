"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PenLine, X } from "lucide-react";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/ui/SignaturePad";
import { toastError, toastSuccess } from "@/lib/toast";
import { humanizeError } from "@/lib/errors";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the persisted PUBLIC URL (versioned) after a successful save. */
  onSaved: (signatureUrl: string) => void;
  /** Existing signature, shown as "current" preview in edit mode. */
  existingSignatureUrl?: string | null;
}

/**
 * Artisan signature pad — captures the company signature once, reused across
 * every PDF. Mobile-first since the typical flow is "signe sur ton téléphone
 * sur le chantier" — the canvas is wider than the usable click area on phones
 * deliberately so the stroke quality is sharp when downsampled into the PDF.
 *
 * Mode "edit" (when existingSignatureUrl is set) shows the current signature
 * above the pad and labels the button "Mettre à jour"; otherwise it's the
 * first-time onboarding view.
 */
export function SignatureModal({
  open,
  onClose,
  onSaved,
  existingSignatureUrl,
}: SignatureModalProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [submitting, setSubmitting] = useState(false);
  // Mirror of the pad's emptiness so the "Valider" button can be disabled
  // without forcing the pad to re-render on every stroke (the pad reports
  // strokeEnd events, which is enough granularity for a submit gate).
  const [hasStroke, setHasStroke] = useState(false);

  // Reset transient UI state each time the modal reopens so reopening after a
  // failed save doesn't leave the spinner on.
  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setHasStroke(false);
  }, [open]);

  // ESC + body scroll lock — mirrors the convention used by the other modals
  // (BulkImportModal, ProfileCompletionModal). Touch users can tap the
  // backdrop to dismiss too.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, submitting]);

  async function handleSubmit() {
    if (submitting) return;
    const dataUrl = padRef.current?.toDataURL();
    if (!dataUrl) {
      toastError("Signe d'abord dans le cadre.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw body;
      }
      const json = (await res.json()) as { signature_url: string };
      toastSuccess(
        existingSignatureUrl
          ? "Signature mise à jour."
          : "Signature enregistrée.",
      );
      onSaved(json.signature_url);
    } catch (err) {
      console.error("[SignatureModal] save failed:", err);
      toastError(humanizeError(err, "Impossible d'enregistrer la signature."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const isEdit = !!existingSignatureUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Modifier ma signature" : "Signer mon entreprise"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-[var(--border)] bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary-bg)] text-[var(--primary)]">
              <PenLine className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-fraunces text-lg font-bold text-[var(--text-primary)]">
                {isEdit ? "Modifier ma signature" : "Signer mon entreprise"}
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                Signe une fois (au doigt sur mobile ou à la souris sur
                ordinateur) — ta signature sera utilisée sur{" "}
                <strong>tous tes devis</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isEdit && existingSignatureUrl && (
            <div className="mb-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Signature actuelle
              </p>
              <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingSignatureUrl}
                  alt="Signature actuelle"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                Signe ci-dessous pour la remplacer.
              </p>
            </div>
          )}

          <SignaturePad
            ref={padRef}
            onSignatureChange={(dataUrl) => setHasStroke(dataUrl !== null)}
            placeholder={isEdit ? "Nouvelle signature" : "Signez ici"}
          />
        </div>

        <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-[var(--border)] bg-white px-5 py-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => padRef.current?.clear()}
            disabled={submitting}
            className="min-h-[44px] rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-gray-50 disabled:opacity-50 sm:order-1 sm:flex-none"
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !hasStroke}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:order-2 sm:flex-none"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Mettre à jour" : "Valider la signature"}
          </button>
        </footer>
      </div>
    </div>
  );
}
