import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  let body: { metier?: string; company?: string; telephone?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        metier: body.metier,
        company: body.company,
        telephone: body.telephone,
        onboarded_at: new Date().toISOString(),
        reminder_scheduled: true,
      });

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    console.error("Onboarding error:", err);
    return Response.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
