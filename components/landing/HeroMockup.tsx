"use client";

import { useEffect, useState } from "react";
import { IconCircleCheck, IconEye, IconSend } from "@tabler/icons-react";

interface DevisLine {
  label: string;
  price: string;
}

interface Devis {
  number: string;
  metier: string;
  lines: DevisLine[];
  total: string;
}

const DEVIS_ROTATION: Devis[] = [
  {
    number: "Devis #042",
    metier: "Carreleur",
    lines: [
      { label: "Dépose dalle", price: "320 €" },
      { label: "Carrelage 40 m²", price: "1 200 €" },
      { label: "Pose et joints", price: "880 €" },
    ],
    total: "2 880 €",
  },
  {
    number: "Devis #043",
    metier: "Plombier",
    lines: [
      { label: "Chauffe-eau 200 L", price: "640 €" },
      { label: "Évacuation PVC", price: "180 €" },
      { label: "Pose + raccords", price: "420 €" },
    ],
    total: "1 488 €",
  },
  {
    number: "Devis #044",
    metier: "Électricien",
    lines: [
      { label: "Tableau 3 rangées", price: "560 €" },
      { label: "12 prises + cmde", price: "480 €" },
      { label: "Mise aux normes", price: "720 €" },
    ],
    total: "1 920 €",
  },
];

type Status = "sent" | "viewed" | "signed";

const STATUS_CYCLE: Array<{
  key: Status;
  label: string;
  icon: typeof IconSend;
  bg: string;
  fg: string;
}> = [
  {
    key: "sent",
    label: "Envoyé",
    icon: IconSend,
    bg: "#E1F5EE",
    fg: "#085041",
  },
  {
    key: "viewed",
    label: "Vu il y a 1 min",
    icon: IconEye,
    bg: "#EEF2FF",
    fg: "#3730A3",
  },
  {
    key: "signed",
    label: "Signé il y a 2 min",
    icon: IconCircleCheck,
    bg: "#DCFCE7",
    fg: "#166534",
  },
];

// Total cycle = 3 statuses × 1.6s + a final pause before swapping the devis.
const STATUS_INTERVAL_MS = 1600;
// After "signed" we hold the screen for an extra beat so the eye registers
// "yes, this one got signed" before the next devis slides in.
const SIGNED_HOLD_MS = 1100;

export function HeroMockup() {
  const [devisIndex, setDevisIndex] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  // `false` during the brief fade between devis swaps so the new devis fades
  // back in instead of popping.
  const [visible, setVisible] = useState(true);

  // Advance the status badge sent → viewed → signed; once signed, hold a
  // beat then swap to the next devis and reset to "sent". We use one
  // setTimeout chain (not setInterval) so we can mix the longer "signed"
  // hold with the regular cadence without drift.
  useEffect(() => {
    const isSigned = statusIndex === STATUS_CYCLE.length - 1;
    const delay = isSigned ? SIGNED_HOLD_MS : STATUS_INTERVAL_MS;

    const id = window.setTimeout(() => {
      if (!isSigned) {
        setStatusIndex((i) => i + 1);
        return;
      }
      // Fade out → swap → reset status → fade in.
      setVisible(false);
      window.setTimeout(() => {
        setDevisIndex((i) => (i + 1) % DEVIS_ROTATION.length);
        setStatusIndex(0);
        setVisible(true);
      }, 220);
    }, delay);

    return () => window.clearTimeout(id);
  }, [statusIndex, devisIndex]);

  const devis = DEVIS_ROTATION[devisIndex];
  const status = STATUS_CYCLE[statusIndex];
  const StatusIcon = status.icon;

  return (
    <div
      role="img"
      aria-label={`Aperçu d'un devis Quovi ${status.label.toLowerCase()} pour un ${devis.metier.toLowerCase()}, total ${devis.total}`}
      className="w-full max-w-[480px] aspect-[1.1/1] bg-white border border-[var(--border)] rounded-[20px] p-7 sm:p-8 flex flex-col transition-opacity duration-200"
      style={{
        opacity: visible ? 1 : 0,
        boxShadow:
          "0 20px 60px rgba(15,15,35,0.08), 0 8px 24px rgba(15,15,35,0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {devis.number}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            {devis.metier}
          </p>
        </div>
        <span
          // Tiny scale-in each time the badge swaps so the eye notices the
          // status progressing rather than treating it as a static label.
          key={`${devisIndex}-${statusIndex}`}
          className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-medium animate-[hero-badge-in_240ms_cubic-bezier(0.4,0,0.2,1)_both] flex-shrink-0"
          style={{ background: status.bg, color: status.fg }}
        >
          <StatusIcon size={12} />
          {status.label}
        </span>
      </div>

      {/* Lines */}
      <div className="flex flex-col">
        {devis.lines.map((row) => (
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
          <span className="text-[#5B5BD6] tabular-nums">{devis.total}</span>
        </div>
      </div>

      {/* Pagination dots — one per devis, the current one highlighted. */}
      <div
        className="mt-5 flex justify-center gap-1.5"
        aria-hidden="true"
      >
        {DEVIS_ROTATION.map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === devisIndex ? 16 : 6,
              background:
                i === devisIndex ? "#5B5BD6" : "var(--border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
