import { NextRequest } from "next/server";
import { generateConfirmationToken, createYouSignProcedure, notifyArtisanSigned } from "@/lib/signature";
import { Resend } from "resend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: {
    signatureData?: string;
    signerName?: string;
    signerEmail?: string;
    accepted?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Fetch quote by public token
  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select("*, client:clients(*), artisan:users(name, company, email, phone, siret)")
    .eq("public_token", id)
    .eq("status", "pending")
    .single();

  if (fetchError || !quote) {
    return Response.json({ error: "Quote not found or already signed" }, { status: 404 });
  }

  const signatureType: string = quote.signature_type ?? "simple";

  // ── Simple (< 1 500 €) ─────────────────────────────────────────────────────
  if (signatureType === "simple") {
    if (!body.accepted) {
      return Response.json({ error: "acceptance required" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "signed",
        signature_data: body.signatureData ?? null,
        signed_at: new Date().toISOString(),
        signature_confirmed_at: new Date().toISOString(),
      })
      .eq("id", quote.id);

    if (updateError) {
      return Response.json({ error: "Failed to save signature" }, { status: 500 });
    }

    await generateInvoice(supabase, quote);
    await notifyArtisanIfPossible(quote);

    return Response.json({ success: true, type: "simple" });
  }

  // ── Email confirmed (1 500–5 000 €) ───────────────────────────────────────
  if (signatureType === "email_confirmed") {
    if (!body.signerEmail) {
      return Response.json({ error: "signerEmail required" }, { status: 400 });
    }

    const token = generateConfirmationToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    const { error: tokenError } = await supabase
      .from("quotes")
      .update({
        signature_data: body.signatureData ?? null,
        confirmation_token: token,
        confirmation_token_expires_at: expiresAt.toISOString(),
        confirmation_email: body.signerEmail,
      })
      .eq("id", quote.id);

    if (tokenError) {
      return Response.json({ error: "Failed to save token" }, { status: 500 });
    }

    await sendConfirmationEmail({
      to: body.signerEmail,
      token,
      quoteNumber: quote.number,
      artisanName: quote.artisan?.company ?? quote.artisan?.name ?? "votre artisan",
    });

    return Response.json({ success: true, type: "email_confirmed", requiresConfirmation: true });
  }

  // ── YouSign (> 5 000 €) ───────────────────────────────────────────────────
  if (signatureType === "yousign") {
    if (!body.signerEmail || !body.signerName) {
      return Response.json({ error: "signerEmail and signerName required" }, { status: 400 });
    }

    const origin = request.nextUrl.origin;
    const notifyUrl = `${origin}/api/quotes/${id}/sign/yousign-webhook`;

    try {
      const procedure = await createYouSignProcedure({
        quoteId: quote.id,
        quoteNumber: quote.number,
        pdfBase64: "", // TODO: generate PDF and pass base64 here
        clientName: body.signerName,
        clientEmail: body.signerEmail,
        totalEuros: quote.total,
        notifyUrl,
      });

      const { error: updateError } = await supabase
        .from("quotes")
        .update({
          signature_data: procedure.procedureId,
          yousign_procedure_id: procedure.procedureId,
        })
        .eq("id", quote.id);

      if (updateError) {
        return Response.json({ error: "Failed to save procedure" }, { status: 500 });
      }

      return Response.json({ success: true, type: "yousign", signingUrl: procedure.signingUrl });
    } catch (err) {
      console.error("YouSign error:", err);
      return Response.json({ error: "YouSign procedure creation failed" }, { status: 500 });
    }
  }

  return Response.json({ error: "Unknown signature type" }, { status: 400 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateInvoice(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  quote: { id: string; number: string; total: number; user_id?: string; userId?: string }
) {
  const year = new Date().getFullYear();
  const invoiceNumber = `FAC-${year}-${Date.now().toString().slice(-6)}`;

  await supabase.from("invoices").insert({
    quote_id: quote.id,
    user_id: quote.user_id ?? quote.userId,
    number: invoiceNumber,
    issued_at: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    total: quote.total,
  });
}

async function notifyArtisanIfPossible(quote: {
  artisan?: { email?: string; name?: string; company?: string } | null;
  client?: { name?: string } | null;
  number?: string;
  total?: number;
  id?: string;
}) {
  if (!quote.artisan?.email) return;

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://quotely.fr";
  await notifyArtisanSigned({
    artisanEmail: quote.artisan.email,
    artisanName: quote.artisan.company ?? quote.artisan.name ?? "Artisan",
    clientName: quote.client?.name ?? "Votre client",
    quoteNumber: quote.number ?? "",
    totalEuros: quote.total ?? 0,
    quoteUrl: `${origin}/dashboard/quotes/${quote.id}`,
  });
}

async function sendConfirmationEmail({
  to,
  token,
  quoteNumber,
  artisanName,
}: {
  to: string;
  token: string;
  quoteNumber: string;
  artisanName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const code = token.slice(0, 6).toUpperCase();

  await resend.emails.send({
    from: "Quotely <notifications@quotely.fr>",
    to,
    subject: `Code de confirmation — Devis ${quoteNumber}`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <div style="background: #6366F1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: white; font-size: 20px; margin: 0;">Confirmez votre signature</h1>
        </div>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Vous avez initié la signature du devis <strong>${quoteNumber}</strong> de <strong>${artisanName}</strong>.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Votre code de confirmation :
        </p>
        <div style="background: #F3F4F6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827;">${code}</span>
        </div>
        <p style="color: #6B7280; font-size: 14px;">
          Ce code expire dans 30 minutes. Si vous n'avez pas demandé cette signature, ignorez cet email.
        </p>
        <p style="color: #9CA3AF; font-size: 13px; margin-top: 24px;">
          Quotely · <a href="https://quotely.fr" style="color: #6366F1;">quotely.fr</a>
        </p>
      </div>
    `,
  });
}
