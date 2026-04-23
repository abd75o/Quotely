"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

const navLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tarifs", href: "#pricing" },
  { label: "Témoignages", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[var(--z-sticky)] transition-all duration-300",
        isScrolled
          ? "glass shadow-sm border-b border-[var(--border-light)]"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity duration-150">
            <Logo variant="horizontal" size={32} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 rounded-lg transition-all duration-150 cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 cursor-pointer"
            >
              Connexion
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              Essai gratuit
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
            aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-[var(--border-light)] bg-white/95 backdrop-blur-md">
            <div className="py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-50 rounded-lg mx-2 transition-colors duration-150 cursor-pointer"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 pb-1 px-2 flex flex-col gap-2 border-t border-[var(--border-light)] mt-2">
                <Link
                  href="/login"
                  className="block px-4 py-3 text-sm font-medium text-center text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                >
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="block px-4 py-3 text-sm font-semibold text-center text-white bg-[var(--primary)] rounded-lg hover:bg-[var(--primary-dark)] transition-colors duration-150 cursor-pointer"
                >
                  Essai gratuit — 14 jours
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
