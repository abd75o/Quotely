import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  attributeNewUser,
  REF_COOKIE,
  PARRAIN_COOKIE,
} from "@/lib/auth/attribution";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/devis";
  const plan = searchParams.get("plan"); // preserved through email confirmation flow

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?error=missing_code`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !user) {
    return NextResponse.redirect(`${origin}/connexion?error=auth_failed`);
  }

  // Attribute the new user to an affiliate / referrer if attribution cookies
  // are present. Best-effort — errors are swallowed so signup never breaks.
  const refCode = request.cookies.get(REF_COOKIE)?.value ?? null;
  const parrainCode = request.cookies.get(PARRAIN_COOKIE)?.value ?? null;
  if (refCode || parrainCode) {
    try {
      await attributeNewUser({
        userId: user.id,
        refCode,
        parrainCode,
      });
    } catch (e) {
      console.error("[auth/callback] attribution failed:", e);
    }
    if (refCode) response.cookies.delete(REF_COOKIE);
    if (parrainCode) response.cookies.delete(PARRAIN_COOKIE);
  }

  // Ensure profile exists (upsert — DB trigger also handles this for new users)
  const { data: profile } = await supabase
    .from("profiles")
    .upsert({ id: user.id, plan: "free" }, { onConflict: "id", ignoreDuplicates: true })
    .select("id, onboarding_completed, onboarded_at")
    .single();

  const onboardingDest = (plan === "starter" || plan === "pro")
    ? `/dashboard/onboarding?plan=${plan}`
    : "/dashboard/onboarding";

  if (!profile) {
    // New user — create profile on Free plan
    await supabase.from("profiles").insert({
      id: user.id,
      plan: "free",
    });
    return NextResponse.redirect(new URL(onboardingDest, origin), { headers: response.headers });
  }

  // V4: onboarding_completed is the source of truth; legacy onboarded_at honoured.
  const isOnboarded = !!profile.onboarding_completed || !!profile.onboarded_at;
  if (!isOnboarded) {
    return NextResponse.redirect(new URL(onboardingDest, origin), { headers: response.headers });
  }

  // Existing onboarded user — go to paiement if plan is set, else dashboard
  if (plan === "starter" || plan === "pro") {
    return NextResponse.redirect(new URL(`/paiement?plan=${plan}`, origin), { headers: response.headers });
  }

  return response;
}
