import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { nextQuoteNumber, bumpQuoteNumber } from "@/lib/quotes/numbering";
import {
  computeQuoteTotals,
  normalizeFrTva,
  normalizeQuoteItem,
  type QuoteItem,
} from "@/lib/quotes/items";
import { autoTitleConversation } from "@/lib/conversations/auto-title";

export const runtime = "nodejs";

/**
 * POST /api/quotes/bulk-lines — ingest a batch of pre-parsed lines.
 *
 * Three modes (selected by the client BEFORE posting, defaults to "append"):
 *   - "append"  : add to the resolved quote (existing behaviour). If no quote
 *                 resolves (no quoteId, no conv link), a fresh draft is
 *                 created and the lines are written into it.
 *   - "replace" : overwrite the items on the resolved quote. Refuses to run
 *                 on a quote already past "draft" — we don't silently rewrite
 *                 sent/signed devis. Always requires a resolved quote.
 *   - "new"     : ignore any resolved quote and create a fresh draft, even
 *                 when one is linked to the conversation. The conversation's
 *                 related_quote_id is re-pointed to the new draft.
 *
 * This endpoint exists so the front-end can ingest a long paste (the
 * BulkImportModal opens automatically past 25 lines) without round-tripping
 * through the LLM. Sonnet would otherwise spend ~10k output tokens and 30-60s
 * just regurgitating the lines into a tool call — that's the wrong tool for
 * the job. We keep the LLM in the loop via a [SYSTEM] notification message
 * after the insert so it can pick up the conversation with full context.
 */

const LineSchema = z.object({
  label: z.string().min(1, "label vide").max(500),
  quantity: z.number().positive(),
  unite: z.string().max(20).optional().nullable(),
  price: z.number().nonnegative(),
  tva: z.number().min(0).max(100),
});

const BodySchema = z.object({
  quoteId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  lines: z.array(LineSchema).min(1).max(500),
  // Optional, defaults to "append" so existing callers (none other than the
  // modal today, but defensive) keep their behaviour.
  mode: z.enum(["append", "replace", "new"]).optional().default("append"),
});

type Line = z.infer<typeof LineSchema>;

function toQuoteItems(lines: Line[], startIdx: number): QuoteItem[] {
  return lines.map((l, i) => {
    // Snap the rate at the API boundary so a stray 21 / 19.6 from the
    // modal (the dropdown is restricted but a paste-and-edit could slip
    // through) never reaches the JSONB column. normalizeQuoteItem snaps
    // again as a defence-in-depth.
    const safeTva = normalizeFrTva(l.tva, 20);
    return normalizeQuoteItem(
      {
        label: l.label,
        quantity: l.quantity,
        unite: l.unite,
        price: l.price,
        tva: safeTva,
      },
      startIdx + i,
      safeTva,
    );
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 422 },
    );
  }
  const { quoteId, conversationId, clientId, lines, mode } = parsed.data;

  // "new" mode skips quote resolution entirely — even if the conv has a
  // linked draft, we create a fresh one and re-point the conversation.
  // Otherwise resolve target the same way as saveQuoteDraft: explicit
  // quoteId > conversation.related_quote_id > none.
  //
  // We also pull the conversation's related_client_id so the freshly
  // created draft inherits the client the user has been talking about.
  // Without this, mode="new" produced "Client non défini" devis even when
  // the conversation clearly had a selected client (the reported bug).
  let targetQuoteId: string | null = null;
  let convClientId: string | null = null;
  if (conversationId) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("related_quote_id, related_client_id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (conv) {
      if (mode !== "new" && !quoteId && conv.related_quote_id) {
        targetQuoteId = conv.related_quote_id as string;
      }
      convClientId = (conv.related_client_id as string | null) ?? null;
    }
  }
  if (mode !== "new" && quoteId) {
    targetQuoteId = quoteId;
  }
  const effectiveClientId = clientId ?? convClientId;

  // ─── Append / replace path ───────────────────────────────────────────────
  if (targetQuoteId) {
    const { data: existing, error: fetchErr } = await supabase
      .from("quotes")
      .select("id, items, status")
      .eq("id", targetQuoteId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fetchErr) {
      return Response.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing) {
      return Response.json({ error: "Quote not found" }, { status: 404 });
    }

    // Replace is destructive — refuse on anything other than a draft so a
    // signed devis can never get silently rewritten under the user's nose.
    const isDraft =
      !existing.status || existing.status === "draft";
    if (mode === "replace" && !isDraft) {
      return Response.json(
        {
          error:
            "Impossible de remplacer les lignes d'un devis déjà envoyé ou signé. Crée un nouveau devis à la place.",
          quoteStatus: existing.status,
        },
        { status: 422 },
      );
    }

    const existingItems = Array.isArray(existing.items)
      ? (existing.items as QuoteItem[])
      : [];

    const baseItems = mode === "replace" ? [] : existingItems;
    // Enforce the 500-line ceiling against the FINAL set so a user can't
    // paste 400 lines into a quote that already has 200 (append) — but a
    // replace only counts the new lines.
    if (baseItems.length + lines.length > 500) {
      return Response.json(
        {
          error: `Cap dépassé : devis aurait ${baseItems.length + lines.length} lignes (max 500).`,
        },
        { status: 422 },
      );
    }

    const newItems = toQuoteItems(lines, baseItems.length);
    const finalItems =
      mode === "replace" ? newItems : [...baseItems, ...newItems];
    const totals = computeQuoteTotals(finalItems);

    const { data: updated, error: updErr } = await supabase
      .from("quotes")
      .update({
        items: finalItems,
        subtotal: totals.subtotal,
        tax_rate: totals.taxRate,
        tax_amount: totals.taxAmount,
        tax_breakdown: totals.taxBreakdown,
        total: totals.total,
        // Only overwrite client_id on append/replace when the caller explicitly
        // passed one. The conversation's related_client_id is a fallback for
        // the create path; on an existing quote we don't want to silently
        // overwrite a client the user may have already linked.
        ...(clientId ? { client_id: clientId } : {}),
      })
      .eq("id", targetQuoteId)
      .eq("user_id", user.id)
      .select("id, number, client_id, items, subtotal, tax_rate, tax_amount, total")
      .single();
    if (updErr) {
      return Response.json({ error: updErr.message }, { status: 500 });
    }

    // Title the conversation now that we have meaningful content. We pass the
    // FIRST imported line as fallback prestation; the helper skips placeholder
    // labels anyway. On a replace, this is the first NEW line — exactly what
    // the user just typed.
    await autoTitleConversation(supabase, conversationId, {
      clientId:
        clientId ?? (updated.client_id as string | null) ?? convClientId,
      fallbackPrestation: newItems[0]?.label ?? null,
      fallbackNumber: updated.number as string,
    });

    return Response.json({
      quote: updated,
      items: finalItems,
      addedCount: newItems.length,
      totalLines: finalItems.length,
      mode,
    });
  }

  // ─── Create-and-insert path ──────────────────────────────────────────────
  // Reached when mode === "new", or when no quote could be resolved (no
  // quoteId + no conv link + empty append).
  if (mode === "replace") {
    // Replace without a target makes no semantic sense — surface it clearly
    // instead of silently creating a new draft.
    return Response.json(
      { error: "Aucun devis cible pour le mode 'replace'." },
      { status: 422 },
    );
  }

  const newItems = toQuoteItems(lines, 0);
  const totals = computeQuoteTotals(newItems);
  // 90-day default validity matches saveQuoteDraft.
  const validUntil = new Date(
    Date.now() + 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  let candidateNumber = await nextQuoteNumber(supabase, user.id);
  let created: { id: string; number: string } | null = null;
  let lastErr: { message: string; code?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await supabase
      .from("quotes")
      .insert({
        user_id: user.id,
        // Inherit the conversation's client when the caller didn't pass one
        // explicitly. Otherwise the new draft would land in /devis with no
        // client attached — the bug this fix addresses.
        client_id: effectiveClientId,
        number: candidateNumber,
        status: "draft",
        items: newItems,
        subtotal: totals.subtotal,
        tax_rate: totals.taxRate,
        tax_amount: totals.taxAmount,
        tax_breakdown: totals.taxBreakdown,
        total: totals.total,
        valid_until: validUntil,
      })
      .select("id, number")
      .single();
    if (!res.error) {
      created = res.data;
      break;
    }
    lastErr = res.error as { message: string; code?: string };
    if (lastErr.code === "23505") {
      candidateNumber = bumpQuoteNumber(candidateNumber);
      continue;
    }
    break;
  }
  if (!created) {
    return Response.json(
      { error: lastErr?.message ?? "Erreur enregistrement devis" },
      { status: 500 },
    );
  }

  // Pull the linked client so the response can populate the right-panel
  // preview synchronously. Without it, mode="new" imports landed in the UI
  // as "Aucun client sélectionné" even though the row had client_id set —
  // the panel refreshed only on the next conversation reload.
  let clientSnapshot: {
    id: string;
    name: string;
    first_name: string | null;
    email: string | null;
    phone: string | null;
  } | null = null;
  if (effectiveClientId) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id, name, first_name, email, phone")
      .eq("id", effectiveClientId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (clientRow) {
      clientSnapshot = {
        id: clientRow.id as string,
        name: (clientRow.name as string) ?? "",
        first_name: (clientRow.first_name as string | null) ?? null,
        email: (clientRow.email as string | null) ?? null,
        phone: (clientRow.phone as string | null) ?? null,
      };
    }
  }

  if (conversationId) {
    // For mode="new" this overwrites any previous related_quote_id — exactly
    // what the user asked for ("crée un nouveau devis", the conv now points
    // at the new draft). We only write related_client_id when the caller
    // passed one explicitly: convClientId already lives on the conversation,
    // re-writing it would be a no-op at best and could clobber a concurrent
    // update at worst.
    await supabase
      .from("conversations")
      .update({
        related_quote_id: created.id,
        ...(clientId ? { related_client_id: clientId } : {}),
      })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    await autoTitleConversation(supabase, conversationId, {
      clientId: effectiveClientId,
      fallbackPrestation: newItems[0]?.label ?? null,
      fallbackNumber: created.number,
      // When the user explicitly asked for a NEW devis, force re-titling
      // even if the previous title was clean — the new draft's content
      // should drive the new title.
      force: mode === "new",
    });
  }

  return Response.json({
    quote: {
      id: created.id,
      number: created.number,
      client_id: effectiveClientId,
      client: clientSnapshot,
      items: newItems,
      subtotal: totals.subtotal,
      tax_rate: totals.taxRate,
      tax_amount: totals.taxAmount,
      total: totals.total,
    },
    items: newItems,
    addedCount: newItems.length,
    totalLines: newItems.length,
    mode,
  });
}
