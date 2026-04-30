import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/quotes";
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

  // Check if profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarded_at")
    .eq("id", user.id)
    .single();

  const onboardingDest = (plan === "starter" || plan === "pro")
    ? `/onboarding?plan=${plan}`
    : "/onboarding";

  if (!profile) {
    // New user — create profile with trial
    const trialEndsAt = new Date(Date.now() + 14 * 86400_000).toISOString();
    await supabase.from("profiles").insert({
      id: user.id,
      plan: "trial",
      trial_ends_at: trialEndsAt,
    });
    return NextResponse.redirect(new URL(onboardingDest, origin), { headers: response.headers });
  }

  if (!profile.onboarded_at) {
    return NextResponse.redirect(new URL(onboardingDest, origin), { headers: response.headers });
  }

  // Existing onboarded user — go to paiement if plan is set, else dashboard
  if (plan === "starter" || plan === "pro") {
    return NextResponse.redirect(new URL(`/paiement?plan=${plan}`, origin), { headers: response.headers });
  }

  return response;
}
