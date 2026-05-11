import { NextRequest } from "next/server";

// Trial reminder flow deprecated: every new signup starts on Free.
// This handler is kept as a no-op so any existing cron job hitting
// /api/trial gets a clean 200 instead of a 404 while the cron is being
// retired upstream. Remove once the cron is unregistered.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ sent: 0, note: "Trial flow deprecated" });
}
