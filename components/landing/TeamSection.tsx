"use client";

import { useEffect, useState } from "react";
import {
  IconCheck,
  IconClockHour3,
  IconCoinEuro,
  IconHandStop,
  IconMessage2,
  IconMicrophone,
  IconScale,
  type Icon,
} from "@tabler/icons-react";

type AgentKey = "emile" | "iris";

interface AgentFeature {
  Icon: Icon;
  title: string;
  desc: string;
}

interface AgentDef {
  letter: string;
  name: string;
  role: string;
  bg: string;
  color: string;
  message: string;
  tags: string[];
  features: AgentFeature[];
}

const AGENTS: Record<AgentKey, AgentDef> = {
  emile: {
    letter: "É",
    name: "Émile",
    role: "Le Rédacteur · Crée tes devis pendant que tu bosses",
    bg: "#EEEDFE",
    color: "#3C3489",
    message:
      "Salut, moi c’est Émile. Tu me décris ton chantier — voix, texte, photo, peu importe — et je te rédige un devis chiffré, propre, avec la TVA juste. T’as plus à galérer le soir à 22 h.",
    tags: [
      "Tarifs marché 2026",
      "Calcul TVA auto",
      "Mentions légales",
      "Dictée vocale",
      "Envoi en 1 clic",
    ],
    features: [
      {
        Icon: IconMicrophone,
        title: "Dictée vocale BTP",
        desc: "Parlez les mains sales. Whisper transcrit avec le vocabulaire du chantier.",
      },
      {
        Icon: IconCoinEuro,
        title: "Tarifs marché 2026",
        desc: "Émile connaît les fourchettes par métier et région. Plus de devis sous-évalués.",
      },
      {
        Icon: IconScale,
        title: "TVA & mentions légales",
        desc: "5,5 / 10 / 20 % selon contexte. Mentions obligatoires en automatique.",
      },
    ],
  },
  iris: {
    letter: "I",
    name: "Iris",
    role: "La Sentinelle · Relance tes clients sans toi",
    bg: "#E1F5EE",
    color: "#085041",
    message:
      "Moi c’est Iris. Pendant que tu bosses sur le chantier, je surveille tes devis envoyés. À J+3 je relance gentiment, à J+7 je rappelle, à J+14 je conclus. Et dès que le client répond, j’arrête tout. Tu signes plus, sans y penser.",
    tags: [
      "Relances J+3 / J+7 / J+14",
      "Ton adapté au client",
      "Suivi en temps réel",
      "Stop si client répond",
    ],
    features: [
      {
        Icon: IconClockHour3,
        title: "Relances J+3, J+7, J+14",
        desc: "Iris attend pile le bon moment, ni trop tôt ni trop tard.",
      },
      {
        Icon: IconMessage2,
        title: "Ton adapté au client",
        desc: "Pro, chaleureux, ou plus direct. Iris ajuste selon l’historique.",
      },
      {
        Icon: IconHandStop,
        title: "Stop si client répond",
        desc: "Dès qu’une réponse arrive, Iris arrête tout. Pas de spam.",
      },
    ],
  },
};

const TYPING_SPEED_MS = 20;

export function TeamSection() {
  const [currentAgent, setCurrentAgent] = useState<AgentKey>("emile");
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const message = AGENTS[currentAgent].message;
    setDisplayed("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDisplayed(message.slice(0, i));
      if (i >= message.length) window.clearInterval(id);
    }, TYPING_SPEED_MS);
    return () => window.clearInterval(id);
  }, [currentAgent]);

  const agent = AGENTS[currentAgent];

  return (
    <section id="equipe" className="bg-[#F6F4EE] py-20 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-[640px] mx-auto mb-12">
          <span className="block font-mono text-[0.78rem] uppercase tracking-[0.05em] text-[#8A857F] mb-4">
            1.0 · Coulisses
          </span>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.05] tracking-[-0.03em] font-medium text-[#0F0F14] mb-4">
            Pendant que vous bossez, ils{" "}
            <span className="bg-[#FCE96A] px-1.5 rounded-[3px]">tournent</span>.
          </h2>
          <p className="text-[1.15rem] leading-[1.55] text-[#4B4B55]">
            Cliquez sur un nom. Il vous parle.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-black/[0.08] rounded-[20px] overflow-hidden grid grid-cols-1 md:grid-cols-[1.55fr_0.85fr] min-h-[440px]">
          {/* LEFT — conversation */}
          <div className="p-9 md:p-10 flex flex-col border-b md:border-b-0 md:border-r border-black/[0.08]">
            <div className="flex items-center gap-3.5 pb-[22px] border-b border-black/[0.08] mb-6">
              <div
                className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-[22px] font-semibold flex-shrink-0 transition-colors duration-300"
                style={{ background: agent.bg, color: agent.color }}
              >
                {agent.letter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 text-[1.1rem] font-semibold text-[#0F0F14]">
                  <span>{agent.name}</span>
                  <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-[#085041]">
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]"
                    />
                    En ligne
                  </span>
                </div>
                <div className="text-[0.85rem] text-[#8A857F] mt-0.5">
                  {agent.role}
                </div>
              </div>
            </div>

            <div className="font-mono text-[0.74rem] uppercase tracking-[0.05em] text-[#8A857F] mb-3">
              Il vous parle
            </div>
            <div className="font-display text-[1.2rem] leading-[1.5] text-[#0F0F14] min-h-[140px] mb-6">
              <span>{displayed}</span>
              <span
                aria-hidden
                className="inline-block w-[2px] h-[18px] bg-[#5B5BD6] align-[-3px] ml-px animate-[blink_1s_infinite]"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
              {agent.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[0.78rem] py-1 px-2.5 bg-[#F6F4EE] text-[#4B4B55] rounded-full border border-black/[0.08]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Features grid (re-mount on agent change for fade-in) */}
            <div
              key={currentAgent}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-auto animate-fade-in-up"
            >
              {agent.features.map((f) => (
                <div
                  key={f.title}
                  className="p-4 rounded-xl bg-[#F6F4EE] border border-black/[0.08]"
                >
                  <div className="mb-2 text-[#5B5BD6]">
                    <f.Icon size={20} />
                  </div>
                  <div className="text-[14px] font-medium text-[#0F0F14] leading-snug mb-1">
                    {f.title}
                  </div>
                  <div className="text-[12px] leading-[1.5] text-[#4B4B55]">
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — list */}
          <div className="p-6 bg-[#F6F4EE]">
            <div className="font-mono text-[0.74rem] uppercase tracking-[0.05em] text-[#8A857F] mb-3.5 px-2">
              L’équipe
            </div>

            {(Object.keys(AGENTS) as AgentKey[]).map((key) => {
              const a = AGENTS[key];
              const isActive = currentAgent === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCurrentAgent(key)}
                  className={[
                    "flex items-center gap-3 p-3 rounded-[10px] cursor-pointer transition-colors w-full text-left mb-1 border",
                    isActive
                      ? "bg-white border-black/[0.08]"
                      : "bg-transparent border-transparent hover:bg-black/[0.03]",
                  ].join(" ")}
                  aria-pressed={isActive}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-semibold flex-shrink-0"
                    style={{ background: a.bg, color: a.color }}
                  >
                    {a.letter}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 text-[0.94rem] font-medium text-[#0F0F14]">
                      {a.name}
                      <span className="text-[0.68rem] py-px px-1.5 bg-black/[0.05] text-[#8A857F] rounded-full">
                        Agent
                      </span>
                    </span>
                    <span className="block text-[0.8rem] text-[#8A857F] mt-px">
                      {key === "emile" ? "Devis" : "Relances"}
                    </span>
                  </span>
                  <span
                    className={[
                      "text-[#8A857F]",
                      isActive ? "visible" : "invisible",
                    ].join(" ")}
                    aria-hidden={!isActive}
                  >
                    <IconCheck size={14} />
                  </span>
                </button>
              );
            })}

            {/* 3e agent — Bientôt */}
            <div
              className="flex items-center gap-3 p-3 rounded-[10px] w-full text-left mb-1 border border-transparent cursor-not-allowed opacity-60"
              aria-disabled="true"
            >
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-semibold flex-shrink-0 bg-[#F6F4EE] text-[#8A857F] border border-black/[0.08]">
                ?
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 text-[0.94rem] font-medium text-[#0F0F14]">
                  Bientôt
                  <span className="text-[0.68rem] py-px px-1.5 bg-black/[0.05] text-[#8A857F] rounded-full">
                    À venir
                  </span>
                </span>
                <span className="block text-[0.8rem] text-[#8A857F] mt-px">
                  Un nouvel agent en préparation
                </span>
              </span>
            </div>

            <div className="px-2 pt-3.5 pb-1 border-t border-black/[0.08] mt-3 text-[0.82rem] text-[#8A857F] leading-[1.5]">
              <strong className="text-[#4B4B55] font-medium">Bientôt :</strong>{" "}
              on en forge d’autres, un par un. Pas de bloat, pas de
              fonctionnalités inutiles.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
