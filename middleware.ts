import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isDashboard  = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAuthPage   =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/connexion" ||
    pathname === "/inscription";

  // ── 1. Non authentifié sur page protégée → /connexion ────────────────────
  if ((isDashboard || isOnboarding) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }

  // ── 2. Authentifié sur page auth → dashboard ──────────────────────────────
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/quotes";
    return NextResponse.redirect(url);
  }

  // ── 3. Vérification onboarding (dashboard ou onboarding) ─────────────────
  if ((isDashboard || isOnboarding) && user) {
    // Source 1 : cookie posé immédiatement par la page onboarding (le plus rapide)
    const cookieOk = request.cookies.get("onboarded")?.value === "1";
    // Source 2 : metadata JWT (mis à jour par updateUser, propagé sans DB)
    const jwtOk = !!user.user_metadata?.onboarded;

    let isOnboarded = cookieOk || jwtOk;

    // Source 3 : DB — seulement si les deux premiers échouent
    if (!isOnboarded) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .single();
      isOnboarded = !!profile?.onboarded_at;
    }

    // Dashboard sans onboarding → /onboarding
    if (isDashboard && !isOnboarded) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // Onboarding déjà fait → dashboard
    if (isOnboarding && isOnboarded) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/quotes";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/login",
    "/signup",
    "/connexion",
    "/inscription",
  ],
};
