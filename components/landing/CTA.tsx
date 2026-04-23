"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2, Zap } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Full bleed gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-indigo-700 to-purple-800" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      {/* Shine top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-float">
          <Zap className="w-8 h-8 text-white" fill="white" />
        </div>

        <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-6 leading-[1.1]">
          Votre premier devis professionnel{" "}
          <span className="text-indigo-200">en 30 secondes</span>
        </h2>

        <p className="text-xl text-indigo-200 max-w-2xl mx-auto mb-10 leading-relaxed">
          Rejoignez 2 400+ artisans, freelances et consultants qui ont simplifié
          leur gestion commerciale avec Quotely.
        </p>

        {/* Checklist */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-10">
          {[
            "14 jours gratuits",
            "Sans carte bancaire",
            "Configuration en 5 min",
            "Support réactif",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-sm text-indigo-100 font-medium">{item}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-[var(--primary)] bg-white hover:bg-gray-50 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            Commencer gratuitement
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white border border-white/30 hover:bg-white/10 rounded-xl transition-all duration-200 cursor-pointer"
          >
            Voir les tarifs
          </Link>
        </div>

        {/* Micro trust */}
        <p className="mt-8 text-xs text-indigo-300">
          Données hébergées en France · RGPD compliant · Paiement sécurisé par Stripe
        </p>
      </div>
    </section>
  );
}
