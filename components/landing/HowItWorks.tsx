import { Mic, FileText, Send, CheckCircle2 } from "lucide-react";

type Step = {
  number: string;
  title: string;
  phrase: string;
  visual: React.ReactNode;
};

const STEPS: Step[] = [
  {
    number: "01",
    title: "Décrivez votre intervention",
    phrase: "Vous parlez ou vous tapez. Quelques mots suffisent.",
    visual: (
      <div className="p-4 bg-white rounded-xl border border-[var(--border-light)]">
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
    title: "Votre devis se construit tout seul",
    phrase: "Prestations détaillées, TVA calculée, total prêt.",
    visual: (
      <div className="p-4 bg-white rounded-xl border border-[var(--border-light)] space-y-2">
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
            <span className="text-xs font-semibold text-[var(--text-primary)]">{row.price}</span>
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
      <div className="p-4 bg-white rounded-xl border border-[var(--border-light)]">
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
        <p className="text-xs text-[var(--text-secondary)] bg-[var(--surface)] rounded-lg p-2 leading-relaxed">
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
      <div className="p-4 bg-white rounded-xl border border-[var(--border-light)]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-[var(--emerald-dark)]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)]">Devis signé</p>
            <p className="text-[10px] text-[var(--text-muted)]">14:32 · M. Dupont</p>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--surface)] rounded-lg border border-[var(--border-light)]">
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
    <section id="comment-ca-marche" className="py-24 bg-[var(--surface)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            En 4 étapes, votre devis est signé.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            Pas de formation. Pas de logiciel compliqué. Juste votre voix.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <article
              key={step.number}
              className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-[var(--border-light)] shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-bold text-[var(--primary)] tracking-widest">
                  {step.number}
                </span>
                <span className="flex-1 h-px bg-[var(--border-light)]" />
              </div>

              <h3 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
                {step.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {step.phrase}
              </p>

              <div className="mt-auto pt-2">{step.visual}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
