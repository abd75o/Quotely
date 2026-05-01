import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

const PRODUCT_LINKS = [
  { label: "Fonctionnalités", href: "/#features" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Connexion", href: "/connexion" },
];

const LEGAL_LINKS = [
  { label: "Mentions légales", href: "/legal/mentions" },
  { label: "CGU", href: "/legal/terms" },
  { label: "Politique de confidentialité", href: "/legal/privacy" },
  { label: "Cookies", href: "/legal/cookies" },
  { label: "RGPD", href: "/legal/rgpd" },
];

const METIERS = [
  "Plombier",
  "Électricien",
  "Peintre",
  "Carreleur",
  "Menuisier",
  "Maçon",
  "Freelance",
  "Consultant",
  "Photographe",
  "Architecte",
  "Commerçant",
  "Artisan",
];

export function Footer() {
  return (
    <footer className="bg-[var(--text-primary)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link
              href="/"
              className="inline-flex mb-4 hover:opacity-80 transition-opacity duration-150"
            >
              <Logo variant="horizontal" size={32} inverted />
            </Link>
            <p className="text-sm text-gray-300 leading-relaxed mb-6 max-w-xs">
              Le devis qui part avant que vous passiez à autre chose.
            </p>
            <a
              href="mailto:hello@quotely.fr"
              aria-label="Email"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-gray-200 transition-colors duration-150 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              hello@quotely.fr
            </a>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Produit
            </h4>
            <ul className="space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors duration-150 cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
              Légal
            </h4>
            <ul className="space-y-3">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors duration-150 cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Métiers SEO */}
        <div className="py-6 border-t border-white/10 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">
            Quotely pour tous les métiers
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {METIERS.map((metier) => (
              <span key={metier} className="text-xs text-gray-500">
                Devis {metier}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-white/10">
          <p className="text-xs text-gray-500 text-center sm:text-left">
            © 2026 Quotely. Fait en France. Paiements sécurisés par Stripe.
          </p>
        </div>
      </div>
    </footer>
  );
}
