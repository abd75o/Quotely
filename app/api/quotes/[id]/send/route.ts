import { NextRequest } from "next/server";
import { Resend } from "resend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*, client:clients(*), artisan:users(name, company, email)")
      .eq("id", id)
      .single();

    if (error || !quote) {
      return Response.json({ error: "Quote not found" }, { status: 404 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const signLink = `${origin}/devis/${quote.public_token}`;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const artisanName = quote.artisan?.company ?? quote.artisan?.name ?? "Votre prestataire";
      const clientName = quote.client?.name ?? "Client";
      const total = Number(quote.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

      await resend.emails.send({
        from: "Quotely <devis@quotely.fr>",
        to: quote.client?.email,
        subject: `Devis ${quote.number} — ${artisanName} (${total} €)`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 24px;">
            <div style="background: #6366F1; border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 32px;">
              <h1 style="color: white; font-size: 22px; margin: 0; font-weight: 700;">Votre devis est prêt</h1>
              <p style="color: #c7d2fe; margin: 8px 0 0; font-size: 15px;">${artisanName}</p>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 1.7;">Bonjour <strong>${clientName}</strong>,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.7;">
              <strong>${artisanName}</strong> vous a envoyé le devis <strong>${quote.number}</strong>
              d'un montant de <strong>${total} €</strong>.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.7;">
              Cliquez sur le bouton ci-dessous pour consulter et signer votre devis en ligne :
            </p>

            <div style="text-align: center; margin: 36px 0;">
              <a href="${signLink}"
                style="display: inline-block; background: #6366F1; color: white; text-decoration: none;
                       padding: 16px 36px; border-radius: 12px; font-weight: 700; font-size: 16px;">
                Voir et signer le devis →
              </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
              Ce lien est sécurisé et vous donne accès à votre devis sans compte.
              Valable jusqu'au ${new Date(quote.valid_until).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}.
            </p>

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 28px 0;" />
            <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
              Envoyé via <a href="https://quotely.fr" style="color: #6366F1;">Quotely</a> · Plateforme de devis pour professionnels
            </p>
          </div>`,
      });
    }

    // Mark as sent
    await supabase
      .from("quotes")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", id);

    return Response.json({ success: true, signLink });
  } catch {
    // Dev fallback — return the link without sending
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return Response.json({ success: true, signLink: `${origin}/devis/demo-token` });
  }
}
