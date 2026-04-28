import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/quotes";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
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
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Check if profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarded_at")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // New user — create profile with trial
    const trialEndsAt = new Date(Date.now() + 14 * 86400_000).toISOString();
    await supabase.from("profiles").insert({
      id: user.id,
      plan: "trial",
      trial_ends_at: trialEndsAt,
    });

    // Redirect to onboarding
    const onboardingUrl = new URL("/onboarding", origin);
    return NextResponse.redirect(onboardingUrl, { headers: response.headers });
  }

  if (!profile.onboarded_at) {
    const onboardingUrl = new URL("/onboarding", origin);
    return NextResponse.redirect(onboardingUrl, { headers: response.headers });
  }

  return response;
}
