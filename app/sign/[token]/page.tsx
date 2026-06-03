import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveMentionsLegales } from "@/lib/pdf/mentions-legales";
import { shouldShowBranding } from "@/lib/branding/should-show";
import { formatSiret } from "@/lib/format/siret";
import { SignatureClient } from "./SignatureClient";

interface QuoteItem {
  id?: string;
  label?: string;
  price?: number;
  quantity?: number;
  unite?: string | null;
  tva?: number;
}

interface PublicQuote {
  id: string;
  number: string;
  status: string;
  items: QuoteItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  signed_at: string | null;
  viewed_at: string | null;
  signature_token: string;
  signature_data: Record<string, unknown> | null;
  created_at: string;
  user_id: string;
  client: {
    id: string;
    name: string;
    first_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    type_client: "particulier" | "professionnel" | null;
    siret: string | null;
  } | null;
  profile: {
    company_name: string | null;
    company: string | null;
    first_name: string | null;
    last_name: string | null;
    metier: string | null;
    metier_principal: string | null;
    siret: string | null;
    vat_status: string | null;
    vat_number: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    telephone: string | null;
    logo_url: string | null;
    couleur_principale: string | null;
    plan: string | null;
    hide_branding: boolean | null;
    email: string | null;
    legal_status: string | null;
    registration_number: string | null;
    registration_city: string | null;
    decennale_company: string | null;
    decennale_number: string | null;
    decennale_zone: string | null;
    rc_pro_company: string | null;
    rc_pro_number: string | null;
  } | null;
}

async function loadQuote(token: string): Promise<PublicQuote | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quotes")
      .select(
        "id, user_id, number, status, items, subtotal, tax_rate, tax_amount, total, valid_until, notes, signed_at, viewed_at, signature_token, signature_data, created_at, clients(*)",
      )
      .eq("signature_token", token)
      .maybeSingle();
    if (error || !data) return null;

    // /sign/[token] is PUBLIC — anon clients arriving from the email link
    // can't pass profiles RLS (auth.uid() = id). Without the admin client,
    // `profile` was null for real clients and companyDisplay() fell back to
    // "Devis". The signature_token already proves the visitor is entitled to
    // see this quote's issuer info, so bypassing RLS here is safe.
    //
    // Resilience: if the admin client is unavailable (e.g.
    // SUPABASE_SERVICE_ROLE_KEY missing from the runtime env on a partial
    // deploy), getSupabaseAdmin() throws and we fall back to the SSR
    // client. That fallback works for the artisan-previewing-their-own-quote
    // path (RLS passes because auth.uid() = profile.id) and at least keeps
    // the dashboard owner unblocked. We log the failure so the misconfig
    // surfaces in the platform logs instead of silently shipping a broken
    // emitter to clients.
    // IMPORTANT: `email` is intentionally NOT selected here. There is no
    // `email` column on `profiles` (the artisan email lives on auth.users).
    // Selecting it made PostgREST reject the ENTIRE query (42703 "column
    // profiles.email does not exist") → profile=null → the emitter fell back to
    // "Devis" + generic legal mentions. The artisan email is fetched separately
    // from auth.users below.
    const profileSelect =
      "company_name, company, first_name, last_name, metier, metier_principal, siret, vat_status, vat_number, address, postal_code, city, telephone, logo_url, couleur_principale, plan, hide_branding, legal_status, registration_number, registration_city, decennale_company, decennale_number, decennale_zone, rc_pro_company, rc_pro_number";

    let profile: Record<string, unknown> | null = null;
    let artisanEmail: string | null = null;
    let admin: ReturnType<typeof getSupabaseAdmin> | null = null;
    try {
      admin = getSupabaseAdmin();
      const { data: row, error: adminErr } = await admin
        .from("profiles")
        .select(profileSelect)
        .eq("id", data.user_id as string)
        .maybeSingle();
      // Do NOT swallow the error: a schema drift (like the `email` column above)
      // must surface in the logs instead of silently shipping a broken emitter.
      if (adminErr) {
        console.error("[sign/[token]] admin profile select error:", adminErr);
      }
      profile = (row as Record<string, unknown> | null) ?? null;
    } catch (e) {
      console.error(
        "[sign/[token]] admin profile fetch failed, falling back to SSR client:",
        e,
      );
    }

    if (!profile) {
      const { data: row, error: ssrErr } = await supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", data.user_id as string)
        .maybeSingle();
      if (ssrErr) {
        console.error("[sign/[token]] SSR profile select error:", ssrErr);
      }
      profile = (row as Record<string, unknown> | null) ?? null;
    }

    if (!profile) {
      console.error(
        "[sign/[token]] profile not found for user_id=" +
          String(data.user_id) +
          " — emitter block will fall back to generic label.",
      );
    }

    // Artisan email comes from auth.users, NOT profiles. Best-effort via the
    // service-role admin API (the public visitor isn't the artisan, so we can't
    // read it from the SSR session). Failure just means no email line in the
    // emitter — never a broken page.
    if (admin) {
      try {
        const { data: authData, error: authErr } =
          await admin.auth.admin.getUserById(data.user_id as string);
        if (authErr) {
          console.error("[sign/[token]] artisan email lookup error:", authErr);
        }
        artisanEmail = authData?.user?.email ?? null;
      } catch (e) {
        console.error("[sign/[token]] artisan email lookup failed:", e);
      }
    }

    // RÈGLE MÉTIER draft=live / sent=snapshot. Tant que le devis est un
    // brouillon, l'émetteur affiché suit le profil LIVE. Dès qu'il est envoyé
    // ou signé, on relit l'émetteur FIGÉ à l'envoi (emitter_snapshot) afin que
    // toute édition de profil postérieure ne modifie pas le document déjà
    // transmis au client. Requête séparée + défensive (colonne ajoutée par
    // migration) : son absence ne casse jamais la page.
    if ((data.status as string) !== "draft") {
      const { data: snap, error: snapErr } = await supabase
        .from("quotes")
        .select("emitter_snapshot")
        .eq("signature_token", token)
        .maybeSingle();
      if (snapErr) {
        console.error("[sign/[token]] emitter_snapshot read error:", snapErr);
      }
      const raw = (snap as { emitter_snapshot?: unknown } | null)
        ?.emitter_snapshot;
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        profile = raw as Record<string, unknown>;
      }
    }

    // Attach the auth email onto the profile object so the existing
    // companyDisplay()/emitter rendering (which read `profile.email`) keep
    // working unchanged. The snapshot already carries the email captured at
    // send time; we only refresh it when the live lookup found one.
    if (profile && artisanEmail && !profile.email) {
      profile.email = artisanEmail;
    }

    const clientRow = Array.isArray(data.clients)
      ? (data.clients[0] as Record<string, unknown> | undefined)
      : ((data.clients as Record<string, unknown> | null) ?? undefined);

    return {
      id: data.id as string,
      number: data.number as string,
      status: data.status as string,
      items: Array.isArray(data.items) ? (data.items as QuoteItem[]) : [],
      subtotal: Number(data.subtotal),
      tax_rate: Number(data.tax_rate),
      tax_amount: Number(data.tax_amount),
      total: Number(data.total),
      valid_until: (data.valid_until as string | null) ?? null,
      notes: (data.notes as string | null) ?? null,
      signed_at: (data.signed_at as string | null) ?? null,
      viewed_at: (data.viewed_at as string | null) ?? null,
      signature_token: data.signature_token as string,
      signature_data:
        (data.signature_data as Record<string, unknown> | null) ?? null,
      created_at: data.created_at as string,
      user_id: data.user_id as string,
      client: clientRow
        ? {
            id: String(clientRow.id),
            name: String(clientRow.name ?? "Client"),
            first_name: (clientRow.first_name as string | null) ?? null,
            email: (clientRow.email as string | null) ?? null,
            phone: (clientRow.phone as string | null) ?? null,
            address: (clientRow.address as string | null) ?? null,
            postal_code: (clientRow.postal_code as string | null) ?? null,
            city: (clientRow.city as string | null) ?? null,
            type_client:
              (clientRow.type_client as
                | "particulier"
                | "professionnel"
                | null) ?? null,
            siret: (clientRow.siret as string | null) ?? null,
          }
        : null,
      profile: (profile as PublicQuote["profile"]) ?? null,
    };
  } catch {
    return null;
  }
}

const RCS_LEGAL_STATUSES = new Set(["sarl", "sas", "sasu", "eurl"]);
const RM_LEGAL_STATUSES = new Set(["ei", "auto-entrepreneur"]);

function formatRegistrationFr(p: PublicQuote["profile"]): string | null {
  const number = p?.registration_number?.trim();
  if (!number) return null;
  const status = (p?.legal_status ?? "").toLowerCase().trim();
  if (RCS_LEGAL_STATUSES.has(status)) {
    const city = p?.registration_city?.trim();
    return city ? `RCS ${city} ${number}` : `RCS ${number}`;
  }
  if (RM_LEGAL_STATUSES.has(status)) return `RM ${number}`;
  return `N° ${number}`;
}

function formatDecennaleFr(p: PublicQuote["profile"]): string | null {
  const num = p?.decennale_number?.trim();
  if (!num) return null;
  const insurer = p?.decennale_company?.trim();
  const zone = p?.decennale_zone?.trim();
  const body = insurer ? `${insurer} n°${num}` : num;
  return `Décennale : ${body}${zone ? ` — ${zone}` : ""}`;
}

function formatRcProFr(p: PublicQuote["profile"]): string | null {
  const num = p?.rc_pro_number?.trim();
  if (!num) return null;
  const insurer = p?.rc_pro_company?.trim();
  return `RC pro : ${insurer ? `${insurer} n°${num}` : num}`;
}

function companyDisplay(
  p: PublicQuote["profile"],
  artisanEmail?: string | null,
): string {
  if (!p) return artisanEmail || "Devis";
  return (
    p.company_name ||
    p.company ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    artisanEmail ||
    "Devis"
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const quote = await loadQuote(token);
  const company = companyDisplay(
    quote?.profile ?? null,
    quote?.profile?.email ?? null,
  );
  return {
    title: quote ? `Devis n°${quote.number} — ${company}` : "Devis",
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

function formatEuros(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default async function PublicSignaturePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await loadQuote(token);
  if (!quote) notFound();

  const color = quote.profile?.couleur_principale || "#5B5BD6";
  const company = companyDisplay(quote.profile, quote.profile?.email ?? null);
  const mentions = resolveMentionsLegales({
    metier: quote.profile?.metier_principal || quote.profile?.metier,
    typeClient: quote.client?.type_client ?? "particulier",
    vatStatus: quote.profile?.vat_status,
  });
  // RCS / RM mention shown under SIRET. Same logic as the PDF
  // (lib/pdf/quote-template.tsx formatRegistration) — label switches on
  // legal_status so sociétés get "RCS Paris …", artisans get "RM …".
  const registration = formatRegistrationFr(quote.profile);
  const decennaleLine = formatDecennaleFr(quote.profile);
  const rcProLine = formatRcProFr(quote.profile);

  const pdfUrl = `/api/quotes/${quote.id}/pdf?token=${quote.signature_token}`;
  const showBranding = shouldShowBranding(
    quote.profile?.plan,
    quote.profile?.hide_branding,
  );
  const signedName =
    quote.signature_data &&
    typeof quote.signature_data === "object" &&
    "full_name" in quote.signature_data
      ? String(quote.signature_data.full_name)
      : null;

  return (
    <div
      className="min-h-screen bg-[#F4F4F7]"
      style={{ ["--brand" as string]: color } as React.CSSProperties}
    >
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          {quote.profile?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quote.profile.logo_url}
              alt={company}
              className="h-12 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              {company}
            </h1>
          )}
          <div className="min-w-0">
            {quote.profile?.logo_url && (
              <p className="text-base font-bold text-[#0F172A]">{company}</p>
            )}
            <p className="text-xs text-[#6B7280]">
              Devis n°{quote.number} · Émis le {formatDate(quote.created_at)}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] bg-[#FAFAFB] px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">
                Devis
              </p>
              <p className="mt-0.5 text-xl font-bold text-[#0F172A]">
                n°{quote.number}
              </p>
              {quote.valid_until && (
                <p className="mt-0.5 text-xs text-[#6B7280]">
                  Valable jusqu&apos;au {formatDate(quote.valid_until)}
                </p>
              )}
            </div>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener"
              className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] transition-colors hover:border-[#9CA3AF]"
            >
              Télécharger le PDF
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
            <Party
              label="Émetteur"
              name={company}
              lines={[
                quote.profile?.legal_status,
                quote.profile?.address,
                [quote.profile?.postal_code, quote.profile?.city]
                  .filter(Boolean)
                  .join(" "),
                quote.profile?.telephone
                  ? `Tél : ${quote.profile.telephone}`
                  : null,
                quote.profile?.email,
                quote.profile?.siret
                  ? `SIRET ${formatSiret(quote.profile.siret) || quote.profile.siret}`
                  : null,
                registration,
                quote.profile?.vat_number
                  ? `TVA intra. ${quote.profile.vat_number}`
                  : null,
                decennaleLine,
                rcProLine,
              ]}
              color={color}
            />
            <Party
              label="Destinataire"
              name={
                quote.client
                  ? quote.client.first_name
                    ? `${quote.client.first_name} ${quote.client.name}`
                    : quote.client.name
                  : "Client"
              }
              lines={[
                quote.client?.address,
                [quote.client?.postal_code, quote.client?.city]
                  .filter(Boolean)
                  .join(" "),
                quote.client?.siret
                  ? `SIRET ${formatSiret(quote.client.siret) || quote.client.siret}`
                  : null,
                quote.client?.email,
              ]}
              color={color}
            />
          </div>

          <div className="border-t border-[#E5E7EB]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-widest text-[#6B7280]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Description</th>
                  <th className="px-4 py-2 text-right font-semibold">Qté</th>
                  <th className="px-4 py-2 text-center font-semibold">
                    Unité
                  </th>
                  <th className="px-4 py-2 text-right font-semibold">PU HT</th>
                  <th className="px-4 py-2 text-right font-semibold">TVA</th>
                  <th className="px-4 py-2 text-right font-semibold">
                    Total HT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {quote.items.map((line, idx) => {
                  const qty = Number(line.quantity ?? 1);
                  const ht = Number(line.price ?? 0) * qty;
                  return (
                    <tr key={String(line.id ?? idx)} className="bg-white">
                      <td className="px-4 py-3 text-[#0F172A]">
                        {line.label}
                      </td>
                      <td className="px-4 py-3 text-right text-[#374151]">
                        {qty}
                      </td>
                      <td className="px-4 py-3 text-center text-[#6B7280]">
                        {line.unite ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[#374151]">
                        {formatEuros(Number(line.price ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-[#374151]">
                        {Number(line.tva ?? quote.tax_rate)}%
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#0F172A]">
                        {formatEuros(ht)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-[#E5E7EB] bg-[#FAFAFB] px-5 py-4">
            <div className="w-full max-w-xs space-y-1 text-[13px]">
              <Row label="Sous-total HT" value={formatEuros(quote.subtotal)} />
              <Row
                label={`TVA ${quote.tax_rate}%`}
                value={formatEuros(quote.tax_amount)}
              />
              <div
                className="flex items-center justify-between border-t pt-2 text-base font-bold"
                style={{ borderColor: color, color }}
              >
                <span>Total TTC</span>
                <span>{formatEuros(quote.total)}</span>
              </div>
            </div>
          </div>

          {(mentions.generales.length > 0 ||
            mentions.garanties.length > 0 ||
            mentions.specifiques.length > 0 ||
            mentions.tvaNote) && (
            <div className="border-t border-[#E5E7EB] bg-white px-5 py-4 text-[11px] leading-relaxed text-[#6B7280]">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                Mentions légales
              </p>
              {mentions.tvaNote && <p>• {mentions.tvaNote}</p>}
              {[
                ...mentions.generales,
                ...mentions.garanties,
                ...mentions.specifiques,
              ].map((m, i) => (
                <p key={i}>• {m}</p>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <SignatureClient
            quoteId={quote.id}
            signatureToken={quote.signature_token}
            signedAt={quote.signed_at}
            signedName={signedName}
            clientEmail={quote.client?.email ?? ""}
            color={color}
          />
        </section>

        {showBranding && (
          <div className="text-center text-xs text-gray-400 mt-8">
            Propulsé par{" "}
            <a href="https://quovi.fr" className="hover:underline">
              Quovi
            </a>
          </div>
        )}

        <footer className="mt-8 text-center text-[11px] leading-relaxed text-[#9CA3AF]">
          <p>{company}</p>
          {quote.profile?.telephone && <p>{quote.profile.telephone}</p>}
          <p className="mt-3">
            Vos données de signature sont conservées pendant 10 ans
            (obligation légale).
          </p>
        </footer>
      </main>
    </div>
  );
}

function Party({
  label,
  name,
  lines,
  color,
}: {
  label: string;
  name: string;
  lines: (string | null | undefined)[];
  color: string;
}) {
  return (
    <div
      className="rounded-xl border-l-2 bg-white pl-3"
      style={{ borderColor: color }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">
        {label}
      </p>
      <p className="mt-1 text-[14px] font-bold text-[#0F172A]">{name}</p>
      <div className="mt-1 space-y-0.5 text-[12px] text-[#4B5563]">
        {lines.filter(Boolean).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[#4B5563]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
