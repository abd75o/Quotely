// Admin-only screen for managing affiliates. Server component gates access
// by checking ADMIN_USER_IDS; non-admins get redirected to /dashboard.

import { redirect } from "next/navigation";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAdminUserId } from "@/lib/auth/admin";
import { AffiliatesAdminClient } from "./AffiliatesAdminClient";
import type { AffiliateRow } from "./AffiliatesAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?next=/admin/affiliates");
  if (!isAdminUserId(user.id)) redirect("/dashboard");

  const { data } = await getSupabaseAdmin()
    .from("affiliates")
    .select(
      "id, name, email, promo_code, tier, status, commission_rate, duration_months, total_clients_referred, total_revenue_generated, total_commission_paid, created_at",
    )
    .order("created_at", { ascending: false });

  return <AffiliatesAdminClient initialAffiliates={(data ?? []) as AffiliateRow[]} />;
}
