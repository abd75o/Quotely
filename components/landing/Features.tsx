import {
  FileText,
  Calculator,
  Send,
  PenLine,
  Clock,
  ReceiptText,
  Mic,
  Edit3,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Target,
} from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
};

const FEATURES_STARTER: Feature[] = [
  {
    icon: FileText,
    title: "Modèles par métier",
    description: "Plombier, électricien, peintre, freelance, commerce. Configurés d’avance.",
  },
  {
    icon: Calculator,
    title: "TVA calculée pour vous",
    description: "Vous saisissez les lignes. Le calcul est exact, à chaque fois.",
  },
  {
    icon: Send,
    title: "Envoi en un clic",
    description: "Un lien propre, lisible, sécurisé. Direct dans la boîte de votre client.",
  },
  {
    icon: PenLine,
    title: "Signature électronique légale",
    description: "Conforme eIDAS. Le client signe depuis son téléphone.",
  },
  {
    icon: Clock,
    title: "Suivi en temps réel",
    description: "Signé, en attente, refusé. Vous savez toujours où vous en êtes.",
  },
  {
    icon: ReceiptText,
    title: "Facture après signature",
    description: "Le devis accepté devient une facture conforme. Numérotation automatique.",
  },
];

const FEATURES_PRO: Feature[] = [
  {
    icon: Mic,
    title: "Dictée vocale",
    description: "Parlez sur le terrain. Le devis se rédige pendant que vous travaillez.",
  },
  {
    icon: Edit3,
    title: "Rédaction guidée",
    description: "Les bonnes formulations professionnelles, suggérées au bon moment.",
  },
  {
    icon: TrendingUp,
    title: "Tarifs du marché",
    description: "Des suggestions cohérentes selon votre métier et votre région.",
  },
  {
    icon: RefreshCw,
    title: "Relances qui tournent toutes seules",
    description: "À J+3, J+7, J+14. Vous ne courez plus après personne.",
  },
  {
    icon: BarChart3,
    title: "Vos chiffres clairs",
    description: "Taux de signature, délai moyen, chiffre d’affaires. Tout sous les yeux.",
  },
  {
    icon: Target,
    title: "Score de chaque devis",
    description: "Comprenez ce qui marche. Ajustez ce qui pèche.",
  },
];

function FeatureRow({
  icon: Icon,
  title,
  description,
  isPro,
}: Feature & { isPro?: boolean }) {
  return (
    <div className="flex gap-4 py-4 border-b border-[var(--border-light)] last:border-0 -mx-2 px-2 rounded-lg transition-colors duration-150 hover:bg-[var(--primary-bg)]/40">
      <div
        className={cn(
          "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center",
          isPro
            ? "bg-gradient-to-br from-[var(--primary)] to-[#8B5CF6] shadow-sm"
            : "bg-[var(--primary-bg)]"
        )}
      >
        <Icon
          className={cn("w-5 h-5", isPro ? "text-white" : "text-[var(--primary)]")}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className="text-base font-semibold text-[var(--text-primary)] leading-snug">
            {title}
          </h4>
          {isPro && (
            <span className="px-3 py-1 text-[10px] font-bold text-white bg-gradient-to-r from-[var(--primary)] to-[#8B5CF6] rounded-full uppercase tracking-wider shadow-sm">
              Pro
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <Section
      variant="default"
      id="features"
      className="pt-8 md:pt-12 bg-gradient-to-b from-white via-[#FAFBFF] to-white"
    >
      <Reveal className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
          Tout ce qu’il vous faut. Rien de plus.
        </h2>
        <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
          Chaque outil pensé pour votre quotidien sur le terrain.
        </p>
      </Reveal>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Starter */}
        <Reveal className="bg-white rounded-2xl border-2 border-[var(--border)] p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <header className="pb-4 border-b border-[var(--border)] mb-2">
            <span className="inline-block px-3 py-1 mb-3 text-[10px] font-bold uppercase tracking-widest rounded-full bg-[var(--primary-bg)] text-[var(--primary-dark)]">
              Plan Starter
            </span>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">25 €/mois</h3>
          </header>
          <div>
            {FEATURES_STARTER.map((f) => (
              <FeatureRow key={f.title} {...f} />
            ))}
          </div>
        </Reveal>

        {/* Pro */}
        <Reveal
          className="bg-white rounded-2xl border-2 border-[var(--primary)] p-8 shadow-2xl shadow-[var(--primary)]/10 transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--primary)]/20 hover:-translate-y-1"
          delay={0.1}
        >
          <header className="pb-4 border-b border-[var(--border)] mb-2">
            <span className="inline-block px-3 py-1 mb-3 text-[10px] font-bold uppercase tracking-widest rounded-full bg-gradient-to-r from-[var(--primary)] to-[#8B5CF6] text-white shadow-sm">
              Plan Pro
            </span>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">49 €/mois</h3>
          </header>
          <div>
            {FEATURES_PRO.map((f) => (
              <FeatureRow key={f.title} {...f} isPro />
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
