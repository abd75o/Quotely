import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "signatures";
const MAX_BYTES = 1 * 1024 * 1024; // 1 MB hard cap — a 600×180 PNG sits around 5–20 KB.

/**
 * Artisan signature endpoint.
 *
 *   GET    → { signature_url, signature_updated_at }
 *   POST   → upload a PNG (base64 data URL) to bucket `signatures/<uid>/signature.png`,
 *            cache-bust the public URL with ?v=<ts>, persist on profiles.
 *   DELETE → remove the storage object + clear the columns on profiles.
 *
 * The bucket is public-read so the @react-pdf renderer can pull the image
 * during server-side PDF generation without a signed-URL round trip. RLS
 * limits write access to the user's own folder (see
 * supabase/migrations/20260522_artisan_signature.sql).
 */

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

interface PostBody {
  /** PNG data URL (`data:image/png;base64,iVBOR...`). Anything else is rejected. */
  dataUrl?: string;
}

const PNG_DATA_URL_RE = /^data:image\/png(?:;base64)?,(.+)$/;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("profiles")
    .select("signature_url, signature_updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return jsonError(error.message, 500);

  return Response.json({
    signature_url: (data?.signature_url as string | null) ?? null,
    signature_updated_at:
      (data?.signature_updated_at as string | null) ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const dataUrl = body.dataUrl;
  if (!dataUrl || typeof dataUrl !== "string") {
    return jsonError("dataUrl (PNG) requis.", 400);
  }
  const match = PNG_DATA_URL_RE.exec(dataUrl);
  if (!match) {
    return jsonError("Format invalide — attendu data:image/png;base64,…", 422);
  }

  // Decode the base64 payload server-side. Node's Buffer.from with "base64"
  // tolerates the URL-safe variant and silently drops padding, so any
  // garbage that slips past the regex still fails fast at byte length.
  let pngBytes: Buffer;
  try {
    pngBytes = Buffer.from(match[1], "base64");
  } catch {
    return jsonError("Décodage base64 échoué.", 422);
  }
  if (pngBytes.length === 0) {
    return jsonError("Signature vide.", 422);
  }
  if (pngBytes.length > MAX_BYTES) {
    return jsonError(
      `Signature trop lourde (${Math.round(pngBytes.length / 1024)} KB, max 1 MB).`,
      413,
    );
  }
  // PNG magic header check — costs nothing and stops users from POSTing
  // a JPEG/SVG renamed as PNG (which would later break the @react-pdf
  // <Image src> renderer with an opaque error).
  if (
    pngBytes.length < 8 ||
    pngBytes[0] !== 0x89 ||
    pngBytes[1] !== 0x50 ||
    pngBytes[2] !== 0x4e ||
    pngBytes[3] !== 0x47
  ) {
    return jsonError("Le fichier n'est pas un PNG valide.", 422);
  }

  // Fixed path — overwriting last upload keeps the bucket clean. The PDF
  // cache-busts via ?v=<timestamp> appended to the public URL below.
  const path = `${user.id}/signature.png`;
  // upsert:true so re-signing replaces the old PNG instead of 409'ing.
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, pngBytes, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "0",
    });
  if (upErr) {
    console.error("[signature POST] upload failed", upErr);
    return jsonError(upErr.message, 500);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const now = new Date().toISOString();
  // `?v=<ts>` busts any CDN cache between Supabase Storage and the PDF
  // fetcher when the artisan re-signs. Without it, the previous PNG would
  // keep rendering on freshly generated devis for the CDN TTL.
  const versionedUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      signature_url: versionedUrl,
      signature_updated_at: now,
    })
    .eq("id", user.id);
  if (profErr) {
    console.error("[signature POST] profile update failed", profErr);
    return jsonError(profErr.message, 500);
  }

  return Response.json({
    signature_url: versionedUrl,
    signature_updated_at: now,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const path = `${user.id}/signature.png`;
  // Best-effort storage delete — if the object is already gone (manual
  // cleanup, never uploaded) the SQL update below still needs to run to
  // clear the dangling column.
  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .remove([path]);
  if (storageErr) {
    console.warn("[signature DELETE] storage remove failed", storageErr);
  }

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      signature_url: null,
      signature_updated_at: null,
    })
    .eq("id", user.id);
  if (profErr) return jsonError(profErr.message, 500);

  return Response.json({ ok: true });
}
