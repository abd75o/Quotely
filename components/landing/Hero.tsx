"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Zap,
  Star,
  TrendingUp,
  FileText,
  Send,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPING_TEXTS = [
  "Pose un carrelage 40m² cuisine",
  "Réfection électrique appartement",
  "Site web vitrine 5 pages",
  "Peinture salon et chambre",
  "Plomberie salle de bain complète",
];

const SOCIAL_PROOF = [
  { name: "Marc D.", role: "Électricien", avatar: "MD" },
  { name: "Sophie L.", role: "Freelance", avatar: "SL" },
  { name: "Karim B.", role: "Peintre", avatar: "KB" },
  { name: "Julie M.", role: "Consultante", avatar: "JM" },
];

const MINI_STATS = [
  { label: "Devis créés", value: "47 200+", icon: FileText },
  { label: "Temps moyen", value: "28 sec", icon: Zap },
  { label: "Taux signature", value: "73%", icon: TrendingUp },
];

function TypingText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const target = TYPING_TEXTS[currentIndex];

    if (isPaused) {
      const timer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (!isDeleting && displayText === target) {
      setIsPaused(true);
      return;
    }

    if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setCurrentIndex((i) => (i + 1) % TYPING_TEXTS.length);
      return;
    }

    const speed = isDeleting ? 40 : 70;
    const timer = setTimeout(() => {
      setDisplayText(
        isDeleting
          ? target.slice(0, displayText.length - 1)
          : target.slice(0, displayText.length + 1)
      );
    }, speed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, isPaused, currentIndex]);

  return (
    <span className="text-[var(--primary)]">
      {displayText}
      <span className="animate-blink border-r-2 border-[var(--primary)] ml-0.5" />
    </span>
  );
}

function QuotePreviewCard() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Glow behind card */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-3xl blur-3xl scale-110" />

      {/* Main card */}
      <div className="relative glass rounded-2xl shadow-2xl border border-white/60 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--primary)] to-indigo-500 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-white" fill="white" />
              <span className="text-white font-semibold text-sm">Devis #2024-089</span>
            </div>
            <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
              En attente
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium mb-1">Client</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Restaurant Le Provençal</p>
            <p className="text-xs text-[var(--text-secondary)]">contact@leprovencal.fr</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Prestations</p>
            {[
              { desc: "Réfection sol cuisine", qty: 1, price: "1 800 €" },
              { desc: "Carrelage mural (40m²)", qty: 40, price: "2 400 €" },
              { desc: "Main d'œuvre", qty: 1, price: "960 €" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-[var(--border-light)] last:border-0">
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)]">{item.desc}</p>
                  <p className="text-xs text-[var(--text-muted)]">Qté: {item.qty}</p>
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{item.price}</span>
              </div>
            ))}
          </div>

          <div className="bg-[var(--surface)] rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-xs text-[var(--text-secondary)]">
              <span>Sous-total HT</span>
              <span>4 300,00 €</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-secondary)]">
              <span>TVA 20%</span>
              <span>860,00 €</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[var(--text-primary)] pt-1 border-t border-[var(--border)]">
              <span>Total TTC</span>
              <span className="text-[var(--primary)]">5 160,00 €</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary-dark)] transition-colors duration-150 cursor-pointer">
              <Send className="w-3 h-3" />
              Envoyer
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer">
              <PenLine className="w-3 h-3" />
              Signer
            </button>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -top-3 -right-3 bg-[var(--emerald)] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-float">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Signé en 2 min
      </div>

      <div className="absolute -bottom-3 -left-3 glass border border-white/60 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-float [animation-delay:1s]">
        <Zap className="w-3.5 h-3.5 text-[var(--primary)]" />
        Généré par IA
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg" />
      <div className="absolute inset-0 grid-pattern opacity-60" />

      {/* Decorative blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl translate-y-1/4 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-emerald-100/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 border border-[var(--primary)]/20 rounded-full shadow-sm backdrop-blur-sm animate-fade-in-up">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[var(--emerald)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--emerald)]" />
              </span>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Nouveau · Génération IA disponible
              </span>
            </div>

            {/* Heading */}
            <div className="space-y-4 animate-fade-in-up [animation-delay:0.1s] opacity-0 [animation-fill-mode:forwards]">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)]">
                Créez des devis{" "}
                <span className="gradient-text">professionnels</span>{" "}
                en{" "}
                <span className="relative">
                  30 secondes
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 300 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 8C50 3 150 3 298 8"
                      stroke="#6366F1"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity="0.4"
                    />
                  </svg>
                </span>
              </h1>
            </div>

            {/* Typing demo */}
            <div className="animate-fade-in-up [animation-delay:0.2s] opacity-0 [animation-fill-mode:forwards]">
              <div className="flex items-start gap-3 p-4 bg-white/70 backdrop-blur-sm border border-[var(--border)] rounded-xl shadow-sm">
                <div className="mt-0.5 p-1.5 bg-[var(--primary-bg)] rounded-lg">
                  <Zap className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)] mb-1 font-medium">Dites à l'IA ce que vous faites :</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] min-h-[20px]">
                    <TypingText />
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed animate-fade-in-up [animation-delay:0.3s] opacity-0 [animation-fill-mode:forwards] max-w-lg">
              Quotely transforme votre description vocale ou textuelle en devis
              professionnel signable électroniquement. Pour artisans, freelances et consultants.
            </p>

            {/* Checkmarks */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 animate-fade-in-up [animation-delay:0.4s] opacity-0 [animation-fill-mode:forwards]">
              {["Aucune formation requise", "Signature en 1 clic", "Sans engagement"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--emerald)] flex-shrink-0" />
                  <span className="text-sm text-[var(--text-secondary)] font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up [animation-delay:0.5s] opacity-0 [animation-fill-mode:forwards]">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer glow-primary"
              >
                Essai gratuit 14 jours
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-[var(--text-primary)] bg-white hover:bg-gray-50 border border-[var(--border)] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="w-7 h-7 bg-[var(--primary-bg)] rounded-full flex items-center justify-center">
                  <Play className="w-3 h-3 text-[var(--primary)] ml-0.5" fill="currentColor" />
                </div>
                Voir la démo
              </button>
            </div>

            {/* Social proof avatars */}
            <div className="flex items-center gap-3 animate-fade-in-up [animation-delay:0.6s] opacity-0 [animation-fill-mode:forwards]">
              <div className="flex -space-x-2">
                {SOCIAL_PROOF.map((p) => (
                  <div
                    key={p.name}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-indigo-400 border-2 border-white flex items-center justify-center"
                    title={`${p.name} — ${p.role}`}
                  >
                    <span className="text-[9px] font-bold text-white">{p.avatar}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-amber-400" fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">4.9/5</span> · Plus de 2 400 professionnels
                </p>
              </div>
            </div>
          </div>

          {/* Right — Card preview */}
          <div className="relative animate-scale-in [animation-delay:0.3s] opacity-0 [animation-fill-mode:forwards]">
            <QuotePreviewCard />

            {/* Mini stats below card */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {MINI_STATS.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="glass border border-white/60 rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <Icon className="w-4 h-4 text-[var(--primary)] mx-auto mb-1.5" />
                  <p className="text-lg font-bold text-[var(--text-primary)] leading-none">{value}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logos band */}
        <div className="mt-20 text-center animate-fade-in-up [animation-delay:0.8s] opacity-0 [animation-fill-mode:forwards]">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-semibold mb-6">
            Utilisé par des professionnels dans toute la France
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
            {["Plombier", "Électricien", "Peintre", "Freelance", "Consultant", "Commerçant"].map((métier) => (
              <span key={métier} className="text-sm font-semibold text-[var(--text-secondary)] tracking-wide">
                {métier}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
