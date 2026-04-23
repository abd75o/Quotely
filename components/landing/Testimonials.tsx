"use client";

import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

const TESTIMONIALS = [
  {
    name: "Thomas Renaud",
    role: "Électricien indépendant",
    location: "Lyon",
    avatar: "TR",
    avatarColor: "from-blue-500 to-indigo-600",
    rating: 5,
    text: "Avant Quotely je passais 45 minutes par devis. Maintenant je dicte ma prestation depuis le chantier et en 30 secondes c'est parti. Mon client signe sur son téléphone. Révolutionnaire.",
    metric: "45 min → 30 sec",
    metricLabel: "par devis",
  },
  {
    name: "Amira Benali",
    role: "Consultante en marketing",
    location: "Paris",
    avatar: "AB",
    avatarColor: "from-purple-500 to-pink-600",
    rating: 5,
    text: "Le score de performance m'a aidée à comprendre pourquoi certains devis n'étaient pas signés. J'ai ajusté mes formulations et mon taux est passé de 45% à 71% en 3 semaines.",
    metric: "+26 pts",
    metricLabel: "taux de signature",
  },
  {
    name: "Pascal Martin",
    role: "Plombier chauffagiste",
    location: "Bordeaux",
    avatar: "PM",
    avatarColor: "from-emerald-500 to-teal-600",
    rating: 5,
    text: "J'étais sceptique au départ. Mais les relances automatiques m'ont récupéré 3 devis en 1 mois que j'aurais perdus. Ça représente 4 800€ de CA. La formule pro se rembourse en une journée.",
    metric: "+4 800€",
    metricLabel: "récupérés/mois",
  },
  {
    name: "Lucie Fontaine",
    role: "Designer freelance",
    location: "Nantes",
    avatar: "LF",
    avatarColor: "from-orange-500 to-rose-600",
    rating: 5,
    text: "La facturation en 1 clic une fois le devis signé, c'est ce que j'attendais depuis des années. Fini les allers-retours entre Word, Excel et mon comptable. Tout est dans Quotely.",
    metric: "2h gagnées",
    metricLabel: "par semaine",
  },
  {
    name: "Kevin Jourdain",
    role: "Peintre décorateur",
    location: "Marseille",
    avatar: "KJ",
    avatarColor: "from-yellow-500 to-orange-600",
    rating: 5,
    text: "Les templates plombier et peintre sont vraiment pensés pour le terrain. Je n'ai rien eu à configurer. En 10 minutes j'avais envoyé mon premier devis depuis l'appli. Impeccable.",
    metric: "10 min",
    metricLabel: "pour démarrer",
  },
  {
    name: "Isabelle Morel",
    role: "Gérante boutique bio",
    location: "Toulouse",
    avatar: "IM",
    avatarColor: "from-teal-500 to-cyan-600",
    rating: 5,
    text: "Pour mon commerce je fais des devis pour des aménagements, du matériel. Quotely m'a permis de professionnaliser ma communication et mes clients me font davantage confiance. Vraiment top.",
    metric: "×2",
    metricLabel: "taux de confiance",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-[var(--surface)] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      {/* Background decorations */}
      <div className="absolute top-10 right-10 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-purple-100/30 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold rounded-full mb-4 shadow-sm">
            <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
            4.9/5 · Plus de 2 400 avis
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-4">
            Ils ont transformé leur{" "}
            <span className="gradient-text">façon de devis</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            Des artisans, freelances et commerçants qui ont repris le contrôle
            de leur activité grâce à Quotely.
          </p>
        </div>

        {/* Masonry-style grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {TESTIMONIALS.map((t, index) => (
            <div
              key={t.name}
              className={cn(
                "break-inside-avoid p-6 bg-white rounded-2xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-lg transition-all duration-300 cursor-default",
                index === 1 && "lg:mt-8",
                index === 3 && "lg:mt-4"
              )}
            >
              {/* Quote icon */}
              <Quote className="w-6 h-6 text-[var(--primary)]/20 mb-3" fill="currentColor" />

              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
                ))}
              </div>

              {/* Text */}
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                "{t.text}"
              </p>

              {/* Metric pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--primary-bg)] rounded-lg mb-5">
                <span className="text-sm font-extrabold text-[var(--primary)]">{t.metric}</span>
                <span className="text-xs text-[var(--primary)]/70">{t.metricLabel}</span>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                    t.avatarColor
                  )}
                >
                  <span className="text-[10px] font-bold text-white">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{t.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {t.role} · {t.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Overall rating bar */}
        <div className="mt-16 max-w-lg mx-auto p-6 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-4xl font-black text-[var(--text-primary)]">4.9</p>
              <div className="flex gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">2 400+ avis</p>
            </div>
            <div className="flex-1 space-y-2">
              {[
                { stars: 5, percent: 87 },
                { stars: 4, percent: 10 },
                { stars: 3, percent: 2 },
                { stars: 2, percent: 1 },
              ].map(({ stars, percent }) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] w-2">{stars}</span>
                  <Star className="w-2.5 h-2.5 text-amber-400" fill="currentColor" />
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] w-7">{percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
