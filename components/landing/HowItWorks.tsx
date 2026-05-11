"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconCheck } from "@tabler/icons-react";

interface Step {
  toiTitle: string;
  toiDesc: string;
  agentLabel: string;
  quoviActions: string[];
}

const STEPS: Step[] = [
  {
    toiTitle: "Décrivez votre chantier",
    toiDesc: "30 secondes. Voix, texte, photo — comme vous voulez.",
    agentLabel: "Émile",
    quoviActions: [
      "Émile rédige le devis",
      "Émile calcule la TVA juste",
      "Émile injecte les mentions légales",
    ],
  },
  {
    toiTitle: "Validez en 1 clic",
    toiDesc: "Vous jetez un œil, vous envoyez.",
    agentLabel: "Émile",
    quoviActions: [
      "Émile prépare le mail au client",
      "Émile envoie le devis au client",
      "Émile génère le PDF prêt à signer",
    ],
  },
  {
    toiTitle: "Retournez sur le chantier",
    toiDesc: "C’est tout ce qu’on vous demande.",
    agentLabel: "Iris",
    quoviActions: [
      "Iris surveille les réponses",
      "Iris relance à J+3, J+7, J+14",
      "Iris s’arrête si le client répond",
      "Iris crée la facture après signature",
      "Iris numérote et archive",
    ],
  },
];

export function HowItWorks() {
  const [progress, setProgress] = useState(0); // 0..1
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onScroll() {
      const node = timelineRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const viewportH = window.innerHeight || 0;
      // Start when the top of the timeline reaches 80% of the viewport,
      // finish when its bottom crosses 20% of the viewport.
      const start = viewportH * 0.8;
      const end = viewportH * 0.2;
      const total = rect.height + (start - end);
      const traveled = start - rect.top;
      const p = Math.max(0, Math.min(1, traveled / total));
      setProgress(p);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Dot activation thresholds
  const ACTIVATE_AT = [0, 0.33, 0.66];

  return (
    <section
      id="comment-ca-marche"
      ref={sectionRef}
      className="bg-[#FBFAF7] py-20 md:py-24 lg:py-[100px]"
    >
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[#8A857F] mb-5">
            2.0 · Comment ça marche
          </p>
          <h2 className="font-display font-medium text-[clamp(2rem,4vw,3rem)] leading-[1.15] tracking-[-0.02em] text-[#0F0F14] mb-4">
            Vous bossez. Quovi gère vos devis.
          </h2>
          <p className="text-[18px] text-[#4B4B55] max-w-[560px] mx-auto leading-[1.55]">
            3 actions pour vous, tout le reste pour nous.
          </p>
        </div>

        {/* Timeline */}
        <div
          ref={timelineRef}
          className="relative max-w-[920px] mx-auto"
        >
          {/* Vertical line — desktop centered, mobile left */}
          <div
            aria-hidden
            className="absolute top-0 bottom-0 w-[2px] bg-[var(--border)] left-3 md:left-1/2 md:-translate-x-1/2"
          />
          <div
            aria-hidden
            className="absolute top-0 w-[2px] bg-[#5B5BD6] left-3 md:left-1/2 md:-translate-x-1/2"
            style={{
              height: `${progress * 100}%`,
              transition: "height 120ms linear",
            }}
          />

          {STEPS.map((step, i) => {
            const isLit = progress >= ACTIVATE_AT[i];
            return (
              <div
                key={step.toiTitle}
                className="relative grid grid-cols-1 md:grid-cols-[1fr_60px_1fr] gap-6 md:gap-8 items-start mb-14 last:mb-0 pl-9 md:pl-0"
              >
                {/* Dot — positioned over the line */}
                <span
                  aria-hidden
                  className="absolute top-[6px] left-3 md:left-1/2 md:-translate-x-1/2 w-[14px] h-[14px] rounded-full z-10 transition-all duration-[400ms]"
                  style={{
                    background: isLit ? "#5B5BD6" : "#FBFAF7",
                    border: `2px solid ${isLit ? "#5B5BD6" : "#8A857F"}`,
                    boxShadow: isLit
                      ? "0 0 0 4px rgba(91, 91, 214, 0.15)"
                      : "none",
                  }}
                />

                {/* TOI */}
                <div className="md:text-right md:pr-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-[#8A857F] mb-2">
                    Vous
                  </p>
                  <h3 className="font-semibold text-[17px] text-[#0F0F14] mb-1.5 leading-snug">
                    {step.toiTitle}
                  </h3>
                  <p className="text-[14px] text-[#4B4B55] leading-[1.5]">
                    {step.toiDesc}
                  </p>
                </div>

                {/* Spacer for the line column on desktop */}
                <div className="hidden md:block" />

                {/* AGENT */}
                <div className="md:text-left md:pl-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-[#5B5BD6] mb-2">
                    {step.agentLabel}
                  </p>
                  <ul className="space-y-2">
                    {step.quoviActions.map((action) => (
                      <li
                        key={action}
                        className="flex items-start gap-2 text-[14px] text-[#0F0F14] leading-[1.5]"
                      >
                        <IconCheck
                          size={16}
                          className="text-[#5B5BD6] flex-shrink-0 mt-0.5"
                        />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-20 text-center">
          <p className="font-display italic font-medium text-[clamp(1.2rem,2vw,1.5rem)] text-[#0F0F14] max-w-[600px] mx-auto mb-8 leading-[1.4]">
            3 actions de votre côté. 12 actions du côté Quovi.
          </p>
          <Link
            href="/inscription"
            className="inline-flex items-center gap-2 py-3.5 px-7 rounded-full bg-[#5B5BD6] text-white text-[15px] font-semibold hover:bg-[#4747C2] transition-colors shadow-md"
          >
            Démarrer gratuitement
            <IconArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
