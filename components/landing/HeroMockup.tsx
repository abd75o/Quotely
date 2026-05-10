import { IconSend } from "@tabler/icons-react";

const LINES = [
  { label: "Dépose dalle", price: "320 €" },
  { label: "Carrelage 40 m²", price: "1 200 €" },
  { label: "Pose et joints", price: "880 €" },
];

export function HeroMockup() {
  return (
    <div
      role="img"
      aria-label="Aperçu d’un devis Quovi envoyé : 3 lignes, total 2 880 €"
      className="w-full max-w-[480px] aspect-[1.1/1] bg-white border border-[var(--border)] rounded-[20px] p-7 sm:p-8 flex flex-col"
      style={{
        boxShadow:
          "0 20px 60px rgba(15,15,35,0.08), 0 8px 24px rgba(15,15,35,0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Devis #042
        </p>
        <span
          className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-medium"
          style={{ background: "#E1F5EE", color: "#085041" }}
        >
          <IconSend size={12} />
          Envoyé
        </span>
      </div>

      {/* Lines */}
      <div className="flex flex-col">
        {LINES.map((row) => (
          <div
            key={row.label}
            className="flex justify-between items-baseline py-1.5 text-[14px]"
          >
            <span className="text-[var(--text-secondary)]">{row.label}</span>
            <span className="font-medium text-[var(--text-primary)] tabular-nums">
              {row.price}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-auto pt-2 border-t border-[var(--border)]">
        <div className="flex justify-between items-baseline pt-2 text-[16px] font-semibold">
          <span className="text-[var(--text-primary)]">Total TTC</span>
          <span className="text-[#5B5BD6] tabular-nums">2 880 €</span>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-[#5B5BD6]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border)]" />
      </div>
    </div>
  );
}
