"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "Qui sont Émile et Iris ?",
    answer:
      "Ce sont les deux agents qui tournent dans Quovi. Émile rédige vos devis à partir d’une simple description (voix, texte ou photo). Iris surveille les devis envoyés et relance au bon moment. Ils bossent en coulisse pendant que vous êtes sur le chantier.",
  },
  {
    question: "La signature électronique de Quovi est-elle légalement valide ?",
    answer:
      "Oui, totalement. Elle suit le règlement européen eIDAS. Chaque signature est horodatée, liée à l’email du signataire, et accompagnée d’un certificat d’audit. Elle a la même valeur juridique qu’une signature papier en France et en Europe.",
  },
  {
    question: "Faut-il être à l’aise avec l’informatique ?",
    answer:
      "Non. Vous parlez à Émile, il fait le reste. Si vous savez envoyer un message vocal sur WhatsApp, vous savez utiliser Quovi.",
  },
  {
    question: "Mon client doit-il créer un compte pour signer ?",
    answer:
      "Non. Il reçoit un lien, il clique, il signe. Pas de compte, pas de mot de passe. Tout depuis son téléphone.",
  },
  {
    question: "Puis-je résilier à tout moment ?",
    answer:
      "Oui, aucun engagement. Vous résiliez en un clic depuis votre tableau de bord. Et le plan Free reste disponible gratuitement, sans limite de durée.",
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
        <IconChevronDown
          size={20}
          className={cn(
            "text-[var(--primary)] flex-shrink-0 transition-transform duration-300",
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
      className="relative isolate overflow-hidden py-16 md:py-24 bg-[#F6F4EE]"
    >
      {/* Decorative blob — hidden on mobile */}
      <div
        aria-hidden
        className="hidden md:block absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-[var(--primary-bg)] opacity-20 blur-3xl pointer-events-none -z-10"
      />

      <div className="relative max-w-3xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="font-mono text-[0.78rem] uppercase tracking-[0.05em] text-[var(--text-muted)] mb-4">
            6.0 · Questions
          </p>
          <h2 className="font-display text-[32px] md:text-[40px] font-medium leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)]">
            Vos questions, nos réponses.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            Une question manque ?{" "}
            <a
              href="mailto:hello@quovi.fr"
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
