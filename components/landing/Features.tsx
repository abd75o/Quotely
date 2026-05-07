"use client";

import {
  FileText,
  Calculator,
  Send,
  PenLine,
  Clock,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Bloc 1 — Les fondamentaux (Starter)                                */
/* ------------------------------------------------------------------ */

type Fundamental = {
  icon: React.ElementType;
  title: string;
  description: string;
};

const FUNDAMENTALS: Fundamental[] = [
  {
    icon: FileText,
    title: "Modèles par métier",
    description: "Plombier, électricien, peintre, freelance, commerce.",
  },
  {
    icon: Calculator,
    title: "TVA calculée",
    description: "Le calcul est exact, à chaque fois.",
  },
  {
    icon: Send,
    title: "Envoi en un clic",
    description: "Lien propre, sécurisé, direct dans la boîte client.",
  },
  {
    icon: PenLine,
    title: "Signature électronique",
    description: "Conforme eIDAS. Le client signe sur son téléphone.",
  },
  {
    icon: Clock,
    title: "Suivi temps réel",
    description:
      "Signé, en attente, refusé. Vous savez toujours où vous en êtes.",
  },
  {
    icon: Receipt,
    title: "Facture après signature",
    description: "Le devis accepté devient facture. Numérotation auto.",
  },
];

function FundamentalCard({ icon: Icon, title, description }: Fundamental) {
  return (
    <article
      role="article"
      className={cn(
        "group relative flex flex-col bg-white rounded-2xl p-6 h-full",
        "border border-[var(--border)]",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-md"
      )}
    >
      <span className="absolute top-4 right-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Inclus
      </span>

      <div className="w-10 h-10 rounded-lg bg-[var(--primary-bg)] flex items-center justify-center mb-4">
        <Icon aria-hidden="true" className="w-5 h-5 text-[var(--primary)]" />
      </div>

      <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug mb-2 pr-14">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {description}
      </p>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Bloc 2 — Visuels des agents                                        */
/* ------------------------------------------------------------------ */

function EmailTypingVisual() {
  const text = "m.dupont@email.fr";
  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3.5 mt-6">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
        Nouveau message
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-[var(--text-muted)]">À :</span>
        <div className="text-sm font-mono text-[var(--text-primary)] flex items-center">
          <span className="inline-flex">
            {text.split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: 0.4 + i * 0.05, duration: 0.05 }}
              >
                {char}
              </motion.span>
            ))}
          </span>
          <motion.span
            aria-hidden="true"
            className="inline-block w-[2px] h-[14px] bg-[var(--primary)] ml-0.5"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}

function WaveformVisual() {
  const bars = [4, 9, 14, 18, 22, 16, 10, 19, 23, 17, 9, 14, 6, 11];
  const lines = [
    { label: "Pose carrelage", price: "1 200 €" },
    { label: "Joints et finitions", price: "180 €" },
  ];
  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3.5 mt-6">
      <div className="flex items-end justify-center gap-[3px] h-7 mb-3">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-[var(--primary)]"
            initial={{ height: 4 }}
            whileInView={{ height: h }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: 0.2 + i * 0.04, duration: 0.4, ease: "easeOut" }}
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {lines.map((line, i) => (
          <motion.div
            key={line.label}
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: 0.95 + i * 0.18, duration: 0.4 }}
            className="flex items-center justify-between text-[11px] px-2 py-1 rounded-md bg-white"
          >
            <span className="text-[var(--text-secondary)]">{line.label}</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {line.price}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NotificationsVisual() {
  const notifs = [
    { day: "J+3", text: "Petit rappel amical", tone: "soft" as const },
    { day: "J+7", text: "On reprend contact", tone: "soft" as const },
    { day: "J+14", text: "Dernier signal", tone: "warm" as const },
  ];
  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] p-3.5 mt-6 space-y-1.5">
      {notifs.map((n, i) => (
        <motion.div
          key={n.day}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: 0.3 + i * 0.25, duration: 0.4, ease: "easeOut" }}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white border border-[var(--border-light)]"
        >
          <span
            className={cn(
              "text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded text-white",
              n.tone === "warm"
                ? "bg-[var(--accent-warm)]"
                : "bg-[var(--primary)]"
            )}
          >
            {n.day}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            {n.text}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bloc 2 — Cartes d'agents                                           */
/* ------------------------------------------------------------------ */

type Agent = {
  emoji: string;
  emojiLabel: string;
  name: string;
  mission: string;
  description: string;
  visual: React.ReactNode;
};

const AGENTS: Agent[] = [
  {
    emoji: "🤖",
    emojiLabel: "Robot, l’Assistant",
    name: "L’Assistant",
    mission: "Gère vos clients",
    description:
      "Capture les infos client à votre place. Envoie devis et factures par mail. Vous parlez, il s’occupe du reste.",
    visual: <EmailTypingVisual />,
  },
  {
    emoji: "✍️",
    emojiLabel: "Main qui écrit, le Rédacteur",
    name: "Le Rédacteur",
    mission: "Construit vos devis",
    description:
      "Transforme votre voix en devis structuré. Suggère les bons tarifs marché selon votre métier et votre région.",
    visual: <WaveformVisual />,
  },
  {
    emoji: "📨",
    emojiLabel: "Enveloppe avec flèche, la Sentinelle",
    name: "La Sentinelle",
    mission: "Récupère vos signatures",
    description:
      "Relance vos clients à J+3, J+7 et J+14. Au bon moment, avec le bon ton. Vous ne courez plus après personne.",
    visual: <NotificationsVisual />,
  },
];

function AgentCard({
  emoji,
  emojiLabel,
  name,
  mission,
  description,
  visual,
}: Agent) {
  return (
    <article
      role="article"
      className={cn(
        "group relative flex flex-col bg-white rounded-[20px] p-8 h-full",
        "border border-[var(--border-light)]",
        "transition-all duration-300 ease-out",
        "shadow-[0_12px_32px_rgba(15,15,35,0.08),0_4px_12px_rgba(15,15,35,0.04)]",
        "hover:-translate-y-1",
        "hover:shadow-[0_20px_44px_rgba(15,15,35,0.12),0_8px_18px_rgba(15,15,35,0.06)]"
      )}
    >
      <span
        role="img"
        aria-label={emojiLabel}
        className="text-[40px] leading-none mb-5"
      >
        {emoji}
      </span>

      <h3 className="font-display text-[26px] font-bold text-[var(--text-primary)] leading-tight">
        {name}
      </h3>
      <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">
        {mission}
      </p>

      <p className="mt-4 text-[15px] text-[var(--text-secondary)] leading-relaxed">
        {description}
      </p>

      {visual}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Section principale                                                 */
/* ------------------------------------------------------------------ */

export function Features() {
  return (
    <>
      {/* BLOC 1 — Les fondamentaux */}
      <Section
        variant="default"
        id="features"
        className="py-20 md:py-28"
      >
        <Reveal className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <h2 className="font-display text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
            Les fondamentaux. Solides.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed">
            Tout ce qu’il faut pour gérer vos devis comme un pro.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
          {FUNDAMENTALS.map((feature, i) => (
            <Reveal key={feature.title} delay={Math.min(i * 0.04, 0.24)}>
              <FundamentalCard {...feature} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* BLOC 2 — Votre équipe d’agents IA */}
      <Section
        variant="alt"
        id="agents"
        className="py-24 sm:py-32"
      >
        <Reveal className="text-center max-w-2xl mx-auto mb-14 md:mb-20">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--primary)] mb-4">
            Inclus dans le plan Pro
          </p>
          <h2 className="font-display text-[36px] md:text-[48px] font-bold leading-[1.1] tracking-tight text-[var(--text-primary)]">
            Votre équipe d’agents IA.
          </h2>
          <p className="mt-5 text-lg text-[var(--text-secondary)] leading-relaxed">
            Trois agents qui travaillent pour vous, en silence. Activez ceux
            dont vous avez besoin. Désactivez les autres.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {AGENTS.map((agent, i) => (
            <Reveal key={agent.name} delay={Math.min(i * 0.08, 0.24)}>
              <AgentCard {...agent} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14 md:mt-16 text-center">
          <p className="italic text-sm text-[var(--text-muted)]">
            Vos agents ont déjà travaillé 247 heures pour les premiers
            utilisateurs Quovi.
          </p>
          <a
            href="#tarifs"
            className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
          >
            Découvrir le plan Pro
            <ArrowRight aria-hidden="true" className="w-4 h-4" />
          </a>
        </Reveal>
      </Section>
    </>
  );
}
