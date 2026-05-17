// User-facing parrainage dashboard. Shows the user's referral code, total
// months of credit earned, and a copyable share link. The code is generated
// lazily by GET /api/referrals on first access.

import { redirect } from "next/navigation";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { ParrainageClient } from "./ParrainageClient";

export const dynamic = "force-dynamic";

export default async function ParrainagePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/dashboard/parrainage");

  return <ParrainageClient />;
}
