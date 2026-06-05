import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeSendInvoice } from "@/lib/invoices/send";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
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

  const result = await executeSendInvoice({
    supabase,
    userId: user.id,
    invoiceId: id,
  });

  if (!result.ok) {
    return jsonResponse({ error: result.error }, result.status);
  }
  return jsonResponse({ success: true, sent_at: result.sent_at });
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
