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
    description:
      "Conforme eIDAS. Le client signe depuis son téléphone.",
  },
  {
    icon: Clock,
    title: "Suivi en temps réel",
    description:
      "Signé, en attente, refusé. Vous savez toujours où vous en êtes.",
  },
  {
    icon: ReceiptText,
    title: "Facture après signature",
    description:
      "Le devis accepté devient une facture conforme. Numérotation automatique.",
  },
];

const FEATURES_PRO: Feature[] = [
  {
    icon: Mic,
    title: "Dictée vocale",
    description:
      "Parlez sur le terrain. Le devis se rédige pendant que vous travaillez.",
  },
  {
    icon: Edit3,
    title: "Rédaction guidée",
    description:
      "Les bonnes formulations professionnelles, suggérées au bon moment.",
  },
  {
    icon: TrendingUp,
    title: "Tarifs du marché",
    description:
      "Des suggestions cohérentes selon votre métier et votre région.",
  },
  {
    icon: RefreshCw,
    title: "Relances qui tournent toutes seules",
    description:
      "À J+3, J+7, J+14. Vous ne courez plus après personne.",
  },
  {
    icon: BarChart3,
    title: "Vos chiffres clairs",
    description:
      "Taux de signature, délai moyen, chiffre d’affaires. Tout sous les yeux.",
  },
  {
    icon: Target,
    title: "Score de chaque devis",
    description:
      "Comprenez ce qui marche. Ajustez ce qui pèche.",
  },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
  showProBadge,
}: Feature & { showProBadge?: boolean }) {
  return (
    <div className="group relative p-6 bg-white rounded-2xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-md transition-all duration-200">
      {showProBadge && (
        <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-bg)] rounded-full uppercase tracking-wider">
          Pro
        </span>
      )}
      <div
        className={cn(
          "w-10 h-10 rounded-xl bg-[var(--primary-bg)] flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105"
        )}
      >
        <Icon className="w-5 h-5 text-[var(--primary)]" />
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2 leading-snug">
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
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Tout ce qu’il vous faut. Rien de plus.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            Chaque outil pensé pour votre quotidien sur le terrain.
          </p>
        </div>

        {/* Starter */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <span className="px-3 py-1 bg-gray-100 text-[var(--text-secondary)] text-xs font-bold rounded-full uppercase tracking-widest">
              Plan Starter
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-sm font-semibold text-[var(--text-secondary)]">25 €/mois</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES_STARTER.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>

        {/* Pro */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="px-3 py-1 bg-[var(--primary-bg)] text-[var(--primary)] text-xs font-bold rounded-full uppercase tracking-widest">
              Plan Pro
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--primary)]/30 to-transparent" />
            <span className="text-sm font-semibold text-[var(--primary)]">49 €/mois</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES_PRO.map((f) => (
              <FeatureCard key={f.title} {...f} showProBadge />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
