"use client";

import { Mic, Wand2, Send, CheckCircle2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    step: "01",
    icon: Mic,
    title: "Décrivez votre prestation",
    description:
      "Parlez ou tapez ce que vous faites : \"Pose d'un carrelage 40m² dans une cuisine\". L'IA comprend le contexte métier.",
    color: "text-[var(--primary)]",
    bg: "bg-[var(--primary-bg)]",
    border: "border-[var(--primary)]/20",
    visual: (
      <div className="p-4 bg-white rounded-xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[var(--emerald)] animate-pulse" />
          <span className="text-xs text-[var(--text-muted)] font-medium">Écoute en cours…</span>
        </div>
        <p className="text-sm text-[var(--text-primary)] font-medium">
          "Pose carrelage 40m² cuisine, joints compris, évacuation ancienne dalle"
        </p>
        <div className="mt-3 flex gap-1">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[var(--primary)] rounded-full"
              style={{
                height: `${Math.random() * 20 + 4}px`,
                opacity: 0.3 + (i / 12) * 0.7,
              }}
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    step: "02",
    icon: Wand2,
    title: "L'IA génère le devis",
    description:
      "En moins de 5 secondes, Quotely structure un devis complet avec les lignes de prestations, la TVA et les prix du marché.",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    visual: (
      <div className="p-4 bg-white rounded-xl border border-[var(--border)] shadow-sm space-y-2">
        {[
          { label: "Dépose ancienne dalle", price: "320 €" },
          { label: "Pose carrelage 40m²", price: "1 200 €" },
          { label: "Réalisation des joints", price: "280 €" },
        ].map((row, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-1.5 border-b border-[var(--border-light)] last:border-0"
          >
            <span className="text-xs text-[var(--text-primary)] font-medium">{row.label}</span>
            <span className="text-xs font-bold text-[var(--primary)]">{row.price}</span>
          </div>
        ))}
        <div className="pt-2 flex justify-between">
          <span className="text-xs font-bold text-[var(--text-primary)]">Total TTC</span>
          <span className="text-sm font-extrabold text-[var(--primary)]">2 160 €</span>
        </div>
      </div>
    ),
  },
  {
    step: "03",
    icon: Send,
    title: "Envoyez à votre client",
    description:
      "Un email professionnel part automatiquement. Le client voit un devis soigné sur son téléphone ou ordinateur.",
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    visual: (
      <div className="p-4 bg-white rounded-xl border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center">
            <Send className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">À : client@email.fr</p>
            <p className="text-[10px] text-[var(--text-muted)]">Devis #2024-089 · 2 160 €</p>
          </div>
        </div>
        <div className="text-xs text-[var(--text-secondary)] bg-[var(--surface)] rounded-lg p-2">
          Bonjour M. Dupont, veuillez trouver ci-joint votre devis…
        </div>
        <div className="mt-2 flex justify-end">
          <span className="text-[10px] text-[var(--emerald)] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Envoyé à 14:32
          </span>
        </div>
      </div>
    ),
  },
  {
    step: "04",
    icon: CheckCircle2,
    title: "Recevez la signature",
    description:
      "Votre client signe électroniquement en 1 clic. Vous êtes notifié immédiatement et la facture se génère automatiquement.",
    color: "text-[var(--emerald)]",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    visual: (
      <div className="p-4 bg-white rounded-xl border border-[var(--border)] shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6 text-[var(--emerald)]" />
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">Devis accepté !</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Signé par J. Dupont · 14:47</p>
          <div className="mt-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs text-emerald-700 font-semibold">
              Facture #2024-089 générée automatiquement
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="py-24 bg-[var(--surface)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold rounded-full mb-4 shadow-sm">
            <Wand2 className="w-3.5 h-3.5 text-[var(--primary)]" />
            En 4 étapes simples
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-4">
            De la prestation à la facture{" "}
            <span className="gradient-text">en moins d'une minute</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Pas de formation, pas de comptable, pas de logiciel complexe.
            Juste votre voix et Quotely fait le reste.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, index) => (
            <div key={step.step} className="relative">
              {/* Connector arrow (desktop) */}
              {index < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-6 z-10 -translate-x-3">
                  <ArrowDown className="w-4 h-4 text-[var(--border)] rotate-[-90deg] mx-auto" />
                </div>
              )}

              <div
                className={cn(
                  "h-full p-6 bg-white rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-default",
                  step.border
                )}
              >
                {/* Step number */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      step.bg
                    )}
                  >
                    <step.icon className={cn("w-5 h-5", step.color)} />
                  </div>
                  <span className="text-2xl font-black text-[var(--border)] select-none">
                    {step.step}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Visual preview */}
                <div className="mt-auto">{step.visual}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
