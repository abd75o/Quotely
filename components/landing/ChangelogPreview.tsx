import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { getLatestForLanding } from "@/data/changelog";

export function ChangelogPreview() {
  const items = getLatestForLanding();

  return (
    <section
      id="nouveautes"
      className="bg-[#FBFAF7] py-20 md:py-24 lg:py-[100px]"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <div className="max-w-[640px] mb-12 md:mb-16">
          <span className="block font-mono text-[0.78rem] uppercase tracking-[0.05em] text-[#8A857F] mb-4">
            5.0 · Journal des modifications
          </span>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.05] tracking-[-0.03em] font-medium text-[#0F0F14] mb-4">
            Ce qui change. Quand ça change.
          </h2>
          <p className="text-[1.15rem] leading-[1.55] text-[#4B4B55]">
            Quovi évolue chaque semaine. Voici les dernières nouveautés, en
            transparence totale.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative pt-2 mb-[60px]">
          <div className="absolute left-0 right-0 top-[6px] h-px bg-black/[0.08]" />
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2">
            {items.map((item, i) => {
              const isFirst = i === 0;
              return (
                <div
                  key={item.id}
                  className="flex justify-start"
                >
                  {isFirst ? (
                    <span className="relative inline-flex">
                      <span className="absolute inset-0 rounded-full bg-[#5B5BD6] opacity-40 animate-ping" />
                      <span className="relative w-3 h-3 rounded-full bg-[#5B5BD6]" />
                    </span>
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-[#8A857F]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mb-12">
          {items.map((item) => (
            <article
              key={item.id}
              className="group flex flex-col"
            >
              {item.category && (
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[#8A857F] mb-3">
                  {item.category}
                </span>
              )}
              <h3 className="text-[1rem] font-semibold leading-snug text-[#0F0F14] mb-2.5 transition-opacity duration-200 group-hover:opacity-70">
                {item.title}
              </h3>
              <p className="text-[0.92rem] leading-[1.55] text-[#4B4B55] mb-4 line-clamp-3">
                {item.description}
              </p>
              {item.date && (
                <span className="mt-auto font-mono text-[0.72rem] uppercase tracking-[0.08em] text-[#8A857F]">
                  {item.date}
                </span>
              )}
            </article>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/nouveautes"
          className="inline-flex items-center gap-1.5 text-[0.95rem] font-medium text-[#4B4B55] hover:text-[#0F0F14] underline-offset-4 hover:underline transition-colors"
        >
          Afficher tout
          <IconArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
