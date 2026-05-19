import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { nextQuoteNumber, bumpQuoteNumber } from "@/lib/quotes/numbering";

export const runtime = "nodejs";

/**
 * POST /api/quotes/bulk-lines — append a batch of pre-parsed lines to a quote.
 *
 * Two modes:
 *   1. `quoteId` provided → append to that quote (auth-scoped to user_id).
 *   2. `quoteId` omitted  → create a new draft and append. If `conversationId`
 *      is given, link the new draft back so Émile sees it in subsequent turns.
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
});

type Line = z.infer<typeof LineSchema>;

interface QuoteItem {
  id: string;
  label: string;
  price: number;
  quantity: number;
  unite: string | null;
  tva: number;
}

function mintLineId(idx: number): string {
  return `l-${Date.now().toString(36)}-${idx}-${Math.floor(Math.random() * 1000)}`;
}

function toQuoteItems(lines: Line[], startIdx: number): QuoteItem[] {
  return lines.map((l, i) => ({
    id: mintLineId(startIdx + i),
    label: l.label,
    price: l.price,
    quantity: l.quantity,
    unite: l.unite ?? null,
    tva: l.tva,
  }));
}

/**
 * Multi-TVA aware totals. Same algorithm as saveQuoteDraft (lib/emile/tools.ts)
 * so a quote enriched via bulk import looks identical to one produced by the
 * tool: per-rate breakdown for the PDF, dominant rate exposed as the scalar
 * tax_rate column for legacy consumers.
 */
function computeTotals(items: QuoteItem[]) {
  const subtotal = +items
    .reduce((s, it) => s + it.price * it.quantity, 0)
    .toFixed(2);

  const breakdown: Record<string, { base: number; tax: number; ttc: number }> =
    {};
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
  let taxRate = 20;
  let dominantBase = -1;
  for (const [rate, b] of Object.entries(breakdown)) {
    if (b.base > dominantBase) {
      dominantBase = b.base;
      taxRate = Number(rate);
    }
  }
  return { subtotal, breakdown, taxAmount, total, taxRate };
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
  const { quoteId, conversationId, clientId, lines } = parsed.data;

  // Resolve target quote: explicit quoteId > conversation.related_quote_id >
  // create a new draft. Same precedence as the saveQuoteDraft tool — keeps
  // behaviour consistent between LLM-driven and UI-driven paths.
  let targetQuoteId = quoteId ?? null;
  if (!targetQuoteId && conversationId) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("related_quote_id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (conv?.related_quote_id) {
      targetQuoteId = conv.related_quote_id as string;
    }
  }

  // ─── Append path ─────────────────────────────────────────────────────────
  if (targetQuoteId) {
    const { data: existing, error: fetchErr } = await supabase
      .from("quotes")
      .select("id, items")
      .eq("id", targetQuoteId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fetchErr) {
      return Response.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!existing) {
      return Response.json({ error: "Quote not found" }, { status: 404 });
    }

    const existingItems = Array.isArray(existing.items)
      ? (existing.items as QuoteItem[])
      : [];

    // Enforce the 500-line ceiling against the COMBINED set so a user can't
    // paste 400 lines into a quote that already has 200.
    if (existingItems.length + lines.length > 500) {
      return Response.json(
        {
          error: `Cap dépassé : devis aurait ${existingItems.length + lines.length} lignes (max 500).`,
        },
        { status: 422 },
      );
    }

    const newItems = toQuoteItems(lines, existingItems.length);
    const merged = [...existingItems, ...newItems];
    const totals = computeTotals(merged);

    const { data: updated, error: updErr } = await supabase
      .from("quotes")
      .update({
        items: merged,
        subtotal: totals.subtotal,
        tax_rate: totals.taxRate,
        tax_amount: totals.taxAmount,
        tax_breakdown: totals.breakdown,
        total: totals.total,
        ...(clientId ? { client_id: clientId } : {}),
      })
      .eq("id", targetQuoteId)
      .eq("user_id", user.id)
      .select("id, number, items, subtotal, tax_rate, tax_amount, total")
      .single();
    if (updErr) {
      return Response.json({ error: updErr.message }, { status: 500 });
    }

    return Response.json({
      quote: updated,
      addedCount: newItems.length,
      totalLines: merged.length,
    });
  }

  // ─── Create-and-insert path ──────────────────────────────────────────────
  const newItems = toQuoteItems(lines, 0);
  const totals = computeTotals(newItems);
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
        client_id: clientId ?? null,
        number: candidateNumber,
        status: "draft",
        items: newItems,
        subtotal: totals.subtotal,
        tax_rate: totals.taxRate,
        tax_amount: totals.taxAmount,
        tax_breakdown: totals.breakdown,
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

  if (conversationId) {
    await supabase
      .from("conversations")
      .update({ related_quote_id: created.id })
      .eq("id", conversationId)
      .eq("user_id", user.id);
  }

  return Response.json({
    quote: {
      id: created.id,
      number: created.number,
      items: newItems,
      subtotal: totals.subtotal,
      tax_rate: totals.taxRate,
      tax_amount: totals.taxAmount,
      total: totals.total,
    },
    addedCount: newItems.length,
    totalLines: newItems.length,
  });
}
