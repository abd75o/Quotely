import type { Metadata } from "next";
import Link from "next/link";
import {
  IconCheck,
  IconCrystalBall,
  IconSparkles,
} from "@tabler/icons-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import {
  changelog,
  visionLongTerme,
  type ChangelogStatus,
} from "@/data/changelog";

export const metadata: Metadata = {
  title: "Nouveautés Quovi — Journal des modifications",
  description:
    "Suivez les évolutions de Quovi en transparence totale. Nouvelles fonctionnalités, améliorations Émile et Iris, roadmap publique.",
  openGraph: {
    title: "Nouveautés Quovi",
    description: "Toutes les évolutions de Quovi, en transparence totale.",
  },
};

function StatusBadge({ status }: { status: ChangelogStatus }) {
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#FFE4E4] text-[#9B1C1C] text-[0.72rem] font-semibold uppercase tracking-[0.06em]">
        <span className="relative inline-flex">
          <span className="absolute inset-0 rounded-full bg-[#EF4444] opacity-50 animate-ping" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
        </span>
        En cours
      </span>
    );
  }
  if (status === "released") {
    return (
      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#E1F5EE] text-[#085041] text-[0.72rem] font-semibold uppercase tracking-[0.06em]">
        <IconCheck size={12} />
        Disponible
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#EEEDFE] text-[#5B5BD6] text-[0.72rem] font-semibold uppercase tracking-[0.06em]">
      <IconCrystalBall size={12} />
      Bientôt
    </span>
  );
}

export default function NouveautesPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#FBFAF7] pt-[72px]">
        {/* Page header */}
        <section className="max-w-[1200px] mx-auto px-6 pt-16 md:pt-20 mb-16 md:mb-20">
          <div className="max-w-[760px]">
            <span className="block font-mono text-[0.78rem] uppercase tracking-[0.05em] text-[#8A857F] mb-4">
              Journal des modifications
            </span>
            <h1 className="font-display text-[clamp(2.5rem,6.5vw,5.25rem)] leading-[1.02] tracking-[-0.035em] font-medium text-[#0F0F14] mb-6">
              Ce qui change. Quand ça change.
            </h1>
            <p className="text-[1.15rem] leading-[1.55] text-[#4B4B55] max-w-[600px]">
              Toutes les évolutions de Quovi, en transparence totale. Mises à
              jour chaque semaine.
            </p>
          </div>
        </section>

        {/* Groups */}
        <section className="max-w-[1200px] mx-auto px-6 pb-20">
          {changelog.map((group) => (
            <div key={group.period} className="mb-14 md:mb-16">
              <h2 className="font-mono text-[0.85rem] uppercase tracking-[0.08em] text-[#8A857F] mb-8 md:mb-10">
                {group.period}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {group.items.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col bg-white border border-black/[0.08] rounded-2xl p-7 md:p-8"
                  >
                    <div className="mb-4">
                      <StatusBadge status={item.status} />
                    </div>
                    <h3 className="font-display text-[1.5rem] leading-[1.2] tracking-[-0.015em] font-medium text-[#0F0F14] mb-3">
                      {item.title}
                    </h3>
                    <p className="text-[1rem] leading-[1.6] text-[#4B4B55] mb-5">
                      {item.description}
                    </p>
                    {(item.category || item.date) && (
                      <div className="mt-auto pt-4 border-t border-black/[0.08] flex flex-wrap gap-x-2 items-center font-mono text-[0.72rem] uppercase tracking-[0.08em] text-[#8A857F]">
                        {item.category && <span>{item.category}</span>}
                        {item.category && item.date && <span>·</span>}
                        {item.date && <span>{item.date}</span>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Vision long terme */}
        <section className="bg-[#F6F4EE] py-20 md:py-24">
          <div className="max-w-[760px] mx-auto px-6">
            <h2 className="font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.025em] font-medium text-[#0F0F14] mb-4 inline-flex items-center gap-3">
              <IconSparkles size={32} className="text-[#5B5BD6]" />
              Vision long terme
            </h2>
            <p className="text-[1.05rem] leading-[1.6] text-[#4B4B55] mb-10">
              Ces fonctionnalités seront développées en fonction des retours
              des utilisateurs.
            </p>

            <ul className="border-t border-black/[0.08]">
              {visionLongTerme.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 py-3 border-b border-black/[0.08]"
                >
                  <IconSparkles
                    size={18}
                    className="text-[#5B5BD6] flex-shrink-0"
                  />
                  <span className="text-[1.05rem] text-[#0F0F14]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-[#FBFAF7] py-20 md:py-24">
          <div className="max-w-[720px] mx-auto px-6">
            <div className="bg-[#F6F4EE] border border-black/[0.08] rounded-3xl p-10 md:p-14 text-center">
              <h2 className="font-display text-[2rem] md:text-[2.25rem] leading-[1.15] tracking-[-0.02em] font-medium text-[#0F0F14] mb-4">
                Une idée ? Une suggestion ?
              </h2>
              <p className="text-[1.05rem] leading-[1.6] text-[#4B4B55] mb-8 max-w-[520px] mx-auto">
                Quovi se construit avec ses utilisateurs. Si vous avez une
                fonctionnalité à proposer, on est preneurs.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="mailto:hello@quovi.fr?subject=Suggestion%20Quovi"
                  className="inline-flex items-center justify-center py-3 px-6 rounded-full bg-[#5B5BD6] text-white text-[0.95rem] font-medium hover:bg-[#4747C2] transition-colors"
                >
                  Suggérer une fonctionnalité
                </a>
                <Link
                  href="/inscription"
                  className="inline-flex items-center justify-center py-3 px-6 rounded-full bg-transparent border border-black/[0.14] text-[#0F0F14] text-[0.95rem] font-medium hover:bg-black/[0.04] transition-colors"
                >
                  Démarrer gratuitement
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
