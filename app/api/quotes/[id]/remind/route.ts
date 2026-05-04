import { NextRequest } from "next/server";
import { Resend } from "resend";

/**
 * POST /api/quotes/[id]/remind
 * Envoie un email de relance au client pour un devis en attente.
 * Réservé au plan Pro côté UI mais on ne re-vérifie pas ici (l'auth et
 * les RLS Supabase suffisent — le devis doit appartenir au user).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*, client:clients(name, email), artisan:profiles(company, telephone)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !quote) {
      return Response.json({ error: "Devis introuvable" }, { status: 404 });
    }
    if (quote.status !== "pending") {
      return Response.json({ error: "Ce devis n'est plus en attente." }, { status: 409 });
    }
    if (!quote.client?.email) {
      return Response.json({ error: "Email du client manquant." }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const signLink = `${origin}/devis/${quote.public_token}`;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const artisanName =
        quote.artisan?.company ?? user.user_metadata?.full_name ?? "Votre prestataire";
      const total = Number(quote.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
      const validUntil = new Date(quote.valid_until).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      await resend.emails.send({
        from: "Quovi <devis@quovi.fr>",
        to: quote.client.email,
        subject: `Rappel : devis ${quote.number} en attente — ${artisanName}`,
        html: `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 24px;">
            <div style="background: #FEF3C7; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 28px;">
              <h1 style="color: #92400E; font-size: 20px; margin: 0; font-weight: 700;">⏰ Petit rappel</h1>
              <p style="color: #B45309; margin: 6px 0 0; font-size: 14px;">Votre devis est toujours en attente de signature</p>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 1.7;">Bonjour <strong>${quote.client.name ?? "Client"}</strong>,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.7;">
              Petit rappel concernant le devis <strong>${quote.number}</strong>
              d'un montant de <strong>${total} €</strong> envoyé par <strong>${artisanName}</strong>.
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.7;">
              Vous pouvez le consulter et le signer en un clic :
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${signLink}"
                style="display: inline-block; background: #6366F1; color: white; text-decoration: none;
                       padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px;">
                Voir et signer le devis →
              </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
              Le devis est valable jusqu'au ${validUntil}.
            </p>

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              Envoyé via <a href="https://quovi.fr" style="color: #6366F1;">Quovi</a>
            </p>
          </div>`,
      });
    }

    return Response.json({ success: true, signLink });
  } catch (err) {
    console.error("[quotes/remind]", err);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
