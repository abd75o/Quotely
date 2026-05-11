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
    question: "Puis-je passer du plan Gratuit au plan Pro à tout moment ?",
    answer:
      "Oui, à tout moment. Vous changez de plan en un clic depuis votre tableau de bord. Le passage est immédiat, et vous ne payez que le prorata des jours restants dans le mois.",
  },
  {
    question: "Que se passe-t-il si j’atteins la limite de devis du mois ?",
    answer:
      "Vous recevez une notification quand vous approchez de la limite. Si vous l’atteignez, vous pouvez soit attendre le mois suivant, soit passer au plan supérieur. Vos devis déjà créés restent toujours accessibles.",
  },
  {
    question: "Comment fonctionne la facturation ?",
    answer:
      "Vous êtes débité chaque mois à la même date que votre inscription, sur la carte enregistrée au moment de votre passage à un plan payant. Vous recevez automatiquement votre facture par email.",
  },
  {
    question: "Que se passe-t-il avec mes devis si je résilie ?",
    answer:
      "Vos devis et factures restent accessibles en lecture seule pendant 90 jours après résiliation. Vous pouvez les exporter en PDF à tout moment. Aucune donnée n’est supprimée pendant ce délai.",
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
      className="relative isolate overflow-hidden py-16 md:py-24 bg-[#FBFAF7]"
    >
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
