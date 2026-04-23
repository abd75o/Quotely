import Link from "next/link";
import { Mail, ExternalLink } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

const FOOTER_LINKS = {
  Produit: [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Tarifs", href: "#pricing" },
    { label: "Démo", href: "#" },
    { label: "Changelog", href: "#" },
    { label: "Roadmap", href: "#" },
  ],
  Ressources: [
    { label: "Documentation", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Templates gratuits", href: "#" },
    { label: "Guides métier", href: "#" },
    { label: "Status", href: "#" },
  ],
  Légal: [
    { label: "Mentions légales", href: "#" },
    { label: "CGU", href: "#" },
    { label: "Politique de confidentialité", href: "#" },
    { label: "Cookies", href: "#" },
    { label: "RGPD", href: "#" },
  ],
};

const METIERS = [
  "Plombier", "Électricien", "Peintre", "Carreleur",
  "Menuisier", "Maçon", "Freelance", "Consultant",
  "Photographe", "Architecte", "Commerçant", "Artisan",
];

export function Footer() {
  return (
    <footer className="bg-[var(--text-primary)] text-white relative overflow-hidden">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Background decoration */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Main footer grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex mb-4 hover:opacity-80 transition-opacity duration-150">
              <Logo size={32} textColor="#ffffff" id="footer" />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-xs">
              Créez des devis professionnels en 30 secondes. L'outil préféré
              des artisans et freelances français.
            </p>
            <div className="flex gap-3">
              {[
                { icon: ExternalLink, label: "Twitter", href: "#" },
                { icon: ExternalLink, label: "LinkedIn", href: "#" },
                { icon: Mail, label: "Email", href: "mailto:hello@quotely.fr" },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-150 cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-gray-300" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors duration-150 cursor-pointer"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Métiers SEO */}
        <div className="py-6 border-t border-white/10 mb-6">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-3">
            Quotely pour tous les métiers
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {METIERS.map((métier) => (
              <span key={métier} className="text-xs text-gray-500 hover:text-gray-400 cursor-pointer transition-colors duration-150">
                Devis {métier}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/10">
          <p className="text-xs text-gray-500">
            © 2024 Quotely. Tous droits réservés. Fait avec ❤️ en France.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-600">Hébergé sur Vercel</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-600">IA propulsée par Claude</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-600">Paiements Stripe</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
