import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeSendQuote } from "@/lib/quotes/send";
import { nextQuoteNumber, bumpQuoteNumber } from "@/lib/quotes/numbering";
import { autoTitleConversation } from "@/lib/conversations/auto-title";

export interface EmileToolContext {
  supabase: SupabaseClient;
  userId: string;
  userEmail?: string | null;
  conversationId?: string | null;
  appUrl?: string;
}

interface ProfileRow {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  company_name?: string | null;
  metier?: string | null;
  metier_principal?: string | null;
  specialites?: string[] | null;
  siret?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  iban?: string | null;
  bic?: string | null;
  vat_status?: string | null;
  tva_status?: string | null;
  vat_number?: string | null;
  telephone?: string | null;
  plan?: string | null;
  legal_status?: string | null;
  logo_url?: string | null;
  toggle_price_memory?: boolean | null;
  toggle_suggestions?: boolean | null;
  toggle_smart_alerts?: boolean | null;
  [key: string]: unknown;
}

// Pretty labels for the legacy `missing` array. The modal uses the snake_case
// codes directly (missing_required) so it can show the right form sections.
const HUMAN_FIELD_LABEL: Record<string, string> = {
  first_name: "prénom",
  last_name: "nom",
  company: "nom de l'entreprise",
  siret: "SIRET",
  telephone: "téléphone",
  address: "adresse",
  postal_code: "code postal",
  city: "ville",
  vat_status: "statut TVA",
  iban: "IBAN",
  bic: "BIC",
  logo_url: "logo",
  legal_status: "forme juridique",
};

type TypeChantier =
  | "renovation_plus_2ans"
  | "amelioration_energetique"
  | "neuf"
  | "b2b"
  | "autre";

const TAUX_TVA_MAP: Record<TypeChantier, number> = {
  renovation_plus_2ans: 10,
  amelioration_energetique: 5.5,
  neuf: 20,
  b2b: 20,
  autre: 20,
};

const MENTIONS_LEGALES_PAR_METIER: Record<
  string,
  { generales: string[]; garanties: string[] }
> = {
  plombier: {
    generales: [
      "Garantie décennale (numéro de police obligatoire)",
      "RC professionnelle obligatoire",
      "Mention RGE si éligible",
    ],
    garanties: ["Garantie décennale", "Garantie de parfait achèvement (1 an)"],
  },
  "plombier-chauffagiste": {
    generales: [
      "Garantie décennale (numéro de police obligatoire)",
      "RC professionnelle obligatoire",
      "Mention RGE si éligible",
    ],
    garanties: ["Garantie décennale", "Garantie de parfait achèvement (1 an)"],
  },
  electricien: {
    generales: [
      "Conformité NF C 15-100",
      "Qualifelec si applicable",
      "Garantie décennale",
    ],
    garanties: ["Garantie décennale", "Garantie biennale du matériel"],
  },
  peintre: {
    generales: ["Conformité NF DTU 59.1", "RC professionnelle"],
    garanties: ["Garantie biennale", "Garantie de parfait achèvement"],
  },
  carreleur: {
    generales: ["Conformité DTU 52.2", "Garantie décennale"],
    garanties: ["Garantie décennale"],
  },
  macon: {
    generales: ["Conformité DTU 20", "Garantie décennale", "RC professionnelle"],
    garanties: ["Garantie décennale"],
  },
  freelance: {
    generales: [
      "Conformité RGPD",
      "Droit applicable : droit français",
      "Juridiction compétente : tribunal du siège du prestataire",
    ],
    garanties: [],
  },
};

const MENTIONS_B2C_BTP = [
  "Délai de rétractation : 14 jours (art. L221-18 Code de la consommation)",
  "Médiation de la consommation : coordonnées du médiateur à fournir",
];

function ok(payload: Record<string, unknown>): Record<string, unknown> {
  return { ok: true, ...payload };
}

function err(message: string): Record<string, unknown> {
  return { ok: false, error: message };
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Escape characters that have special meaning in PostgREST filter values
 * (the `.or()` / `.ilike()` query strings sent over HTTP). Without this,
 * a user query containing an apostrophe, a comma, or a paren would break
 * the filter at parse time. The pattern covers SQL LIKE wildcards (% _),
 * PostgREST list separators (, ()), and quote characters.
 */
function escapePostgrestQuery(q: string): string {
  return q.replace(/[%_,()*'"\\]/g, "\\$&").trim();
}

async function maybeAutoNameConversation(
  supabase: SupabaseClient,
  conversationId: string | null | undefined,
  lines: Array<{ libelle: string }>,
  clientId: string | null | undefined,
  fallbackNumber: string,
): Promise<void> {
  // Delegate to the shared helper. The previous in-file implementation locked
  // the title as soon as ANY title existed, which let the bulk-import flow
  // freeze "Ligne importée 1 — …" in place; the helper detects those
  // placeholder titles and re-titles cleanly.
  await autoTitleConversation(supabase, conversationId, {
    clientId: clientId ?? null,
    fallbackPrestation: lines[0]?.libelle?.trim() ?? null,
    fallbackNumber,
  });
}

export function createEmileTools(ctx: EmileToolContext) {
  const { supabase, userId, conversationId, userEmail, appUrl } = ctx;

  return {
    getUserProfile: tool({
      description:
        "Récupère les informations du profil de l'artisan connecté (identité, entreprise, SIRET, adresse, IBAN, métier, statut TVA, toggles).",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          if (error) return err(error.message);
          return ok({ profile: (data as ProfileRow) ?? {} });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    checkProfileCompleteness: tool({
      description:
        "Vérifie si le profil de l'artisan est prêt pour générer un devis légal. Retourne { complete, missing_required, missing_recommended, missing }. Champs OBLIGATOIRES = bloquants pour la conformité du devis (identité, entreprise, SIRET, contact, adresse, statut TVA). Champs RECOMMANDÉS = améliorent le devis (IBAN/BIC sur le PDF, logo, forme juridique). Utilise les CODES de champ exacts retournés (snake_case) — le marker [OPEN_PROFILE_MODAL] s'attend à ces codes.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          if (error) return err(error.message);
          const p = (data as ProfileRow) ?? {};

          const missingRequired: string[] = [];
          if (!p.first_name) missingRequired.push("first_name");
          if (!p.last_name) missingRequired.push("last_name");
          if (!p.company && !p.company_name) missingRequired.push("company");
          if (!p.siret) missingRequired.push("siret");
          if (!p.telephone) missingRequired.push("telephone");
          if (!p.address) missingRequired.push("address");
          if (!p.postal_code) missingRequired.push("postal_code");
          if (!p.city) missingRequired.push("city");
          if (!p.vat_status && !p.tva_status) missingRequired.push("vat_status");

          const missingRecommended: string[] = [];
          if (!p.iban) missingRecommended.push("iban");
          if (!p.bic) missingRecommended.push("bic");
          if (!p.logo_url) missingRecommended.push("logo_url");
          if (!p.legal_status) missingRecommended.push("legal_status");

          // `missing` (legacy) = required-only, in human-readable French, for
          // any older system-prompt branch that still reads it.
          const missing = missingRequired.map((k) => HUMAN_FIELD_LABEL[k] ?? k);

          return ok({
            complete: missingRequired.length === 0,
            missing_required: missingRequired,
            missing_recommended: missingRecommended,
            missing,
          });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    refreshProfile: tool({
      description:
        "Re-lit le profil de l'artisan depuis la base. À appeler APRÈS un message système '[SYSTEM] Profil complété' pour récupérer les nouvelles infos (SIRET, IBAN, adresse…) et continuer la génération du devis avec les bonnes données.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          if (error) return err(error.message);
          return ok({ profile: (data as ProfileRow) ?? {} });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    findClient: tool({
      description:
        "Recherche un client par nom ou email dans la base de l'artisan. Retourne max 5 clients les plus pertinents.",
      inputSchema: z.object({
        query: z.string().describe("Nom ou email du client recherché"),
      }),
      execute: async ({ query }) => {
        try {
          const raw = query.trim();
          if (!raw) return err("query vide");
          const safe = escapePostgrestQuery(raw);
          const { data, error } = await supabase
            .from("clients")
            .select(
              "id, name, first_name, email, phone, address, postal_code, city, type_client, siret",
            )
            .eq("user_id", userId)
            .or(
              `name.ilike.%${safe}%,first_name.ilike.%${safe}%,email.ilike.%${safe}%`,
            )
            .limit(5);
          if (error) return err(error.message);
          return ok({ clients: data ?? [] });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    createClient: tool({
      description:
        "Crée un nouveau client dans la base de l'artisan. Retourne le client créé.",
      inputSchema: z.object({
        name: z.string(),
        first_name: z.string().optional(),
        email: z.string().email(),
        phone: z.string().optional(),
        address: z.string().optional(),
        postal_code: z.string().optional(),
        city: z.string().optional(),
        type_client: z.enum(["particulier", "professionnel"]),
        siret: z.string().optional(),
      }),
      execute: async (data) => {
        try {
          const payload = {
            user_id: userId,
            name: data.name,
            first_name: data.first_name ?? null,
            email: data.email,
            phone: data.phone ?? null,
            address: data.address ?? null,
            postal_code: data.postal_code ?? null,
            city: data.city ?? null,
            type_client: data.type_client,
            siret: data.siret ?? null,
          };
          const { data: row, error } = await supabase
            .from("clients")
            .insert(payload)
            .select(
              "id, name, first_name, email, phone, address, postal_code, city, type_client, siret",
            )
            .single();
          if (error) return err(error.message);
          return ok({ client: row });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    calculateTVA: tool({
      description:
        "Calcule la TVA correcte selon le contexte du chantier. typeChantier: 'renovation_plus_2ans' (10%), 'amelioration_energetique' (5.5%), 'neuf' (20%), 'b2b' (20%), 'autre' (20%). Si statutFiscal='auto_entrepreneur_franchise', TVA=0%.",
      inputSchema: z.object({
        montantHT: z.number(),
        typeChantier: z.enum([
          "renovation_plus_2ans",
          "amelioration_energetique",
          "neuf",
          "b2b",
          "autre",
        ]),
        statutFiscal: z
          .enum(["auto_entrepreneur_franchise", "normal"])
          .optional(),
      }),
      execute: async ({ montantHT, typeChantier, statutFiscal }) => {
        const ht = safeNumber(montantHT, 0);
        if (statutFiscal === "auto_entrepreneur_franchise") {
          return ok({
            tauxTVA: 0,
            montantTVA: 0,
            montantTTC: ht,
            mention: "TVA non applicable, art. 293 B du CGI",
          });
        }
        const taux = TAUX_TVA_MAP[typeChantier as TypeChantier] ?? 20;
        const montantTVA = +(ht * (taux / 100)).toFixed(2);
        const montantTTC = +(ht + montantTVA).toFixed(2);
        return ok({
          tauxTVA: taux,
          montantTVA,
          montantTTC,
        });
      },
    }),

    getMentionsLegales: tool({
      description:
        "Récupère les mentions légales obligatoires pour le métier et le type de client (particulier ou professionnel).",
      inputSchema: z.object({
        metier: z.string(),
        typeClient: z.enum(["particulier", "professionnel"]),
      }),
      execute: async ({ metier, typeClient }) => {
        const key = metier.toLowerCase().trim();
        const profile = MENTIONS_LEGALES_PAR_METIER[key];
        const generales = profile?.generales ?? [
          "RC professionnelle",
          "Mentions légales de l'entreprise (SIRET, adresse, forme juridique)",
        ];
        const garanties = profile?.garanties ?? [];
        const specifiques =
          typeClient === "particulier" ? MENTIONS_B2C_BTP : [];
        return ok({
          metier: key,
          typeClient,
          generales,
          garanties,
          specifiques,
        });
      },
    }),

    saveQuoteDraft: tool({
      description:
        "Enregistre ou met à jour le devis en cours (status='draft'). Une conversation = UN SEUL devis : si tu ne passes pas quoteId, le serveur récupère automatiquement le devis lié à la conversation et le met à jour. Retourne { ok, quoteId, number, items, subtotal, taxRate, taxAmount, total, validUntil }.",
      inputSchema: z.object({
        quoteId: z
          .string()
          .optional()
          .describe(
            "Optionnel. Le serveur réutilise le devis lié à la conversation en cours si absent.",
          ),
        clientId: z.string().optional(),
        lines: z.array(
          z.object({
            libelle: z.string(),
            quantite: z.number(),
            unite: z.string().optional(),
            prixHT: z.number(),
            tauxTVA: z.number(),
          }),
        ),
        conditions: z
          .object({
            validite_jours: z.number().default(90),
            acompte_percent: z.number().optional(),
          })
          .optional(),
      }),
      execute: async ({ quoteId, clientId, lines, conditions }) => {
        try {
          const items = lines.map((l, idx) => ({
            id: `l-${Date.now().toString(36)}-${idx}`,
            label: l.libelle,
            price: l.prixHT,
            quantity: l.quantite,
            unite: l.unite ?? null,
            tva: l.tauxTVA,
          }));
          const subtotal = +items
            .reduce((s, it) => s + it.price * it.quantity, 0)
            .toFixed(2);

          // Multi-TVA breakdown: group lines by rate so the tax total is
          // exact even when a quote mixes 20%, 10%, 5,5%. The legacy
          // `tax_rate` column gets the DOMINANT rate (highest HT base) so
          // existing consumers (PDF, signature page) keep working.
          const breakdown: Record<
            string,
            { base: number; tax: number; ttc: number }
          > = {};
          for (const it of items) {
            const base = it.price * it.quantity;
            const key = String(it.tva);
            const bucket = breakdown[key] ?? { base: 0, tax: 0, ttc: 0 };
            bucket.base += base;
            bucket.tax += base * (it.tva / 100);
            breakdown[key] = bucket;
          }
          for (const k of Object.keys(breakdown)) {
            breakdown[k] = {
              base: +breakdown[k].base.toFixed(2),
              tax: +breakdown[k].tax.toFixed(2),
              ttc: +(breakdown[k].base + breakdown[k].tax).toFixed(2),
            };
          }
          const taxAmount = +Object.values(breakdown)
            .reduce((s, b) => s + b.tax, 0)
            .toFixed(2);
          const total = +(subtotal + taxAmount).toFixed(2);
          // Dominant rate = rate with the largest HT base. Used as the
          // back-compat `tax_rate` scalar. Falls back to 20 on empty.
          let taxRate = 20;
          let dominantBase = -1;
          for (const [rate, b] of Object.entries(breakdown)) {
            if (b.base > dominantBase) {
              dominantBase = b.base;
              taxRate = Number(rate);
            }
          }

          const validDays = conditions?.validite_jours ?? 90;
          const validUntil = new Date(
            Date.now() + validDays * 24 * 60 * 60 * 1000,
          ).toISOString();

          // Resolve target quoteId: explicit param > conversation.related_quote_id
          let targetQuoteId = quoteId ?? null;
          if (!targetQuoteId && conversationId) {
            const { data: conv } = await supabase
              .from("conversations")
              .select("related_quote_id")
              .eq("id", conversationId)
              .eq("user_id", userId)
              .maybeSingle();
            if (conv?.related_quote_id) {
              targetQuoteId = conv.related_quote_id;
            }
          }

          if (targetQuoteId) {
            const { data, error } = await supabase
              .from("quotes")
              .update({
                items,
                subtotal,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                tax_breakdown: breakdown,
                total,
                valid_until: validUntil,
                ...(clientId ? { client_id: clientId } : {}),
              })
              .eq("id", targetQuoteId)
              .eq("user_id", userId)
              .select("id, number")
              .single();
            if (error) return err(error.message);
            await maybeAutoNameConversation(
              supabase,
              conversationId,
              lines,
              clientId ?? null,
              data.number,
            );
            return ok({
              quoteId: data.id,
              number: data.number,
              items,
              subtotal,
              taxRate,
              taxAmount,
              taxBreakdown: breakdown,
              total,
              validUntil,
            });
          }

          // Sequential per-user numbering. Retry on UNIQUE(user_id, number)
          // violations (Postgres code 23505) which can happen if two saves
          // race for the same suffix — bump by one and try again. Three
          // attempts is plenty in practice and bounds the cost of the rare
          // collision case.
          let candidateNumber = await nextQuoteNumber(supabase, userId);
          let data: { id: string; number: string; total: number } | null =
            null;
          let lastError: { message: string; code?: string } | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const res = await supabase
              .from("quotes")
              .insert({
                user_id: userId,
                client_id: clientId ?? null,
                number: candidateNumber,
                status: "draft",
                items,
                subtotal,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                tax_breakdown: breakdown,
                total,
                valid_until: validUntil,
              })
              .select("id, number, total")
              .single();
            if (!res.error) {
              data = res.data;
              break;
            }
            lastError = res.error as { message: string; code?: string };
            if (lastError.code === "23505") {
              candidateNumber = bumpQuoteNumber(candidateNumber);
              continue;
            }
            break;
          }
          if (!data) {
            return err(lastError?.message ?? "Erreur enregistrement devis");
          }

          // Link the new quote back to the conversation so subsequent calls update.
          if (conversationId) {
            await supabase
              .from("conversations")
              .update({ related_quote_id: data.id })
              .eq("id", conversationId)
              .eq("user_id", userId);
          }

          await maybeAutoNameConversation(
            supabase,
            conversationId,
            lines,
            clientId ?? null,
            data.number,
          );
          return ok({
            quoteId: data.id,
            number: data.number,
            items,
            subtotal,
            taxRate,
            taxAmount,
            taxBreakdown: breakdown,
            total,
            validUntil,
          });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    getUserPastPrices: tool({
      description:
        "Récupère les prix moyens mémorisés de l'artisan pour une prestation similaire. Retourne null si pas de mémoire.",
      inputSchema: z.object({
        prestation: z.string(),
      }),
      execute: async ({ prestation }) => {
        try {
          const raw = prestation.trim();
          const safe = escapePostgrestQuery(raw);
          const { data, error } = await supabase
            .from("user_prestations")
            .select(
              "libelle, unite, prix_moyen, prix_min, prix_max, nb_utilisations, last_used_at",
            )
            .eq("user_id", userId)
            .ilike("libelle", `%${safe}%`)
            .order("nb_utilisations", { ascending: false })
            .limit(5);
          if (error) return err(error.message);
          const rows = data ?? [];
          if (rows.length === 0) return ok({ found: false, prestations: [] });
          return ok({ found: true, prestations: rows });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    saveUserPrestation: tool({
      description:
        "Mémorise un prix utilisé par l'artisan pour une prestation. Recalcule le prix_moyen, prix_min, prix_max, incrémente nb_utilisations.",
      inputSchema: z.object({
        libelle: z.string(),
        unite: z.string().optional(),
        prix: z.number(),
      }),
      execute: async ({ libelle, unite, prix }) => {
        try {
          const lib = libelle.trim();
          if (!lib) return err("libelle vide");
          const prixNum = safeNumber(prix, 0);

          const { data: existing, error: fetchErr } = await supabase
            .from("user_prestations")
            .select(
              "id, prix_moyen, prix_min, prix_max, nb_utilisations",
            )
            .eq("user_id", userId)
            .ilike("libelle", lib)
            .maybeSingle();
          if (fetchErr) return err(fetchErr.message);

          if (existing) {
            const nb = (existing.nb_utilisations ?? 0) + 1;
            const oldAvg = Number(existing.prix_moyen ?? prixNum);
            const oldCount = existing.nb_utilisations ?? 0;
            const newAvg = +(
              (oldAvg * oldCount + prixNum) /
              nb
            ).toFixed(2);
            const newMin = Math.min(
              Number(existing.prix_min ?? prixNum),
              prixNum,
            );
            const newMax = Math.max(
              Number(existing.prix_max ?? prixNum),
              prixNum,
            );
            const { error: updErr } = await supabase
              .from("user_prestations")
              .update({
                prix_moyen: newAvg,
                prix_min: newMin,
                prix_max: newMax,
                nb_utilisations: nb,
                last_used_at: new Date().toISOString(),
                unite: unite ?? null,
              })
              .eq("id", existing.id);
            if (updErr) return err(updErr.message);
            return ok({
              libelle: lib,
              prix_moyen: newAvg,
              prix_min: newMin,
              prix_max: newMax,
              nb_utilisations: nb,
            });
          }

          const { data: inserted, error: insErr } = await supabase
            .from("user_prestations")
            .insert({
              user_id: userId,
              libelle: lib,
              unite: unite ?? null,
              prix_moyen: prixNum,
              prix_min: prixNum,
              prix_max: prixNum,
              nb_utilisations: 1,
              last_used_at: new Date().toISOString(),
            })
            .select(
              "libelle, prix_moyen, prix_min, prix_max, nb_utilisations",
            )
            .single();
          if (insErr) return err(insErr.message);
          return ok({ ...inserted });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    sendQuote: tool({
      description:
        "Envoie le devis au client par email (avec PDF en pièce jointe). À appeler UNIQUEMENT après confirmation explicite de l'artisan via le récap OU shortcut 'envoie direct'. NE PAS appeler sans validation. Retourne { ok, messageId, signLink } ou { ok: false, error, missing? }.",
      inputSchema: z.object({
        quoteId: z.string(),
        customMessage: z
          .string()
          .optional()
          .describe(
            "Message personnalisé du corps du mail (sinon Émile en génère un standard).",
          ),
      }),
      execute: async ({ quoteId, customMessage }) => {
        try {
          const result = await executeSendQuote({
            supabase,
            userId,
            userEmail: userEmail ?? null,
            quoteId,
            customMessage,
            appUrl:
              appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://quovi.fr",
          });
          if (!result.ok) {
            console.error("[TOOL sendQuote] failed", {
              quoteId,
              error: result.error,
              missing: result.missing,
            });
            return {
              ok: false,
              error: result.error,
              ...(result.missing ? { missing: result.missing } : {}),
            };
          }
          return ok({
            success: true,
            messageId: result.messageId,
            signLink: result.signLink,
          });
        } catch (e) {
          console.error("[TOOL sendQuote] exception", e);
          return err((e as Error).message ?? "Envoi échoué");
        }
      },
    }),

    listClients: tool({
      description:
        "Liste les clients de l'artisan sans recherche, triés par date de création décroissante. Utile pour montrer ses clients existants sans filtre (ex: 'montre-moi mes 5 derniers clients').",
      inputSchema: z.object({
        limit: z.number().min(1).max(50).optional().default(10),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ limit, offset }) => {
        try {
          const lim = limit ?? 10;
          const off = offset ?? 0;
          const { data, error, count } = await supabase
            .from("clients")
            .select(
              "id, name, first_name, email, phone, type_client",
              { count: "exact" },
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .range(off, off + lim - 1);
          if (error) return err(error.message);
          return ok({ clients: data ?? [], total: count ?? 0 });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    getClientById: tool({
      description:
        "Récupère les détails complets d'un client par son id. Utile après findClient ou listClients pour avoir l'adresse, le SIRET, etc.",
      inputSchema: z.object({
        clientId: z.string().uuid(),
      }),
      execute: async ({ clientId }) => {
        try {
          const { data, error } = await supabase
            .from("clients")
            .select(
              "id, name, first_name, email, phone, address, postal_code, city, type_client, siret",
            )
            .eq("id", clientId)
            .eq("user_id", userId)
            .maybeSingle();
          if (error) return err(error.message);
          if (!data) return err("Client introuvable");
          return ok({ client: data });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    listQuotes: tool({
      description:
        "Liste les devis de l'artisan avec filtre optionnel par statut ou nom client. Utile pour 'où en est mon devis pour Dupont ?' ou 'combien de devis en cours ?'.",
      inputSchema: z.object({
        status: z
          .enum(["draft", "sent", "viewed", "signed", "all"])
          .optional()
          .default("all"),
        clientName: z.string().optional(),
        limit: z.number().min(1).max(50).optional().default(10),
      }),
      execute: async ({ status, clientName, limit }) => {
        try {
          const lim = limit ?? 10;
          const filter = status ?? "all";
          let query = supabase
            .from("quotes")
            .select(
              "id, number, status, total, created_at, sent_at, signed_at, viewed_at, client:clients(id, name, first_name)",
              { count: "exact" },
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(lim);
          if (filter !== "all") {
            query = query.eq("status", filter);
          }
          if (clientName && clientName.trim()) {
            // Apply name filter on the joined `clients` row. PostgREST
            // supports filtering on embedded resources via `clients.name`.
            const safe = escapePostgrestQuery(clientName);
            query = query.ilike("clients.name", `%${safe}%`);
          }
          const { data, error, count } = await query;
          if (error) return err(error.message);
          const quotes = (data ?? []).map((q) => {
            const c = (q as { client?: { name?: string; first_name?: string } })
              .client;
            const clientLabel = c
              ? c.first_name
                ? `${c.first_name} ${c.name ?? ""}`.trim()
                : (c.name ?? null)
              : null;
            return {
              id: q.id,
              number: q.number,
              status: q.status,
              total: q.total,
              client_name: clientLabel,
              created_at: q.created_at,
              sent_at: q.sent_at,
              signed_at: q.signed_at,
              viewed_at: q.viewed_at,
            };
          });
          return ok({ quotes, total: count ?? quotes.length });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),

    getQuoteStatus: tool({
      description:
        "Récupère le statut détaillé d'un devis avec timeline (créé, envoyé, vu, signé). Utile pour répondre à 'où en est le devis X ?'.",
      inputSchema: z.object({
        quoteId: z.string().uuid(),
      }),
      execute: async ({ quoteId }) => {
        try {
          const { data, error } = await supabase
            .from("quotes")
            .select(
              "id, number, status, total, created_at, sent_at, viewed_at, signed_at, sent_to_email, signature_data",
            )
            .eq("id", quoteId)
            .eq("user_id", userId)
            .maybeSingle();
          if (error) return err(error.message);
          if (!data) return err("Devis introuvable");
          const events: Array<{ event: string; date: string }> = [];
          if (data.created_at) events.push({ event: "created", date: data.created_at });
          if (data.sent_at) events.push({ event: "sent", date: data.sent_at });
          if (data.viewed_at) events.push({ event: "viewed", date: data.viewed_at });
          if (data.signed_at) events.push({ event: "signed", date: data.signed_at });
          return ok({
            quote: data,
            timeline: events,
          });
        } catch (e) {
          return err((e as Error).message ?? "Erreur inconnue");
        }
      },
    }),
  };
}

export type EmileTools = ReturnType<typeof createEmileTools>;
