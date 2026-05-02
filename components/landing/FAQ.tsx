"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "La signature électronique de Quotely est-elle légalement valide ?",
    answer:
      "Oui, totalement. Elle suit le règlement européen eIDAS. Chaque signature est horodatée, liée à l’email du signataire, et accompagnée d’un certificat d’audit. Elle a la même valeur juridique qu’une signature papier en France et en Europe.",
  },
  {
    question: "Faut-il être à l’aise avec l’informatique pour utiliser Quotely ?",
    answer:
      "Non. Si vous savez écrire un SMS, vous savez utiliser Quotely. Tout est pensé pour le terrain, pas pour le bureau.",
  },
  {
    question: "Puis-je importer mes clients et mes anciens modèles ?",
    answer:
      "Oui. Import depuis un fichier Excel, CSV, ou directement depuis votre carnet d’adresses. Vos modèles existants, on les recrée avec vous si besoin.",
  },
  {
    question: "Mon client doit-il créer un compte Quotely pour signer ?",
    answer:
      "Non, jamais. Il reçoit un lien, il clique, il signe. C’est tout.",
  },
  {
    question: "Puis-je personnaliser les devis avec mon logo et mes couleurs ?",
    answer:
      "Oui. Logo, couleurs, mentions légales, conditions de paiement. Tout est ajustable en quelques minutes.",
  },
  {
    question: "Comment fonctionnent les relances automatiques ?",
    answer:
      "Quotely relance votre client à J+3, J+7 et J+14 si le devis n’est pas signé. Avec un message courtois, personnalisé. Vous pouvez les désactiver, les modifier, ou en programmer d’autres.",
  },
  {
    question: "Puis-je résilier à tout moment ?",
    answer:
      "Oui, à n’importe quel moment, sans justification. Un seul clic dans vos paramètres. Aucun engagement, aucun frais caché.",
  },
  {
    question: "Comment Quotely arrive à rédiger un devis aussi vite ?",
    answer:
      "Quotely s’appuie sur des modèles de langage avancés (intelligence artificielle) pour transformer votre description en devis structuré : prestations détaillées, calcul de TVA, formulations professionnelles. Vous gardez toujours la main : relisez, ajustez, validez avant l’envoi. Vos données ne servent jamais à entraîner les modèles — elles restent privées et hébergées en France.",
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

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative isolate overflow-hidden py-16 md:py-24 bg-gradient-to-br from-[#F8FAFC] via-[#EEF2FF] to-[#FEF9F0]"
    >
      {/* Decorative blobs — hidden on mobile */}
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
            Vos questions, nos réponses.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            Une question manque ?{" "}
            <a
              href="mailto:support@quotely.fr"
              className="text-[var(--primary)] font-semibold hover:underline cursor-pointer"
            >
              Écrivez-nous
            </a>
            , on répond vite.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => (
            <FAQItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
