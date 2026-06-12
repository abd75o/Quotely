import type { ReminderStage } from "@/emails/ReminderEmail";

// ════════════════════════════════════════════════════════════════════════════
// Iris — RÈGLES DE CADENCE DES RELANCES (partagées route manuelle ↔ moteur auto)
//
//   • Manuel → manuel : blocage DUR de 48h entre deux relances manuelles sur le
//     même devis (anti-spam ; l'artisan reste libre du nombre total).
//   • Auto récente : NON bloquante pour le manuel — juste informative côté UI
//     ("Iris a relancé ce client il y a Xh"). L'artisan décide en connaissance.
//   • Auto (moteur) : ne relance pas si une relance — auto OU manuelle — a été
//     envoyée dans les dernières 48h (évite le double envoi après un manuel).
// ════════════════════════════════════════════════════════════════════════════

export const REMINDER_COOLDOWN_HOURS = 48;
export const REMINDER_COOLDOWN_MS = REMINDER_COOLDOWN_HOURS * 3_600_000;

export interface ReminderRow {
  sent_at: string;
  source: string; // 'auto' | 'manual'
}

export interface ReminderState {
  lastManualAt: string | null;
  lastAutoAt: string | null;
  lastAnyAt: string | null;
  /** Le cooldown 48h entre relances MANUELLES est-il encore actif ? */
  manualCooldownActive: boolean;
  /** Heures restantes avant de pouvoir relancer manuellement (0 si dispo). */
  hoursUntilAllowed: number;
  /** Heures écoulées depuis la dernière relance manuelle (null si aucune). */
  lastManualHoursAgo: number | null;
  /** Heures écoulées depuis la dernière relance auto (null si aucune). */
  lastAutoHoursAgo: number | null;
}

function hoursAgo(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (now - t) / 3_600_000);
}

/**
 * Dérive l'état de cadence d'un devis à partir de ses lignes quote_reminders.
 * `rows` peut être dans n'importe quel ordre.
 */
export function computeReminderState(
  rows: ReminderRow[],
  now: number,
): ReminderState {
  let lastManualAt: string | null = null;
  let lastAutoAt: string | null = null;
  let lastAnyAt: string | null = null;
  const max = (a: string | null, b: string) =>
    a && new Date(a).getTime() >= new Date(b).getTime() ? a : b;

  for (const r of rows) {
    if (!r.sent_at) continue;
    lastAnyAt = max(lastAnyAt, r.sent_at);
    if (r.source === "manual") lastManualAt = max(lastManualAt, r.sent_at);
    else if (r.source === "auto") lastAutoAt = max(lastAutoAt, r.sent_at);
  }

  const lastManualHoursAgo = hoursAgo(lastManualAt, now);
  const manualCooldownActive =
    lastManualHoursAgo !== null && lastManualHoursAgo < REMINDER_COOLDOWN_HOURS;
  const hoursUntilAllowed = manualCooldownActive
    ? Math.ceil(REMINDER_COOLDOWN_HOURS - (lastManualHoursAgo as number))
    : 0;

  return {
    lastManualAt,
    lastAutoAt,
    lastAnyAt,
    manualCooldownActive,
    hoursUntilAllowed,
    lastManualHoursAgo,
    lastAutoHoursAgo: hoursAgo(lastAutoAt, now),
  };
}

/**
 * Palier (= ton de l'email) d'une relance manuelle, calculé par l'ancienneté de
 * l'envoi du devis. Indépendant du nombre de relances déjà faites : une relance
 * tardive garde un ton « dernière chance » même si c'est la 5ᵉ.
 */
export function stageFromDaysSinceSent(daysSinceSent: number): ReminderStage {
  if (daysSinceSent >= 14) return "j14";
  if (daysSinceSent >= 7) return "j7";
  return "j3";
}
