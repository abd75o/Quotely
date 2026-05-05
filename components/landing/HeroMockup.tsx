"use client";

import { useEffect, useState } from "react";
import { Mic, Send, CheckCircle2 } from "lucide-react";

const FRAME_COUNT = 4;
const FRAME_INTERVAL = 2500;
const TRANSCRIPT = "Pose carrelage 40 m² cuisine, joints…";
const TYPEWRITER_SPEED = 55;

const ROWS = [
  { label: "Dépose dalle", price: "320 €" },
  { label: "Carrelage 40 m²", price: "1 200 €" },
  { label: "Pose et joints", price: "880 €" },
];

export function HeroMockup() {
  const [frame, setFrame] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setFrame(3);
      return;
    }
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % FRAME_COUNT);
    }, FRAME_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (frame !== 0) return;
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(TRANSCRIPT.slice(0, i));
      if (i >= TRANSCRIPT.length) clearInterval(id);
    }, TYPEWRITER_SPEED);
    return () => clearInterval(id);
  }, [frame]);

  return (
    <div
      role="img"
      aria-label="Animation montrant le workflow Quovi : voix, devis, envoi, signature"
      className="relative w-full max-w-[480px] h-[280px] sm:h-[380px] bg-white rounded-3xl overflow-hidden"
      style={{
        boxShadow:
          "0 20px 60px rgba(15,15,35,0.08), 0 8px 24px rgba(15,15,35,0.04)",
      }}
    >
      <Frame active={frame === 0}>
        <VoiceFrame typed={typed} />
      </Frame>
      <Frame active={frame === 1}>
        <BuildingFrame active={frame === 1} />
      </Frame>
      <Frame active={frame === 2}>
        <ReadyFrame />
      </Frame>
      <Frame active={frame === 3}>
        <SignedFrame active={frame === 3} />
      </Frame>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {Array.from({ length: FRAME_COUNT }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              i === frame
                ? "bg-[var(--primary)]"
                : "bg-[var(--text-muted)] opacity-30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Frame({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!active}
      className="absolute inset-0 px-8 pt-8 pb-12"
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(10px)",
        transition:
          "opacity 600ms cubic-bezier(0.4,0,0.2,1), transform 600ms cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}

function VoiceFrame({ typed }: { typed: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-4 sm:gap-5">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-bg)] text-[10px] font-bold text-[var(--primary-dark)] uppercase tracking-wider">
        <Mic className="w-3 h-3" aria-hidden />
        En écoute
      </span>
      <div className="relative">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[var(--primary)] opacity-40 animate-ping"
        />
        <span className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg">
          <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-white" aria-hidden />
        </span>
      </div>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] italic min-h-[40px] max-w-[320px] leading-relaxed">
        « {typed}
        <span
          aria-hidden
          className="inline-block w-0.5 h-3 sm:h-4 bg-[var(--primary)] align-middle animate-pulse ml-0.5"
        />
         »
      </p>
    </div>
  );
}

function BuildingFrame({ active }: { active: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        Devis #042
      </p>
      <div className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3">
        {ROWS.map((row, i) => (
          <div
            key={row.label}
            className="flex justify-between text-xs sm:text-sm"
            style={{
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(8px)",
              transition:
                "opacity 500ms cubic-bezier(0.4,0,0.2,1), transform 500ms cubic-bezier(0.4,0,0.2,1)",
              transitionDelay: active ? `${i * 200}ms` : "0ms",
            }}
          >
            <span className="text-[var(--text-secondary)]">{row.label}</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {row.price}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadyFrame() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Devis #042
        </p>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--emerald-bg)] text-[10px] font-bold text-[var(--emerald-dark)] uppercase tracking-wider">
          <Send className="w-3 h-3" aria-hidden />
          Envoyé
        </span>
      </div>
      <div className="mt-5 sm:mt-6 space-y-2 text-xs sm:text-sm">
        {ROWS.map((row) => (
          <div key={row.label} className="flex justify-between">
            <span className="text-[var(--text-secondary)]">{row.label}</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {row.price}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-3 sm:pt-4 border-t border-[var(--border-light)] flex items-baseline justify-between">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Total TTC
        </span>
        <span className="text-xl sm:text-2xl font-bold text-[var(--primary)]">
          2 880 €
        </span>
      </div>
    </div>
  );
}

function SignedFrame({ active }: { active: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Devis #042
        </p>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--emerald-bg)] text-[10px] font-bold text-[var(--emerald-dark)] uppercase tracking-wider"
          style={{
            transform: active ? "scale(1)" : "scale(0.8)",
            transition: "transform 500ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <CheckCircle2 className="w-3 h-3" aria-hidden />
          Signé
        </span>
      </div>
      <div className="mt-5 sm:mt-6 space-y-2 text-xs sm:text-sm">
        {ROWS.map((row) => (
          <div key={row.label} className="flex justify-between">
            <span className="text-[var(--text-secondary)]">{row.label}</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {row.price}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-3 sm:pt-4 border-t border-[var(--border-light)]">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Total TTC
          </span>
          <span className="text-xl sm:text-2xl font-bold text-[var(--primary)]">
            2 880 €
          </span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--text-muted)] text-right">
          Signé il y a 12 min · M. Dupont
        </p>
      </div>
    </div>
  );
}
