import type { SupabaseClient } from "@supabase/supabase-js";
import { sendReminderEmail } from "./reminder-email";
import { postReminderNotice } from "./post-reminder-notice";
import type {
  ReminderStage,
  ReminderContext,
  ReminderEmailProfile,
} from "@/emails/ReminderEmail";

// ════════════════════════════════════════════════════════════════════════════
// Iris — MOTEUR DE RELANCE. Balaie chaque jour les devis envoyés non signés et
// relance à J+3 / J+7 / J+14. Exécuté via service_role (cron) → RLS bypassée,
// l'isolation par artisan est garantie par les filtres user_id explicites.
//
// Règles :
//   - Cibles : artisans iris_enabled + plan pro/comptable, devis status
//     sent|viewed, sent_at dans les 15 derniers jours, valid_until non dépassé.
//   - Un seul email/jour/devis : on envoie le palier le PLUS ÉLEVÉ atteint et
//     non encore envoyé (jamais de spam rétroactif si le cron a démarré tard).
//   - Anti-doublon : insertion quote_reminders (UNIQUE quote_id+stage) ; un
//     palier déjà tracé n'est jamais renvoyé.
//   - Arrêt auto : signed/refused/invoiced/expired ne sont plus dans la cible.
//   - Best-effort par devis : une erreur n'arrête pas le balayage.
// ════════════════════════════════════════════════════════════════════════════

const STAGE_THRESHOLDS: { stage: ReminderStage; days: number }[] = [
  { stage: "j14", days: 14 },
  { stage: "j7", days: 7 },
  { stage: "j3", days: 3 },
];

export interface IrisRunSummary {
  scannedUsers: number;
  scannedQuotes: number;
  sent: number;
  skipped: number;
  errors: number;
  details: Array<{
    quoteId: string;
    number: string;
    stage?: ReminderStage;
    outcome: "sent" | "skipped" | "error";
    reason?: string;
  }>;
}

function daysSince(iso: string, now: number): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return -1;
  return Math.floor((now - t) / 86_400_000);
}

// Construit le profil pour l'email depuis le snapshot figé du devis (ce que le
// client a reçu), avec repli sur le profil live de l'artisan.
function profileForEmail(
  snapshot: Record<string, unknown> | null,
  live: Record<string, unknown> | null,
): ReminderEmailProfile {
  const s = snapshot ?? {};
  const l = live ?? {};
  const pick = (k: string) =>
    (s[k] as string | null | undefined) ??
    (l[k] as string | null | undefined) ??
    null;
  return {
    company_name: pick("company_name"),
    company: pick("company"),
    first_name: pick("first_name"),
    last_name: pick("last_name"),
    email: pick("email"),
    telephone: pick("telephone"),
    address: pick("address"),
    postal_code: pick("postal_code"),
    city: pick("city"),
    logo_url: pick("logo_url"),
    couleur_principale:
      pick("couleur_principale") ?? pick("brand_color"),
  };
}

interface QuoteRowRaw {
  id: string;
  user_id: string;
  number: string;
  status: string;
  total: number | null;
  sent_at: string | null;
  valid_until: string | null;
  page_viewed_at: string | null;
  signature_token: string | null;
  emitter_snapshot: Record<string, unknown> | null;
  client: unknown;
}

function clientFromRow(raw: unknown): {
  name: string;
  first_name: string | null;
  email: string | null;
} {
  const c = Array.isArray(raw) ? raw[0] : raw;
  const obj = (c as Record<string, unknown> | null) ?? {};
  return {
    name: (obj.name as string | null) ?? "",
    first_name: (obj.first_name as string | null) ?? null,
    email: (obj.email as string | null) ?? null,
  };
}

export async function runIrisReminders(
  admin: SupabaseClient,
  opts?: { now?: number; appUrl?: string },
): Promise<IrisRunSummary> {
  const now = opts?.now ?? Date.now();
  const appUrl =
    opts?.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://quovi.fr";

  const summary: IrisRunSummary = {
    scannedUsers: 0,
    scannedQuotes: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  // 1) Artisans éligibles : Iris activé + plan pro/comptable.
  const { data: profiles, error: profErr } = await admin
    .from("profiles")
    .select(
      "id, company_name, company, first_name, last_name, email, telephone, address, postal_code, city, logo_url, couleur_principale, plan, iris_enabled",
    )
    .eq("iris_enabled", true)
    .in("plan", ["pro", "comptable"]);
  if (profErr) throw profErr;
  const eligible = profiles ?? [];
  summary.scannedUsers = eligible.length;
  if (eligible.length === 0) return summary;

  const profileById = new Map<string, Record<string, unknown>>();
  for (const p of eligible) profileById.set(p.id as string, p);
  const userIds = eligible.map((p) => p.id as string);

  // 2) Devis candidats : envoyés non signés, ≤ 15 jours.
  const cutoff = new Date(now - 15 * 86_400_000).toISOString();
  const { data: quotes, error: qErr } = await admin
    .from("quotes")
    .select(
      "id, user_id, number, status, total, sent_at, valid_until, page_viewed_at, signature_token, emitter_snapshot, client:clients(name, first_name, email)",
    )
    .in("user_id", userIds)
    .in("status", ["sent", "viewed"])
    .gte("sent_at", cutoff);
  if (qErr) throw qErr;
  const candidates = (quotes ?? []) as QuoteRowRaw[];
  summary.scannedQuotes = candidates.length;
  if (candidates.length === 0) return summary;

  // 3) Paliers déjà envoyés pour ces devis (anti-doublon).
  const quoteIds = candidates.map((q) => q.id);
  const { data: reminders, error: remErr } = await admin
    .from("quote_reminders")
    .select("quote_id, stage")
    .in("quote_id", quoteIds);
  if (remErr) throw remErr;
  const sentStages = new Map<string, Set<string>>();
  for (const r of reminders ?? []) {
    const set = sentStages.get(r.quote_id as string) ?? new Set<string>();
    set.add(r.stage as string);
    sentStages.set(r.quote_id as string, set);
  }

  // 4) Traitement par devis (best-effort isolé).
  for (const q of candidates) {
    try {
      if (!q.sent_at || !q.signature_token) {
        summary.skipped++;
        summary.details.push({
          quoteId: q.id,
          number: q.number,
          outcome: "skipped",
          reason: "sent_at/token manquant",
        });
        continue;
      }
      // Devis expiré → on ne relance pas.
      if (q.valid_until && new Date(q.valid_until).getTime() < now) {
        summary.skipped++;
        summary.details.push({
          quoteId: q.id,
          number: q.number,
          outcome: "skipped",
          reason: "expiré",
        });
        continue;
      }

      const days = daysSince(q.sent_at, now);
      const already = sentStages.get(q.id) ?? new Set<string>();
      // Palier le plus élevé atteint et non encore envoyé.
      const due = STAGE_THRESHOLDS.find(
        (s) => days >= s.days && !already.has(s.stage),
      );
      if (!due) {
        summary.skipped++;
        summary.details.push({
          quoteId: q.id,
          number: q.number,
          outcome: "skipped",
          reason: `aucun palier dû (j+${days})`,
        });
        continue;
      }

      const client = clientFromRow(q.client);
      if (!client.email) {
        summary.skipped++;
        summary.details.push({
          quoteId: q.id,
          number: q.number,
          stage: due.stage,
          outcome: "skipped",
          reason: "email client manquant",
        });
        continue;
      }

      const context: ReminderContext = q.page_viewed_at
        ? "viewed"
        : "not_viewed";
      const profile = profileForEmail(
        q.emitter_snapshot,
        profileById.get(q.user_id) ?? null,
      );
      const signLink = `${appUrl}/sign/${q.signature_token}`;

      const res = await sendReminderEmail({
        to: client.email,
        quote: { number: q.number, total: Number(q.total ?? 0) },
        profile,
        client: { name: client.name, first_name: client.first_name },
        signLink,
        stage: due.stage,
        context,
      });
      if (res.error || !res.messageId) {
        summary.errors++;
        summary.details.push({
          quoteId: q.id,
          number: q.number,
          stage: due.stage,
          outcome: "error",
          reason: res.error ?? "envoi échoué",
        });
        continue;
      }

      // Trace (anti-doublon via UNIQUE quote_id+stage). Si une course insère le
      // même palier en parallèle, l'insert échoue → on ne renvoie pas.
      const { error: insErr } = await admin.from("quote_reminders").insert({
        quote_id: q.id,
        user_id: q.user_id,
        stage: due.stage,
        context,
        source: "auto",
        email_to: client.email,
        resend_message_id: res.messageId,
      });
      if (insErr) {
        // Doublon probable (course) : l'email est parti mais on loggue.
        summary.errors++;
        summary.details.push({
          quoteId: q.id,
          number: q.number,
          stage: due.stage,
          outcome: "error",
          reason: `trace échouée: ${insErr.message}`,
        });
        continue;
      }

      // Transparence Émile (best-effort, n'invalide pas la relance).
      try {
        const clientLabel =
          client.first_name || client.name || "le client";
        await postReminderNotice(admin, {
          quoteId: q.id,
          userId: q.user_id,
          quoteNumber: q.number,
          clientName: clientLabel,
          stage: due.stage,
          context,
        });
      } catch (e) {
        console.error("[IRIS] notif Émile échouée (non bloquant)", e);
      }

      summary.sent++;
      summary.details.push({
        quoteId: q.id,
        number: q.number,
        stage: due.stage,
        outcome: "sent",
      });
    } catch (e) {
      summary.errors++;
      summary.details.push({
        quoteId: q.id,
        number: q.number,
        outcome: "error",
        reason: (e as Error).message ?? "erreur inconnue",
      });
    }
  }

  return summary;
}
