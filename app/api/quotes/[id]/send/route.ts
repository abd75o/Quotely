import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeSendQuote } from "@/lib/quotes/send";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SendBody {
  customMessage?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: SendBody = {};
  try {
    body = (await req.json()) as SendBody;
  } catch {
    // body optionnel
  }

  const result = await executeSendQuote({
    supabase,
    userId: user.id,
    userEmail: user.email,
    quoteId: id,
    customMessage: body.customMessage,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin,
  });

  if (!result.ok) {
    return jsonResponse(
      {
        error: result.error,
        ...(result.missing ? { missing: result.missing } : {}),
      },
      result.status,
    );
  }

  return jsonResponse({
    success: true,
    messageId: result.messageId,
    signLink: result.signLink,
  });
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
