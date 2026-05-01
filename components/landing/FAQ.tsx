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
        "border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-200",
        isOpen
          ? "shadow-sm border-[var(--primary)]/20"
          : "hover:border-[var(--primary)]/20"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 min-h-[56px] text-left cursor-pointer bg-white hover:bg-gray-50/60 transition-colors duration-150"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-96" : "max-h-0"
        )}
      >
        <p className="px-5 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed bg-white">
          {answer}
        </p>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
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
