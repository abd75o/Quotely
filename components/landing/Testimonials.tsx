import Link from "next/link";
import { Quote, ArrowRight } from "lucide-react";

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-[var(--surface)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-[var(--border-light)] shadow-sm mb-8">
          <Quote className="w-7 h-7 text-[var(--primary)]" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Premiers retours, bientôt.
        </h2>
        <p className="mt-4 text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto">
          Quotely vient de sortir. Les premiers professionnels qui le testent
          partageront leur expérience ici, dès qu’elle sera vécue.
        </p>

        <Link
          href="/inscription"
          className="group inline-flex items-center gap-2 mt-8 px-5 py-3 min-h-[44px] text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] underline underline-offset-4 decoration-[var(--primary)]/30 hover:decoration-[var(--primary)] transition-colors duration-200 cursor-pointer"
        >
          Devenir l’un des premiers
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
