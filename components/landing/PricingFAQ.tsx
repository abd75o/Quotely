"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "Y a-t-il un engagement ?",
    answer:
      "Aucun engagement. Vous pouvez résilier votre abonnement à tout moment depuis votre espace, en un clic.",
  },
  {
    question: "Que se passe-t-il après les 14 jours d’essai ?",
    answer:
      "Si vous décidez de continuer, vous serez prélevé du montant de votre plan. Sinon, votre compte est désactivé sans frais. Aucune carte bancaire n’est demandée pour commencer.",
  },
  {
    question: "Puis-je changer de plan en cours de route ?",
    answer:
      "Oui, à tout moment. Vous pouvez passer de Starter à Pro (ou inversement) depuis votre espace. La facturation est ajustée au prorata.",
  },
  {
    question: "Comment fonctionne la facturation ?",
    answer:
      "Mensuelle, par carte bancaire via Stripe. Une facture est automatiquement générée et envoyée par email. Vos données restent privées et hébergées en France.",
  },
  {
    question: "Y a-t-il une réduction pour un paiement annuel ?",
    answer:
      "Pas pour le moment. Quovi vient de sortir, nous gardons les choses simples : un prix mensuel, sans engagement.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden transition-all duration-300 border-2",
        isOpen
          ? "border-[var(--primary)] bg-gradient-to-r from-white to-[var(--primary-bg)] shadow-xl"
          : "border-[var(--border)] bg-white shadow-md hover:border-[var(--primary)]/50 hover:shadow-xl"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-6 sm:px-8 py-6 min-h-[64px] text-left cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-base font-bold text-[var(--text-primary)] leading-snug">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-[var(--primary)] flex-shrink-0 transition-transform duration-300",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-[28rem]" : "max-h-0"
        )}
      >
        <p className="px-6 sm:px-8 pb-6 text-base text-[var(--text-secondary)] leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
}

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq-tarifs"
      className="relative isolate overflow-hidden py-16 md:py-24 bg-gradient-to-br from-[#F8FAFC] via-[#EEF2FF] to-[#FEF9F0]"
    >
      <div
        aria-hidden
        className="hidden md:block absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-[var(--primary-bg)] opacity-20 blur-3xl pointer-events-none -z-10"
      />
      <div
        aria-hidden
        className="hidden md:block absolute -bottom-32 -left-32 w-[24rem] h-[24rem] rounded-3xl bg-[var(--accent-warm-bg)] opacity-20 blur-3xl pointer-events-none -z-10"
      />

      <div className="relative max-w-3xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
            Questions sur les tarifs
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            Tout ce qu’il faut savoir avant de choisir.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => (
            <FAQItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
