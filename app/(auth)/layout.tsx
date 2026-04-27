import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-50 to-blue-100 rounded-full blur-3xl opacity-40" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Top logo bar */}
      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Link href="/" className="cursor-pointer">
          <Logo variant="horizontal" size={30} id="auth" />
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          En continuant, vous acceptez nos{" "}
          <Link href="/legal/terms" className="text-[var(--primary)] hover:underline cursor-pointer">
            CGU
          </Link>{" "}
          et notre{" "}
          <Link href="/legal/privacy" className="text-[var(--primary)] hover:underline cursor-pointer">
            Politique de confidentialité
          </Link>
        </p>
      </footer>
    </div>
  );
}
