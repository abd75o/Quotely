// Code generation helpers for affiliate promo codes and user referral codes.

// Excludes visually ambiguous chars (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomToken(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Generate a referral code from a first name + random suffix.
 * Example: generateReferralCode("Marc") → "MARC-K7P9"
 * If `firstName` is empty, fall back to fully random.
 */
export function generateReferralCode(firstName?: string | null): string {
  const slug = (firstName ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 8);
  const suffix = randomToken(4);
  return slug ? `${slug}-${suffix}` : randomToken(8);
}

/**
 * Generate an affiliate promo code. Admin-created — usually a manual name
 * like "AGENCE-X" — but this helper provides a default when admin leaves
 * the field blank.
 */
export function generatePromoCode(seed?: string | null): string {
  return generateReferralCode(seed);
}
