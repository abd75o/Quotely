import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RedirectDestination =
  | "sentinelle"
  | "chatbot_aide"
  | "parametres"
  | "stats"
  | "devis_list"
  | "clients_list";

export type ToolEvent =
  | {
      type: "embed";
      embed:
        | { kind: "client_selector" }
        | { kind: "client_full_list" }
        | {
            kind: "quick_choices";
            question?: string;
            choices: { label: string; value: string }[];
          }
        | {
            kind: "redirect";
            destination: RedirectDestination;
            label: string;
            reason: string;
            href: string;
          };
    }
  | { type: "preview_open"; quote: PreviewQuote }
  | { type: "preview_close" }
  | { type: "flash"; content: string };

export interface PreviewQuoteLine {
  id: string;
  label: string;
  price: number;
  quantity: number;
}

export interface PreviewQuote {
  id: string;
  number: string;
  status: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  date: string;
  validity: number;
  tva: number;
  lines: PreviewQuoteLine[];
  subtotal: number;
  total: number;
}

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
  emit: (event: ToolEvent) => void;
}

export interface ToolDefinition {
  name: string;
  schema: Anthropic.Tool;
  handler: (
    input: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newLineId(): string {
  return `l-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

function generateQuoteNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Date.now()).slice(-4);
  return `QTL-${year}-${seq}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface DbQuoteRow {
  id: string;
  number: string;
  status: string;
  items: unknown;
  tax_rate: number | string;
  subtotal: number | string;
  total: number | string;
  valid_until: string | null;
  created_at: string;
  client_id: string | null;
  clients?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

function toPreviewQuote(row: DbQuoteRow): PreviewQuote {
  const items = Array.isArray(row.items)
    ? (row.items as Array<{
        id?: string;
        label?: string;
        price?: number;
        quantity?: number;
      }>)
    : [];
  const lines: PreviewQuoteLine[] = items.map((it, idx) => ({
    id: String(it.id ?? `l${idx}`),
    label: String(it.label ?? ""),
    price: Number(it.price ?? 0),
    quantity: Number(it.quantity ?? 1),
  }));
  let validity = 30;
  if (row.valid_until) {
    const end = new Date(row.valid_until).getTime();
    const start = new Date(row.created_at).getTime();
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (days > 0) validity = days;
  }
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    client: row.clients
      ? {
          id: row.clients.id,
          name: row.clients.name,
          email: row.clients.email,
          phone: row.clients.phone,
        }
      : null,
    date: todayLabel(),
    validity,
    tva: Number(row.tax_rate),
    lines,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
  };
}

function computeTotals(
  lines: PreviewQuoteLine[],
  taxRate: number,
): { subtotal: number; tax_amount: number; total: number } {
  const subtotal = lines.reduce(
    (sum, l) => sum + Number(l.price) * Number(l.quantity || 1),
    0,
  );
  const tax_amount = +(subtotal * (taxRate / 100)).toFixed(2);
  const total = +(subtotal + tax_amount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), tax_amount, total };
}

// ─── Market prices (MVP — hardcodé) ──────────────────────────────────────────

interface MarketPrice {
  prestation: string;
  unit: string;
  min: number;
  max: number;
}

const MARKET_PRICES: MarketPrice[] = [
  { prestation: "carrelage",                unit: "€/m²",     min: 40,  max: 90 },
  { prestation: "peinture",                 unit: "€/m²",     min: 15,  max: 35 },
  { prestation: "plomberie pose lavabo",    unit: "€",        min: 200, max: 350 },
  { prestation: "électricité",              unit: "€/point",  min: 50,  max: 100 },
  { prestation: "placo",                    unit: "€/m²",     min: 25,  max: 45 },
  { prestation: "isolation",                unit: "€/m²",     min: 40,  max: 80 },
  { prestation: "toiture",                  unit: "€/m²",     min: 80,  max: 150 },
  { prestation: "maçonnerie",               unit: "€/m²",     min: 60,  max: 120 },
];

function findMarketPrice(keyword: string): MarketPrice | null {
  const k = keyword.toLowerCase();
  return (
    MARKET_PRICES.find((m) => m.prestation.toLowerCase().includes(k)) ?? null
  );
}

// ─── Redirect destinations ───────────────────────────────────────────────────

const REDIRECT_TARGETS: Record<
  RedirectDestination,
  { label: string; href: string }
> = {
  sentinelle:    { label: "Ouvrir La Sentinelle",          href: "/dashboard/equipe/sentinelle" },
  chatbot_aide:  { label: "Ouvrir le ChatBot d'aide",       href: "/dashboard" },
  parametres:    { label: "Ouvrir les Paramètres",          href: "/dashboard/parametres" },
  stats:         { label: "Voir les Statistiques",          href: "/dashboard/stats" },
  devis_list:    { label: "Voir mes Devis",                 href: "/dashboard/quotes" },
  clients_list:  { label: "Voir mes Clients",               href: "/dashboard/clients" },
};

// ─── Tool definitions ────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ── CLIENTS ───────────────────────────────────────────────────────────────

  {
    name: "search_clients",
    schema: {
      name: "search_clients",
      description:
        "Cherche les clients de l'utilisateur dont le nom contient le query (insensible à la casse). Retourne max 10 résultats.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Mot-clé à chercher dans le nom" },
        },
        required: ["query"],
      },
    },
    handler: async (input, { supabase, userId }) => {
      const q = String(input.query ?? "").trim();
      if (!q) return JSON.stringify({ error: "query manquant" });
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, phone, address")
        .eq("user_id", userId)
        .ilike("name", `%${q}%`)
        .limit(10);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ clients: data ?? [] });
    },
  },

  {
    name: "get_client",
    schema: {
      name: "get_client",
      description: "Récupère toutes les infos d'un client à partir de son id.",
      input_schema: {
        type: "object" as const,
        properties: {
          client_id: { type: "string", description: "UUID du client" },
        },
        required: ["client_id"],
      },
    },
    handler: async (input, { supabase, userId }) => {
      const id = String(input.client_id ?? "");
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, phone, address, created_at")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return JSON.stringify({ error: error.message });
      if (!data) return JSON.stringify({ error: "Client introuvable" });
      return JSON.stringify({ client: data });
    },
  },

  {
    name: "create_client",
    schema: {
      name: "create_client",
      description:
        "Crée un nouveau client lié à l'utilisateur. Retourne le client créé.",
      input_schema: {
        type: "object" as const,
        properties: {
          name:  { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          type:  { type: "string", enum: ["particulier", "professionnel"] },
        },
        required: ["name"],
      },
    },
    handler: async (input, { supabase, userId }) => {
      const name = String(input.name ?? "").trim();
      if (!name) return JSON.stringify({ error: "Nom requis" });
      const payload = {
        user_id: userId,
        name,
        email: input.email ? String(input.email) : null,
        phone: input.phone ? String(input.phone) : null,
      };
      const { data, error } = await supabase
        .from("clients")
        .insert(payload)
        .select("id, name, email, phone")
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ client: data });
    },
  },

  {
    name: "get_recent_clients",
    schema: {
      name: "get_recent_clients",
      description:
        "Renvoie les 3 derniers clients de l'utilisateur (par ordre de création décroissant).",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    handler: async (_input, { supabase, userId }) => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, phone")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ clients: data ?? [] });
    },
  },

  // ── DEVIS ─────────────────────────────────────────────────────────────────

  {
    name: "create_quote_draft",
    schema: {
      name: "create_quote_draft",
      description:
        "Crée un brouillon de devis (status='draft') pour le client donné, avec les lignes et la TVA. Retourne l'id et les totaux.",
      input_schema: {
        type: "object" as const,
        properties: {
          client_id: { type: "string", description: "UUID du client" },
          tva: {
            type: "number",
            description:
              "Taux de TVA en pourcentage (5.5, 10 ou 20 généralement)",
          },
          valid_days: {
            type: "number",
            description: "Validité du devis en jours (défaut: 30)",
          },
          lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label:    { type: "string" },
                price:    { type: "number", description: "Prix HT par unité" },
                quantity: { type: "number", description: "Quantité (défaut: 1)" },
              },
              required: ["label", "price"],
            },
          },
        },
        required: ["client_id", "lines", "tva"],
      },
    },
    handler: async (input, { supabase, userId }) => {
      const clientId = String(input.client_id ?? "");
      const taxRate = Number(input.tva ?? 20);
      const validDays = Number(input.valid_days ?? 30);
      const rawLines = Array.isArray(input.lines)
        ? (input.lines as Array<{
            label?: string;
            price?: number;
            quantity?: number;
          }>)
        : [];
      const lines: PreviewQuoteLine[] = rawLines.map((l) => ({
        id: newLineId(),
        label: String(l.label ?? ""),
        price: Number(l.price ?? 0),
        quantity: Number(l.quantity ?? 1),
      }));
      const totals = computeTotals(lines, taxRate);
      const validUntil = new Date(
        Date.now() + validDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await supabase
        .from("quotes")
        .insert({
          user_id: userId,
          client_id: clientId,
          number: generateQuoteNumber(),
          status: "draft",
          items: lines,
          tax_rate: taxRate,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_amount,
          total: totals.total,
          valid_until: validUntil,
        })
        .select("id, number, status, total")
        .single();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ quote: data });
    },
  },

  {
    name: "update_quote",
    schema: {
      name: "update_quote",
      description:
        "Modifie un champ simple d'un devis (notes, valid_until, tax_rate). Pour les lignes, utilise add_quote_line / remove_quote_line.",
      input_schema: {
        type: "object" as const,
        properties: {
          quote_id: { type: "string" },
          field: {
            type: "string",
            enum: ["notes", "valid_until", "tax_rate"],
          },
          value: { type: "string" },
        },
        required: ["quote_id", "field", "value"],
      },
    },
    handler: async (input, { supabase, userId }) => {
      const quoteId = String(input.quote_id ?? "");
      const field = String(input.field ?? "");
      const valueRaw = input.value;
      const allowed = ["notes", "valid_until", "tax_rate"] as const;
      if (!allowed.includes(field as (typeof allowed)[number])) {
        return JSON.stringify({ error: `Champ non modifiable: ${field}` });
      }
      const update: Record<string, unknown> = {};
      if (field === "tax_rate") update[field] = Number(valueRaw);
      else update[field] = valueRaw;

      const { error } = await supabase
        .from("quotes")
        .update(update)
        .eq("id", quoteId)
        .eq("user_id", userId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ ok: true });
    },
  },

  {
    name: "add_quote_line",
    schema: {
      name: "add_quote_line",
      description: "Ajoute une ligne à un devis existant.",
      input_schema: {
        type: "object" as const,
        properties: {
          quote_id: { type: "string" },
          label:    { type: "string" },
          price:    { type: "number" },
          quantity: { type: "number" },
        },
        required: ["quote_id", "label", "price"],
      },
    },
    handler: async (input, { supabase, userId }) => {
      const quoteId = String(input.quote_id ?? "");
      const { data: existing, error: fetchErr } = await supabase
        .from("quotes")
        .select("items, tax_rate")
        .eq("id", quoteId)
        .eq("user_id", userId)
        .maybeSingle();
      if (fetchErr) return JSON.stringify({ error: fetchErr.message });
      if (!existing) return JSON.stringify({ error: "Devis introuvable" });

      const items = Array.isArray(existing.items)
        ? (existing.items as PreviewQuoteLine[])
        : [];
      const newLine: PreviewQuoteLine = {
        id: newLineId(),
        label: String(input.label ?? ""),
        price: Number(input.price ?? 0),
        quantity: Number(input.quantity ?? 1),
      };
      const updatedLines = [...items, newLine];
      const totals = computeTotals(updatedLines, Number(existing.tax_rate));

      const { error } = await supabase
        .from("quotes")
        .update({
          items: updatedLines,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_amount,
          total: totals.total,
        })
        .eq("id", quoteId)
        .eq("user_id", userId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ ok: true, line: newLine, total: totals.total });
    },
  },

  {
    name: "remove_quote_line",
    schema: {
      name: "remove_quote_line",
      description: "Supprime une ligne d'un devis par son id.",
      input_schema: {
        type: "object" as const,
        properties: {
          quote_id: { type: "string" },
          line_id:  { type: "string" },
        },
        required: ["quote_id", "line_id"],
      },
    },
    handler: async (input, { supabase, userId }) => {
      const quoteId = String(input.quote_id ?? "");
      const lineId = String(input.line_id ?? "");
      const { data: existing, error: fetchErr } = await supabase
        .from("quotes")
        .select("items, tax_rate")
        .eq("id", quoteId)
        .eq("user_id", userId)
        .maybeSingle();
      if (fetchErr) return JSON.stringify({ error: fetchErr.message });
      if (!existing) return JSON.stringify({ error: "Devis introuvable" });

      const items = Array.isArray(existing.items)
        ? (existing.items as PreviewQuoteLine[])
        : [];
      const updatedLines = items.filter((l) => l.id !== lineId);
      const totals = computeTotals(updatedLines, Number(existing.tax_rate));

      const { error } = await supabase
        .from("quotes")
        .update({
          items: updatedLines,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_amount,
          total: totals.total,
        })
        .eq("id", quoteId)
        .eq("user_id", userId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ ok: true, total: totals.total });
    },
  },

  {
    name: "validate_quote",
    schema: {
      name: "validate_quote",
      description:
        "Passe le devis en 'pending' (validé, prêt à être envoyé), lock l'édition.",
      input_schema: {
        type: "object" as const,
        properties: { quote_id: { type: "string" } },
        required: ["quote_id"],
      },
    },
    handler: async (input, { supabase, userId }) => {
      const quoteId = String(input.quote_id ?? "");
      const { error } = await supabase
        .from("quotes")
        .update({ status: "pending" })
        .eq("id", quoteId)
        .eq("user_id", userId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ ok: true, status: "pending" });
    },
  },

  {
    name: "send_quote",
    schema: {
      name: "send_quote",
      description:
        "Envoie le devis au client par e-mail (placeholder MVP : marque le devis comme envoyé). Retourne success.",
      input_schema: {
        type: "object" as const,
        properties: { quote_id: { type: "string" } },
        required: ["quote_id"],
      },
    },
    handler: async (input, { supabase, userId }) => {
      const quoteId = String(input.quote_id ?? "");
      const token =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "")
          : Math.random().toString(36).slice(2);
      const { error } = await supabase
        .from("quotes")
        .update({ status: "pending", public_token: token })
        .eq("id", quoteId)
        .eq("user_id", userId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true });
    },
  },

  // ── CONTEXTE ──────────────────────────────────────────────────────────────

  {
    name: "get_user_profile",
    schema: {
      name: "get_user_profile",
      description:
        "Récupère le profil de l'utilisateur (SIRET, raison sociale, IBAN, métier, etc.).",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    handler: async (_input, { supabase, userId }) => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "metier, company, company_name, siret, vat_status, vat_number, iban, bic, address, postal_code, city, plan",
        )
        .eq("id", userId)
        .maybeSingle();
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ profile: data ?? {} });
    },
  },

  {
    name: "get_market_prices",
    schema: {
      name: "get_market_prices",
      description:
        "Renvoie une fourchette indicative de prix marché pour une prestation (peinture, carrelage, plomberie, etc.).",
      input_schema: {
        type: "object" as const,
        properties: {
          prestation_keyword: { type: "string" },
          region: { type: "string", description: "Région (ignoré au MVP)" },
        },
        required: ["prestation_keyword"],
      },
    },
    handler: async (input) => {
      const keyword = String(input.prestation_keyword ?? "");
      const found = findMarketPrice(keyword);
      if (!found) {
        return JSON.stringify({
          info: `Pas de fourchette connue pour '${keyword}'. Demande à l'utilisateur son tarif habituel.`,
          known_prestations: MARKET_PRICES.map((m) => m.prestation),
        });
      }
      return JSON.stringify({
        prestation: found.prestation,
        unit: found.unit,
        min: found.min,
        max: found.max,
      });
    },
  },

  // ── UI ────────────────────────────────────────────────────────────────────

  {
    name: "show_client_selector",
    schema: {
      name: "show_client_selector",
      description:
        "Affiche dans le chat un sélecteur des 3 clients récents + bouton 'Afficher plus' + 'Nouveau client'. À utiliser quand tu veux que l'utilisateur choisisse un client.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    handler: async (_input, { emit }) => {
      emit({ type: "embed", embed: { kind: "client_selector" } });
      return JSON.stringify({ ok: true });
    },
  },

  {
    name: "show_quick_choices",
    schema: {
      name: "show_quick_choices",
      description:
        "Affiche dans le chat un set de boutons cliquables pour une question fermée (max 4 choix).",
      input_schema: {
        type: "object" as const,
        properties: {
          question: { type: "string" },
          choices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
              },
              required: ["label", "value"],
            },
            minItems: 2,
            maxItems: 4,
          },
        },
        required: ["choices"],
      },
    },
    handler: async (input, { emit }) => {
      const rawChoices = Array.isArray(input.choices)
        ? (input.choices as Array<{ label?: string; value?: string }>)
        : [];
      const choices = rawChoices
        .map((c) => ({
          label: String(c.label ?? ""),
          value: String(c.value ?? c.label ?? ""),
        }))
        .filter((c) => c.label.length > 0)
        .slice(0, 4);
      if (choices.length < 2) {
        return JSON.stringify({ error: "Au moins 2 choix requis" });
      }
      emit({
        type: "embed",
        embed: {
          kind: "quick_choices",
          question: input.question ? String(input.question) : undefined,
          choices,
        },
      });
      return JSON.stringify({ ok: true });
    },
  },

  {
    name: "open_quote_preview",
    schema: {
      name: "open_quote_preview",
      description:
        "Ouvre le panneau preview de devis à droite avec le devis indiqué. À appeler juste après create_quote_draft.",
      input_schema: {
        type: "object" as const,
        properties: { quote_id: { type: "string" } },
        required: ["quote_id"],
      },
    },
    handler: async (input, { supabase, userId, emit }) => {
      const quoteId = String(input.quote_id ?? "");
      const { data, error } = await supabase
        .from("quotes")
        .select(
          "id, number, status, items, tax_rate, subtotal, total, valid_until, created_at, client_id, clients(id, name, email, phone)",
        )
        .eq("id", quoteId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return JSON.stringify({ error: error.message });
      if (!data) return JSON.stringify({ error: "Devis introuvable" });
      const row = data as unknown as DbQuoteRow;
      const quote = toPreviewQuote(row);
      emit({ type: "preview_open", quote });
      return JSON.stringify({ ok: true, quote_id: quote.id });
    },
  },

  {
    name: "close_quote_preview",
    schema: {
      name: "close_quote_preview",
      description: "Ferme le panneau preview de devis à droite.",
      input_schema: { type: "object" as const, properties: {}, required: [] },
    },
    handler: async (_input, { emit }) => {
      emit({ type: "preview_close" });
      return JSON.stringify({ ok: true });
    },
  },

  // ── GARDE-FOU ─────────────────────────────────────────────────────────────

  {
    name: "redirect_to_other_agent",
    schema: {
      name: "redirect_to_other_agent",
      description:
        "Affiche un bouton cliquable qui amène vers l'agent ou la page appropriée. À utiliser dès que la demande sort du périmètre du Rédacteur.",
      input_schema: {
        type: "object" as const,
        properties: {
          destination: {
            type: "string",
            enum: [
              "sentinelle",
              "chatbot_aide",
              "parametres",
              "stats",
              "devis_list",
              "clients_list",
            ],
          },
          reason: { type: "string", description: "Pourquoi tu rediriges" },
        },
        required: ["destination", "reason"],
      },
    },
    handler: async (input, { emit }) => {
      const dest = String(input.destination ?? "") as RedirectDestination;
      const reason = String(input.reason ?? "");
      const target = REDIRECT_TARGETS[dest];
      if (!target) {
        return JSON.stringify({ error: `Destination inconnue: ${dest}` });
      }
      emit({
        type: "embed",
        embed: {
          kind: "redirect",
          destination: dest,
          label: target.label,
          reason,
          href: target.href,
        },
      });
      return JSON.stringify({ ok: true });
    },
  },
];

export const TOOL_SCHEMAS: Anthropic.Tool[] = TOOL_DEFINITIONS.map(
  (t) => t.schema,
);

export const TOOLS_BY_NAME: Record<string, ToolDefinition> = Object.fromEntries(
  TOOL_DEFINITIONS.map((t) => [t.name, t]),
);
