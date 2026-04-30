import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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

  // Ensure profile exists (upsert — DB trigger also handles this for new users)
  const { data: profile } = await supabase
    .from("profiles")
    .upsert({ id: user.id, plan: "trial", trial_ends_at: new Date(Date.now() + 14 * 86400_000).toISOString() }, { onConflict: "id", ignoreDuplicates: true })
    .select("id, onboarded_at")
    .single();

  // New or incomplete onboarding → redirect to onboarding
  if (!profile?.onboarded_at && !user.user_metadata?.onboarded) {
    return NextResponse.redirect(new URL("/onboarding", origin), { headers: response.headers });
  }

  return response;
}
