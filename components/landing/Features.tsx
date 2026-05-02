import {
  FileText,
  Calculator,
  Send,
  PenLine,
  Clock,
  Receipt,
  Mic,
  Pencil,
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
  isPro?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: FileText,
    title: "Modèles par métier",
    description:
      "Plombier, électricien, peintre, freelance, commerce. Configurés d’avance.",
  },
  {
    icon: Calculator,
    title: "TVA calculée pour vous",
    description:
      "Vous saisissez les lignes. Le calcul est exact, à chaque fois.",
  },
  {
    icon: Send,
    title: "Envoi en un clic",
    description:
      "Un lien propre, lisible, sécurisé. Direct dans la boîte de votre client.",
  },
  {
    icon: PenLine,
    title: "Signature électronique légale",
    description: "Conforme eIDAS. Le client signe depuis son téléphone.",
  },
  {
    icon: Clock,
    title: "Suivi en temps réel",
    description:
      "Signé, en attente, refusé. Vous savez toujours où vous en êtes.",
  },
  {
    icon: Receipt,
    title: "Facture après signature",
    description:
      "Le devis accepté devient une facture conforme. Numérotation automatique.",
  },
  {
    icon: Mic,
    title: "Dictée vocale",
    description:
      "Parlez sur le terrain. Le devis se rédige pendant que vous travaillez.",
    isPro: true,
  },
  {
    icon: Pencil,
    title: "Rédaction guidée",
    description:
      "Les bonnes formulations professionnelles, suggérées au bon moment.",
    isPro: true,
  },
  {
    icon: TrendingUp,
    title: "Tarifs du marché",
    description:
      "Des suggestions cohérentes selon votre métier et votre région.",
    isPro: true,
  },
  {
    icon: RefreshCw,
    title: "Relances qui tournent toutes seules",
    description: "À J+3, J+7, J+14. Vous ne courez plus après personne.",
    isPro: true,
  },
  {
    icon: BarChart3,
    title: "Vos chiffres clairs",
    description:
      "Taux de signature, délai moyen, chiffre d’affaires. Tout sous les yeux.",
    isPro: true,
  },
  {
    icon: Target,
    title: "Score de chaque devis",
    description: "Comprenez ce qui marche. Ajustez ce qui pèche.",
    isPro: true,
  },
];

function FeatureCard({ icon: Icon, title, description, isPro }: Feature) {
  return (
    <div
      className={cn(
        "group relative flex flex-col bg-white rounded-2xl p-6 min-h-[44px]",
        "border-[1.5px] border-[var(--border)]",
        "transition-all duration-200 ease-out",
        "hover:border-[var(--primary)] hover:-translate-y-0.5",
        "hover:shadow-lg hover:shadow-[var(--primary)]/15"
      )}
    >
      {isPro ? (
        <span className="absolute top-4 right-4 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase rounded-full bg-gradient-to-r from-[var(--primary)] to-[#A78BFA] shadow-sm">
          Pro
        </span>
      ) : (
        <span className="absolute top-3 right-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Inclus
        </span>
      )}

      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-4",
          isPro
            ? "bg-gradient-to-br from-[var(--primary)] to-[#A78BFA] shadow-sm"
            : "bg-gradient-to-br from-[var(--primary-bg)] to-[#DDE3FF] border-[1.5px] border-[#DDE3FF]"
        )}
      >
        <Icon
          aria-label={title}
          className={cn(
            "w-5 h-5",
            isPro ? "text-white" : "text-[var(--primary)]"
          )}
        />
      </div>

      <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug mb-2 pr-12">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function Features() {
  return (
    <Section
      variant="default"
      id="features"
      className="py-20 md:py-32 bg-gradient-to-b from-white via-[#FAFBFF] to-white"
    >
      <Reveal className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
        <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
          Tout ce qu’il vous faut. Rien de plus.
        </h2>
        <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
          Chaque outil pensé pour votre quotidien sur le terrain.
        </p>
        <p className="mt-3 text-sm text-[var(--text-tertiary,var(--text-secondary))]">
          12 outils inclus. Les fonctionnalités marquées PRO sont disponibles
          avec le plan à 49 €/mois.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
        {FEATURES.map((feature, i) => (
          <Reveal key={feature.title} delay={Math.min(i * 0.04, 0.3)}>
            <FeatureCard {...feature} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
