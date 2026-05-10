"use client";

import { useEffect, useRef, useState } from "react";
import { IconCornerDownRight } from "@tabler/icons-react";

const DATA = [
  { label: "< 5 minutes", value: "78 %", width: "100%", opacity: 1 },
  { label: "< 1 heure", value: "36 %", width: "46%", opacity: 0.65 },
  { label: "< 24 heures", value: "14 %", width: "18%", opacity: 0.35 },
  { label: "> 1 semaine", value: "4 %", width: "5%", opacity: 0.18 },
];

export function Manifesto() {
  const [visible, setVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="manifeste"
      className="bg-[#FBFAF7] py-16 sm:py-24 lg:py-32"
    >
      {/* Header */}
      <div className="max-w-[800px] mx-auto px-6 text-center mb-16 md:mb-20">
        <p className="font-mono text-[13px] uppercase tracking-[0.05em] text-[#8A857F] mb-6">
          3.0 · Le manifeste
        </p>
        <h2 className="font-display font-medium text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.1] tracking-[-0.025em] text-[#0F0F14]">
          Chaque devis pas envoyé est un chantier{" "}
          <span className="bg-[#FCE96A] text-[#5B5BD6] px-2 rounded-[3px]">
            perdu
          </span>
          .
        </h2>
      </div>

      {/* 2-column layout */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        {/* LEFT — Data viz */}
        <div
          ref={chartRef}
          className="order-1 bg-white border border-black/[0.08] rounded-2xl p-6 sm:p-7 md:px-7 md:py-8"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#8A857F] mb-6">
            Taux de conversion selon le délai de réponse
          </p>

          <div>
            {DATA.map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-[90px_1fr_50px] sm:grid-cols-[110px_1fr_50px] gap-3.5 items-center h-8 mb-3 last:mb-0"
              >
                <span className="font-mono text-[12px] text-[#4B4B55] text-right">
                  {row.label}
                </span>
                <div className="h-6 rounded">
                  <div
                    className="h-full rounded bg-[#5B5BD6]"
                    style={{
                      width: visible ? row.width : "0%",
                      opacity: row.opacity,
                      transition:
                        "width 900ms cubic-bezier(0.22, 0.61, 0.36, 1)",
                      transitionDelay: `${i * 120}ms`,
                    }}
                  />
                </div>
                <span className="text-[14px] font-medium text-[#0F0F14] text-right tabular-nums">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <p className="italic text-[11px] text-[#8A857F] leading-[1.5] mt-6 pt-4 border-t border-black/[0.08]">
            Sources : Harvard Business Review (2011) · Études B2B France (2026)
          </p>
        </div>

        {/* RIGHT — Manifesto text */}
        <div className="order-2 max-w-[460px]">
          <p className="text-[17px] leading-[1.7] text-[#4B4B55] mb-5">
            Vos clients ne vous attendent pas. Pendant que vous rédigez le
            devis le soir à 22 h, ils en ont déjà reçu deux autres. Et signé
            chez le premier qui a répondu.
          </p>
          <p className="text-[17px] leading-[1.7] text-[#4B4B55]">
            Quovi est né de ce constat simple : un artisan qui répond en 5
            minutes signe 20 fois plus qu’un artisan qui répond une semaine
            après. Pas grâce à des prix plus bas. Juste grâce à la rapidité.
          </p>
        </div>
      </div>

      {/* Punch final */}
      <div className="max-w-[600px] mx-auto px-6 text-center mt-16 md:mt-20">
        <p className="italic font-medium text-[18px] sm:text-[22px] leading-[1.5] text-[#0F0F14] mb-2">
          Vous parlez. Le devis part. Votre client signe.
        </p>
        <p className="font-semibold text-[18px] sm:text-[22px] leading-[1.5] text-[#0F0F14]">
          Avant qu’il ait le temps de douter.
        </p>
      </div>

      {/* Freelance mention */}
      <div className="max-w-[720px] mx-auto px-6 text-center mt-14 md:mt-16 pt-8 border-t border-black/[0.08]">
        <a
          href="#tarifs"
          aria-label="En savoir plus pour les freelances et autres professionnels"
          className="inline-flex items-center gap-1.5 text-[14px] text-[#8A857F] hover:text-[#5B5BD6] transition-colors duration-200"
        >
          <IconCornerDownRight size={16} className="text-[#5B5BD6]" aria-hidden />
          Freelance, consultant, commerçant ? Quovi marche aussi pour vous →
        </a>
      </div>
    </section>
  );
}
