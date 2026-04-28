import { NextRequest } from "next/server";
import { Resend } from "resend";

// Called by a cron job or Supabase webhook at J+12 of trial
export async function POST(request: NextRequest) {
  // Verify secret to prevent abuse
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Find users whose trial ends in ~2 days and haven't been reminded
    const soon = new Date(Date.now() + 2 * 86400_000).toISOString();
    const now = new Date().toISOString();

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, company")
      .lt("trial_ends_at", soon)
      .gt("trial_ends_at", now)
      .eq("reminder_sent", false);

    if (!profiles?.length) {
      return Response.json({ sent: 0 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    let sent = 0;

    for (const profile of profiles) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const firstName = authUser?.user?.user_metadata?.full_name?.split(" ")[0] ?? "vous";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://quotely.fr";

      await resend.emails.send({
        from: "Quotely <bonjour@quotely.fr>",
        to: email,
        subject: "Plus que 2 jours d'essai Pro — choisissez votre plan",
        html: `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
            <div style="background: #6366F1; border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 32px;">
              <h1 style="color: white; font-size: 22px; margin: 0; font-weight: 700;">Votre essai Pro se termine bientôt</h1>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 1.7;">
              Bonjour <strong>${firstName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.7;">
              Il vous reste <strong>2 jours</strong> sur votre essai gratuit Pro de Quotely.
              Pour continuer à profiter de la génération IA, des signatures certifiées et des devis illimités,
              choisissez votre plan maintenant.
            </p>

            <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <div>
                  <p style="font-weight: 700; color: #111827; margin: 0;">Starter</p>
                  <p style="color: #6B7280; font-size: 14px; margin: 4px 0 0;">30 devis/mois</p>
                </div>
                <p style="font-size: 20px; font-weight: 800; color: #6366F1; margin: 0;">25€<span style="font-size: 13px; font-weight: 500; color: #6B7280;">/mois</span></p>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <div>
                  <p style="font-weight: 700; color: #111827; margin: 0;">Pro</p>
                  <p style="color: #6B7280; font-size: 14px; margin: 4px 0 0;">Devis illimités + IA</p>
                </div>
                <p style="font-size: 20px; font-weight: 800; color: #6366F1; margin: 0;">49€<span style="font-size: 13px; font-weight: 500; color: #6B7280;">/mois</span></p>
              </div>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${appUrl}/dashboard/settings/billing"
                style="display: inline-block; background: #6366F1; color: white; text-decoration: none;
                       padding: 16px 36px; border-radius: 12px; font-weight: 700; font-size: 16px;">
                Choisir mon plan →
              </a>
            </div>

            <p style="color: #9CA3AF; font-size: 13px; text-align: center;">
              Sans engagement · Résiliable à tout moment<br/>
              <a href="${appUrl}" style="color: #6366F1;">quotely.fr</a>
            </p>
          </div>`,
      });

      await supabase.from("profiles").update({ reminder_sent: true }).eq("id", profile.id);
      sent++;
    }

    return Response.json({ sent });
  } catch (err) {
    console.error("Trial reminder error:", err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
