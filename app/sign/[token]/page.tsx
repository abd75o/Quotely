import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveMentionsLegales } from "@/lib/pdf/mentions-legales";
import { shouldShowBranding } from "@/lib/branding/should-show";
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
    address: string | null;
    postal_code: string | null;
    city: string | null;
    telephone: string | null;
    logo_url: string | null;
    couleur_principale: string | null;
    plan: string | null;
    hide_branding: boolean | null;
    email: string | null;
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

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "company_name, company, first_name, last_name, metier, metier_principal, siret, vat_status, address, postal_code, city, telephone, logo_url, couleur_principale, plan, hide_branding, email",
      )
      .eq("id", data.user_id as string)
      .maybeSingle();

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
                quote.profile?.address,
                [quote.profile?.postal_code, quote.profile?.city]
                  .filter(Boolean)
                  .join(" "),
                quote.profile?.siret ? `SIRET ${quote.profile.siret}` : null,
                quote.profile?.telephone,
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
                quote.client?.siret ? `SIRET ${quote.client.siret}` : null,
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
