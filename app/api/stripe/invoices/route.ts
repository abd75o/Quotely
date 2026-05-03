import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/**
 * GET /api/stripe/invoices
 * Renvoie les factures Stripe de l'utilisateur courant.
 * - 200 [] si pas encore de Stripe customer (pas d'abonnement actif).
 * - 501 si Stripe pas configuré sur l'environnement.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "stripe_not_configured", message: "Fonctionnalité disponible bientôt." },
      { status: 501 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = profile?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const result = await getStripe().invoices.list({ customer: customerId, limit: 24 });
    const invoices = result.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      created: inv.created,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
    }));
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("[stripe/invoices]", err);
    return NextResponse.json({ error: "invoices_error" }, { status: 500 });
  }
}
