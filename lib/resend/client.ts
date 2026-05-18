import { Resend } from "resend";

let cached: Resend | null = null;
let warnedMissingKey = false;
let warnedMissingFrom = false;

export function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (!warnedMissingKey) {
      console.error(
        "[RESEND] RESEND_API_KEY is not configured — emails will fail. Set it in .env.local.",
      );
      warnedMissingKey = true;
    }
    throw new Error("RESEND_API_KEY is not configured");
  }
  cached = new Resend(key);
  return cached;
}

export function resendFromAddress(displayName: string): string {
  const technical = process.env.RESEND_FROM_EMAIL;
  if (!technical && !warnedMissingFrom) {
    console.error(
      "[RESEND] RESEND_FROM_EMAIL is not set — falling back to onboarding@resend.dev.",
    );
    warnedMissingFrom = true;
  }
  const from = technical || "onboarding@resend.dev";
  const sanitized = displayName.replace(/[<>"]/g, "").trim() || "Devis";
  return `${sanitized} <${from}>`;
}
