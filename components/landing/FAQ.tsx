"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "Quotely est-il légalement valide pour la signature électronique ?",
    answer:
      "Oui. La signature électronique Quotely est conforme au règlement eIDAS de l'Union Européenne. Chaque signature est horodatée, liée à l'email du signataire et génère un certificat d'audit juridiquement valide en France et en Europe.",
  },
  {
    question: "Est-ce que je dois être comptable pour utiliser Quotely ?",
    answer:
      "Absolument pas. Quotely est conçu pour les professionnels qui ne sont pas comptables. Vous saisissez vos prestations, Quotely calcule automatiquement la TVA, le total HT et TTC, et génère des documents conformes aux normes françaises.",
  },
  {
    question: "Comment fonctionne la génération IA avec Claude ?",
    answer:
      "Sur le plan Pro, vous décrivez votre prestation à voix haute ou par texte. Quotely envoie votre description à Claude (l'IA d'Anthropic) qui structure automatiquement les lignes de devis, suggère des libellés professionnels et propose des prix cohérents avec le marché. Vous relisez et envoyez.",
  },
  {
    question: "Puis-je importer mes clients et modèles existants ?",
    answer:
      "Oui. Vous pouvez importer vos contacts depuis un fichier CSV ou Excel. Pour les modèles, Quotely propose déjà 5 templates par métier prêts à l'emploi. Si vous avez des modèles Word ou PDF existants, notre équipe peut vous aider à les intégrer (plan Pro).",
  },
  {
    question: "Que se passe-t-il si mon client n'a pas de compte Quotely ?",
    answer:
      "Votre client n'a pas besoin de créer un compte. Il reçoit un lien par email, voit le devis sur une page web sécurisée et peut signer en entrant son nom. Vous êtes notifié instantanément et la facture se génère automatiquement.",
  },
  {
    question: "Puis-je personnaliser le devis avec mon logo et mes couleurs ?",
    answer:
      "Oui, vous pouvez uploader votre logo, choisir votre couleur principale et personnaliser le pied de page (SIRET, RIB, conditions générales). Le devis envoyé à votre client aura votre identité visuelle professionnelle.",
  },
  {
    question: "Comment fonctionnent les relances automatiques ?",
    answer:
      "Sur le plan Pro, Quotely envoie automatiquement des rappels aux clients qui n'ont pas encore signé : un premier email à J+3, un second à J+7 et un dernier à J+14. Chaque message est personnalisé avec le nom du client et le montant du devis. Vous pouvez désactiver les relances pour un devis spécifique.",
  },
  {
    question: "Puis-je résilier à tout moment ?",
    answer:
      "Oui, sans engagement et sans frais. Vous résiliez depuis votre compte en 1 clic. Vous conservez l'accès jusqu'à la fin de votre période payée et pouvez exporter toutes vos données (devis, factures, clients) en PDF ou CSV.",
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
    <div className={cn(
      "border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-200",
      isOpen ? "shadow-md border-[var(--primary)]/20" : "hover:border-[var(--primary)]/20 hover:shadow-sm"
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer bg-white hover:bg-gray-50/50 transition-colors duration-150"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform duration-300",
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
    <section id="faq" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold rounded-full mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-[var(--primary)]" />
            Questions fréquentes
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-4">
            Tout ce que vous voulez{" "}
            <span className="gradient-text">savoir</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)]">
            Une question non couverte ?{" "}
            <a
              href="mailto:support@quotely.fr"
              className="text-[var(--primary)] font-medium hover:underline cursor-pointer"
            >
              Écrivez-nous
            </a>
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => (
            <FAQItem
              key={index}
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
