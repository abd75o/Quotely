"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  FileText,
  Mic,
  Wand2,
  Send,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  ArrowRight,
  Sparkles,
  PenLine,
  Smartphone,
  Monitor,
  RefreshCw,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SCENE_MS = 5000;

// ─── Scene 1 : Le Problème ────────────────────────────────────────────────────

function ProblemVisual() {
  return (
    <div className="h-full flex items-center justify-center p-6 lg:p-10 select-none">
      <div className="w-full max-w-lg space-y-5">
        {/* Stacked messy files */}
        <div className="relative h-28">
          {[
            {
              name: "Devis_Martin_v3_FINAL.docx",
              badge: "Word",
              badgeColor: "bg-blue-100 text-blue-700",
              rotate: "-rotate-3",
              zIndex: "z-30",
              top: 0,
            },
            {
              name: "devis_dupont_corrigé_v2.xlsx",
              badge: "Excel",
              badgeColor: "bg-emerald-100 text-emerald-700",
              rotate: "rotate-1",
              zIndex: "z-20",
              top: 10,
            },
            {
              name: "Devis_Martin_VRAIMENT_FINAL.docx",
              badge: "Word",
              badgeColor: "bg-blue-100 text-blue-700",
              rotate: "-rotate-1",
              zIndex: "z-10",
              top: 20,
            },
          ].map((f, i) => (
            <div
              key={i}
              className={cn(
                "absolute left-0 right-0 flex items-center gap-3 px-4 py-3 rounded-xl",
                "bg-white border border-gray-200 shadow-sm",
                f.rotate, f.zIndex
              )}
              style={{ top: f.top }}
            >
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-mono text-gray-600 truncate flex-1">{f.name}</span>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0", f.badgeColor)}>
                {f.badge}
              </span>
            </div>
          ))}
        </div>

        {/* Pain indicators */}
        <div className="space-y-2">
          {[
            {
              icon: Clock,
              text: "47 minutes passées sur ce devis",
              classes: "bg-red-50 border-red-200 text-red-700",
            },
            {
              icon: AlertTriangle,
              text: "Erreur TVA détectée — montant incorrect",
              classes: "bg-orange-50 border-orange-200 text-orange-700",
            },
            {
              icon: RefreshCw,
              text: "Client non relancé depuis 14 jours",
              classes: "bg-yellow-50 border-yellow-200 text-yellow-700",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium",
                item.classes
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.text}
            </div>
          ))}
        </div>

        {/* Time lost badge */}
        <div className="flex justify-center pt-1">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-full shadow-lg">
            <Clock className="w-4 h-4" />
            ~8h perdues par semaine
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 2 : Dictée IA ─────────────────────────────────────────────────────

function DictationVisual() {
  return (
    <div className="h-full flex items-center justify-center p-6 lg:p-8 select-none">
      <div className="w-full max-w-xl flex gap-4 lg:gap-6 items-stretch">

        {/* Left — Phone with mic */}
        <div className="flex-shrink-0 w-36 lg:w-44">
          <div className="bg-gray-900 rounded-3xl p-1.5 shadow-2xl h-full">
            <div className="bg-gray-800 rounded-2xl h-full flex flex-col items-center justify-between py-5 px-3">
              {/* Notch */}
              <div className="w-16 h-4 bg-gray-900 rounded-full mb-2" />

              {/* App content */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
                {/* Mic button */}
                <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg animate-pulse-glow">
                  <Mic className="w-7 h-7 text-white" />
                </div>

                {/* Waveform */}
                <div className="flex items-center gap-1 h-8">
                  {[3, 7, 12, 6, 14, 8, 4, 11, 9, 5, 13, 7, 3].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[var(--primary)] rounded-full opacity-80"
                      style={{
                        height: `${h}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Dictation text */}
                <div className="w-full px-2 py-2 bg-gray-900/60 rounded-lg">
                  <p className="text-[10px] text-indigo-300 font-medium leading-relaxed">
                    "Pose carrelage 40m² cuisine, joints compris…"
                  </p>
                </div>
              </div>

              {/* Home indicator */}
              <div className="w-20 h-1 bg-gray-600 rounded-full mt-2" />
            </div>
          </div>
        </div>

        {/* Right — Generated quote on screen */}
        <div className="flex-1 min-w-0">
          {/* Browser mockup */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden h-full">
            {/* Browser bar */}
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-[10px] text-gray-400 font-mono ml-1">
                app.quotely.fr/new
              </div>
            </div>

            {/* Quote being generated */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-[var(--primary-bg)] rounded-lg flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                </div>
                <span className="text-xs font-semibold text-[var(--primary)]">IA en cours de génération…</span>
                <span className="ml-auto text-[10px] text-[var(--text-muted)] animate-pulse">●</span>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Dépose ancienne dalle", price: "320 €", done: true },
                  { label: "Fourniture carrelage 40m²", price: "1 200 €", done: true },
                  { label: "Pose + joints", price: "880 €", done: true },
                  { label: "Nettoyage fin de chantier", price: "160 €", done: false },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex justify-between items-center py-1.5 border-b border-[var(--border-light)] last:border-0",
                      !row.done && "opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {row.done
                        ? <CheckCircle2 className="w-3 h-3 text-[var(--emerald)] flex-shrink-0" />
                        : <div className="w-3 h-3 rounded-full border-2 border-gray-300 flex-shrink-0 animate-spin border-t-[var(--primary)]" />
                      }
                      <span className="text-xs text-[var(--text-primary)]">{row.label}</span>
                    </div>
                    <span className={cn("text-xs font-bold", row.done ? "text-[var(--primary)]" : "text-gray-300")}>{row.price}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[var(--primary-bg)] rounded-xl p-3 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-[var(--primary)]">Total TTC (20%)</span>
                  <span className="text-sm font-extrabold text-[var(--primary)]">3 072 €</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 3 : Envoi & Signature ─────────────────────────────────────────────

function SignatureVisual() {
  return (
    <div className="h-full flex items-center justify-center p-6 lg:p-8 select-none">
      <div className="w-full max-w-lg space-y-4">

        {/* Flow steps */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { icon: Send, label: "Envoyé", color: "bg-[var(--primary)] text-white", done: true },
            { icon: Smartphone, label: "Reçu", color: "bg-[var(--primary)] text-white", done: true },
            { icon: PenLine, label: "Signé", color: "bg-[var(--emerald)] text-white", done: true },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shadow-sm", step.color)}>
                  <step.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{step.label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-0.5 bg-[var(--primary)] mb-4" />}
            </div>
          ))}
        </div>

        {/* Email preview */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
          <div className="bg-[var(--surface)] border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
            <div className="w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center">
              <Send className="w-3 h-3 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)]">Devis #2024-089 — 3 072 €</p>
              <p className="text-[10px] text-[var(--text-muted)]">À : m.dupont@email.fr</p>
            </div>
            <span className="text-[10px] text-[var(--emerald)] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 14:32
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Bonjour M. Dupont, veuillez trouver ci-joint votre devis pour la pose de carrelage…
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg">
              <PenLine className="w-3 h-3" />
              Signer le devis
            </div>
          </div>
        </div>

        {/* Signature success notification */}
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-[var(--emerald)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-800">Marc Dupont a signé !</p>
            <p className="text-xs text-emerald-600 mt-0.5">Devis #2024-089 · 3 072 € · 14:47</p>
            <p className="text-xs text-emerald-500 mt-1">Facture générée automatiquement ✓</p>
          </div>
          <div className="text-2xl">🎉</div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 4 : Dashboard ─────────────────────────────────────────────────────

const BAR_DATA = [
  { month: "Nov", value: 58, amount: "8 400" },
  { month: "Déc", value: 45, amount: "6 500" },
  { month: "Jan", value: 72, amount: "10 400" },
  { month: "Fév", value: 65, amount: "9 400" },
  { month: "Mar", value: 80, amount: "11 600" },
  { month: "Avr", value: 91, amount: "13 200" },
];

const RECENT_QUOTES = [
  { client: "SCI Bellevue", amount: "4 800 €", status: "signed", label: "Signé" },
  { client: "Thomas Renaud", amount: "1 920 €", status: "pending", label: "En attente" },
  { client: "Café du Port", amount: "3 360 €", status: "signed", label: "Signé" },
  { client: "M. Petit", amount: "2 640 €", status: "refused", label: "Refusé" },
];

function DashboardVisual() {
  return (
    <div className="h-full flex items-center justify-center p-4 lg:p-6 select-none">
      <div className="w-full max-w-xl space-y-3">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: FileText, label: "Devis ce mois", value: "18", delta: "+4", color: "text-[var(--primary)]", bg: "bg-[var(--primary-bg)]" },
            { icon: TrendingUp, label: "Taux signature", value: "73%", delta: "+8%", color: "text-[var(--emerald)]", bg: "bg-emerald-50" },
            { icon: BarChart3, label: "CA mois", value: "13 200€", delta: "+14%", color: "text-violet-500", bg: "bg-violet-50" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mb-2", stat.bg)}>
                <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
              </div>
              <p className={cn("text-lg font-extrabold leading-none", stat.color)}>{stat.value}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-tight">{stat.label}</p>
              <span className="text-[10px] text-[var(--emerald)] font-semibold">{stat.delta}</span>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--text-primary)]">CA mensuel</span>
            <span className="text-xs text-[var(--text-muted)]">6 derniers mois</span>
          </div>
          <div className="flex items-end gap-2 h-20">
            {BAR_DATA.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all duration-500",
                    i === BAR_DATA.length - 1 ? "bg-[var(--primary)]" : "bg-indigo-200"
                  )}
                  style={{ height: `${bar.value}%` }}
                  title={bar.amount + " €"}
                />
                <span className="text-[9px] text-[var(--text-muted)] font-medium">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent quotes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-50">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Devis récents</span>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_QUOTES.map((q, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">{q.client}</span>
                <span className="text-xs font-bold text-[var(--text-secondary)]">{q.amount}</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  q.status === "signed"  && "bg-emerald-100 text-emerald-700",
                  q.status === "pending" && "bg-amber-100 text-amber-700",
                  q.status === "refused" && "bg-red-100 text-red-600",
                )}>
                  {q.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene config ─────────────────────────────────────────────────────────────

const SCENES = [
  {
    id: 0,
    tab: "Le problème",
    icon: AlertTriangle,
    title: "Avant Quotely : du temps perdu, du stress.",
    description:
      "Fichiers Word mal nommés, erreurs de TVA, clients oubliés. Un artisan perd en moyenne 8h par semaine à gérer ses devis.",
    accent: "text-rose-500",
    accentBg: "bg-rose-50",
    Visual: ProblemVisual,
  },
  {
    id: 1,
    tab: "Dictée IA",
    icon: Mic,
    title: "Parlez. L'IA génère le devis en 5 secondes.",
    description:
      "Décrivez votre prestation à voix haute depuis le chantier. Claude AI structure, calcule la TVA et rédige les libellés professionnels.",
    accent: "text-[var(--primary)]",
    accentBg: "bg-[var(--primary-bg)]",
    Visual: DictationVisual,
  },
  {
    id: 2,
    tab: "Envoi & Signature",
    icon: Send,
    title: "Envoyé en 1 clic. Signé depuis le téléphone.",
    description:
      "Votre client reçoit un lien par email. Il signe électroniquement en quelques secondes. Vous êtes notifié et la facture se génère.",
    accent: "text-[var(--emerald)]",
    accentBg: "bg-emerald-50",
    Visual: SignatureVisual,
  },
  {
    id: 3,
    tab: "Dashboard",
    icon: BarChart3,
    title: "Pilotez votre activité en temps réel.",
    description:
      "Taux de signature, CA mensuel, devis en attente — tout ce dont vous avez besoin pour prendre les bonnes décisions.",
    accent: "text-violet-500",
    accentBg: "bg-violet-50",
    Visual: DashboardVisual,
  },
] as const;

// ─── Main Demo component ──────────────────────────────────────────────────────

export function Demo() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressKeyRef = useRef(0);
  const [progressKey, setProgressKey] = useState(0);

  const goTo = useCallback((idx: number) => {
    setActive(idx);
    progressKeyRef.current += 1;
    setProgressKey(progressKeyRef.current);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (isPaused) return;
    intervalRef.current = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % SCENES.length;
        progressKeyRef.current += 1;
        setProgressKey(progressKeyRef.current);
        return next;
      });
    }, SCENE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  const scene = SCENES[active];

  return (
    <section
      id="demo"
      className="py-24 bg-[var(--text-primary)] relative overflow-hidden"
    >
      {/* Decorative glow */}
      <div className="absolute top-1/2 left-1/2 w-[700px] h-[700px] -translate-x-1/2 -translate-y-1/2 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 text-indigo-200 text-xs font-semibold rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Démo interactive
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Voyez Quotely{" "}
            <span className="text-[var(--primary-light)]">en action</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            De la galère au devis signé — en moins de 30 secondes.
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex flex-wrap justify-center gap-2 mb-6"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {SCENES.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => goTo(s.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-[var(--primary)] text-white shadow-lg shadow-indigo-500/30"
                    : "bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.tab}
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/10 rounded-full mb-6 overflow-hidden">
          {!isPaused && (
            <div
              key={progressKey}
              className="h-full bg-[var(--primary)] rounded-full"
              style={{
                animation: `progressFill ${SCENE_MS}ms linear forwards`,
              }}
            />
          )}
        </div>

        {/* Visual card */}
        <div
          className="relative bg-white rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{ minHeight: 420 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-3 bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs text-gray-400 font-mono">
              app.quotely.fr
            </div>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", scene.accentBg, scene.accent)}>
              Scène {active + 1}/4
            </span>
          </div>

          {/* Scene visual */}
          <div className="relative" style={{ height: 380 }}>
            <scene.Visual />
          </div>
        </div>

        {/* Scene description */}
        <div className="mt-8 text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-white mb-2">{scene.title}</h3>
          <p className="text-gray-400 leading-relaxed">{scene.description}</p>
        </div>

        {/* Scene dots */}
        <div className="flex justify-center gap-2 mt-6">
          {SCENES.map((s) => (
            <button
              key={s.id}
              onClick={() => goTo(s.id)}
              className={cn(
                "rounded-full transition-all duration-300 cursor-pointer",
                s.id === active
                  ? "w-6 h-2 bg-[var(--primary)]"
                  : "w-2 h-2 bg-white/20 hover:bg-white/40"
              )}
              aria-label={`Scène ${s.id + 1}`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-[var(--primary)] bg-white hover:bg-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
          >
            Essayer gratuitement — 14 jours
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
          <p className="mt-3 text-xs text-gray-500">Sans carte bancaire · Résiliable en 1 clic</p>
        </div>
      </div>
    </section>
  );
}
