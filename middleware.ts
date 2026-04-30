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
  const isTarifs     = pathname.startsWith("/tarifs");
  const isPaiement   = pathname.startsWith("/paiement");
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

  // ── 2. Authentifié sur page auth → paiement si plan présent, sinon dashboard
  if (isAuthPage && user) {
    const plan = request.nextUrl.searchParams.get("plan");
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Check onboarded: JWT metadata OR cookie fallback (set on onboarding completion)
  const onboardedCookie = request.cookies.get("onboarded")?.value;
  const isOnboarded = !!user?.user_metadata?.onboarded || onboardedCookie === "1";

  // Authenticated on dashboard → check onboarding completion
  if (isDashboard && user && !isOnboarded) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // On onboarding with completed profile → go to dashboard
  if (isOnboarding && user && isOnboarded) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── 4. /tarifs et /paiement : accessibles sans auth (rien à faire) ────────
  void isTarifs;
  void isPaiement;

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
