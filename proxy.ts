import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const REF_COOKIE = "qv_ref";
const PARRAIN_COOKIE = "qv_parrain";
const ATTRIBUTION_TTL_DAYS = 30;

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // ── 0. Attribution cookies (any route, before auth) ────────────────────────
  // ?ref=CODE  → affiliate attribution
  // ?parrain=CODE → user-to-user referral
  // Both cookies live 30 days, are httpOnly, and get consumed at signup.
  const ref = request.nextUrl.searchParams.get("ref");
  const parrain = request.nextUrl.searchParams.get("parrain");
  if (ref) {
    response.cookies.set(REF_COOKIE, ref.trim().slice(0, 64), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * ATTRIBUTION_TTL_DAYS,
    });
  }
  if (parrain) {
    response.cookies.set(PARRAIN_COOKIE, parrain.trim().slice(0, 64), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * ATTRIBUTION_TTL_DAYS,
    });
  }

  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboardingV4 = pathname.startsWith("/dashboard/onboarding");
  const isOnboardingLegacy = pathname.startsWith("/onboarding");
  const isAuthPage =
    pathname === "/connexion" || pathname === "/inscription";

  const needsAuth = isDashboard || isOnboardingLegacy || isAuthPage;
  // Fast path: marketing pages don't need a Supabase round-trip; cookie was
  // already set above. Returning the response keeps the auth-cookie hop only
  // for routes that actually care.
  if (!needsAuth) return response;

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
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 1. Non authentifié sur page protégée → /connexion ────────────────────
  if ((isDashboard || isOnboardingLegacy) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }

  // ── 2. Authentifié sur page auth → paiement si plan présent, sinon dashboard
  if (isAuthPage && user) {
    const plan = request.nextUrl.searchParams.get("plan");
    const url = request.nextUrl.clone();
    if (plan === "starter" || plan === "pro") {
      url.pathname = "/paiement";
      url.search = `?plan=${plan}`;
    } else {
      url.pathname = "/dashboard/devis";
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  // ── 3. Onboarding V4 (source of truth) ────────────────────────────────────
  if (isDashboard && user) {
    // Cookie + JWT metadata as fast-path so we don't hit DB on every request.
    const cookieOk = request.cookies.get("onboarded")?.value === "1";
    const jwtOk = !!user.user_metadata?.onboarded;

    let isOnboarded = cookieOk || jwtOk;

    if (!isOnboarded) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, onboarded_at")
        .eq("id", user.id)
        .single();
      // Honour both V4 (onboarding_completed) and legacy (onboarded_at) flags.
      isOnboarded =
        !!profile?.onboarding_completed || !!profile?.onboarded_at;
    }

    // Not onboarded → /dashboard/onboarding (except already there)
    if (!isOnboarded && !isOnboardingV4) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/onboarding";
      return NextResponse.redirect(url);
    }

    // Already onboarded but landed on onboarding → go to dashboard
    if (isOnboarded && isOnboardingV4) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ── 4. Legacy /onboarding → redirect to /dashboard/onboarding ─────────────
  // The /onboarding page was removed but keep the redirect for bookmarked URLs.
  if (isOnboardingLegacy && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/onboarding";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except API routes, static files, and Next internals.
    // Wide matching is needed so ?ref / ?parrain attribution cookies are set
    // when users land on / or /tarifs from a campaign link.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
