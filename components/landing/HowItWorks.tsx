import { Mic, FileText, Send, CheckCircle2 } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Highlight } from "@/components/ui/Highlight";
import { Reveal, RevealStagger, RevealItem } from "@/components/ui/Reveal";

type Step = {
  number: string;
  title: React.ReactNode;
  phrase: string;
  visual: React.ReactNode;
};

const STEPS: Step[] = [
  {
    number: "01",
    title: "Décrivez votre intervention",
    phrase: "Vous parlez ou vous tapez. Quelques mots suffisent.",
    visual: (
      <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary-bg)] flex items-center justify-center">
            <Mic className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            En écoute
          </p>
        </div>
        <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
          « Pose carrelage 40 m² cuisine, joints compris, dépose de l’ancienne dalle. »
        </p>
      </div>
    ),
  },
  {
    number: "02",
    title: (
      <>
        Votre devis <Highlight variant="warm">se construit tout seul</Highlight>
      </>
    ),
    phrase: "Prestations détaillées, TVA calculée, total prêt.",
    visual: (
      <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)] space-y-2">
        {[
          { label: "Dépose de la dalle", price: "320 €" },
          { label: "Carrelage 40 m²", price: "1 200 €" },
          { label: "Pose et joints", price: "880 €" },
        ].map((row) => (
          <div
            key={row.label}
            className="flex justify-between items-center py-1 border-b border-[var(--border-light)] last:border-0"
          >
            <span className="text-xs text-[var(--text-secondary)]">{row.label}</span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {row.price}
            </span>
          </div>
        ))}
        <div className="pt-2 flex justify-between items-center">
          <span className="text-xs font-semibold text-[var(--text-primary)]">Total TTC</span>
          <span className="text-sm font-bold text-[var(--primary)]">2 880 €</span>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    title: "Envoyez d’un geste",
    phrase: "Le client reçoit un lien. Il ouvre depuis n’importe où.",
    visual: (
      <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)]">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
              À : m.dupont@email.fr
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">Devis #042 · 2 880 €</p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)] bg-white rounded-lg p-2 leading-relaxed border border-[var(--border-light)]">
          Bonjour, vous trouverez le devis ci-joint. Bonne réception.
        </p>
      </div>
    ),
  },
  {
    number: "04",
    title: "Signature reçue, facture créée",
    phrase: "Le client signe. Vous êtes notifié. La facture suit.",
    visual: (
      <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-light)]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--emerald-bg)] flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-[var(--emerald-dark)]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)]">Devis signé</p>
            <p className="text-[10px] text-[var(--text-muted)]">14:32 · M. Dupont</p>
          </div>
        </div>
        <div className="px-3 py-2 bg-white rounded-lg border border-[var(--border-light)]">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <p className="text-[11px] font-medium text-[var(--text-primary)]">
              Facture #042 émise
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <Section
      variant="alt"
      id="comment-ca-marche"
      className="bg-gradient-to-br from-[#FAFBFF] via-white to-[#FEF9F0]"
      decoration={
        <>
          <div
            aria-hidden
            className="hidden md:block absolute top-0 right-0 w-[400px] h-[400px] -translate-y-1/4 translate-x-1/4 rounded-full bg-[var(--primary)] opacity-25 blur-3xl pointer-events-none -z-10"
          />
          <div
            aria-hidden
            className="hidden md:block absolute bottom-0 left-0 w-[350px] h-[350px] translate-y-1/4 -translate-x-1/4 rounded-3xl bg-[var(--accent-warm)] opacity-20 blur-3xl pointer-events-none -z-10"
          />
        </>
      }
    >
      <Reveal className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
          En 4 étapes, votre devis est signé.
        </h2>
        <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
          Pas de formation. Pas de logiciel compliqué. Juste votre voix.
        </p>
      </Reveal>

      <RevealStagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 xl:gap-12">
        {STEPS.map((step) => (
          <RevealItem key={step.number}>
            <article className="relative h-full p-8 bg-white rounded-2xl border border-[var(--border)] shadow-sm transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 hover:border-[var(--primary)]/40 overflow-hidden">
              <span
                aria-hidden
                className="absolute -top-4 -right-2 z-0 font-display text-[100px] md:text-[160px] font-bold leading-none bg-gradient-to-br from-[var(--primary)] via-[#8B5CF6] to-[var(--accent-warm)] bg-clip-text text-transparent opacity-40 select-none pointer-events-none"
              >
                {step.number}
              </span>
              <div className="relative z-10 flex flex-col h-full gap-4">
                <h3 className="min-h-[64px] text-xl font-bold text-[var(--text-primary)] leading-snug">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.phrase}
                </p>
                <div className="mt-auto pt-2">{step.visual}</div>
              </div>
            </article>
          </RevealItem>
        ))}
      </RevealStagger>
    </Section>
  );
}
