/**
 * Title-case helper for French names, cities, and company labels.
 *
 * Goals:
 *   - "75011 paris"          → "75011 Paris"
 *   - "SAS Bâti-pro"         → "SAS Bâti-Pro"
 *   - "jean-pierre dupont"   → "Jean-Pierre Dupont"
 *   - "marie de la croix"    → "Marie de la Croix"  (preserves particles)
 *   - "SARL bati pro"        → "SARL Bati Pro"      (preserves acronyms)
 *
 * Used by:
 *   - /api/profile PATCH on city / company / company_name
 *   - /api/clients POST + /api/clients/[id] PUT on name / first_name / city
 *   - PDF + HTML previews already title-case at render time via a local
 *     copy; we keep those for backward compatibility and add this canonical
 *     version for write-time normalisation.
 *
 * Why title-case at SAVE rather than render: case set once at write time
 * keeps the DB row consistent across every surface (PDF, dashboard list,
 * search), so a free-text search for "Paris" matches the row typed
 * "paris" without us having to ilike-normalise every query.
 */

// French particles kept lowercase when they appear between two cased words.
// We deliberately don't include "le"/"la" — those are typically part of a
// proper noun ("La Rochelle", "Le Havre") and should stay capitalised.
const FRENCH_PARTICLES = new Set([
  "de",
  "des",
  "du",
  "d",
  "von",
  "van",
  "et",
  "à",
  "au",
  "aux",
]);

// Common business-form acronyms we preserve verbatim. The user might type
// "sas" or "SAS"; the form-juridique select normalises to lowercase, but
// when the artisan types the form into a company name field (e.g.
// "SAS Bâti-Pro") we keep the acronym uppercased.
const PRESERVED_ACRONYMS = new Set([
  "SAS",
  "SASU",
  "SARL",
  "EURL",
  "SCI",
  "SCM",
  "SCP",
  "SNC",
  "EI",
  "EIRL",
  "SA",
  "CRL",
  "BTP",
  "RC",
  "RCS",
  "RM",
  "SCEA",
  "GAEC",
  "GIE",
]);

/**
 * Capitalise a single Unicode word: first letter uppercased, rest lowercased.
 * Uses locale-aware `toLocaleLowerCase("fr")` so É / é / À / à round-trip
 * correctly.
 */
function capitaliseWord(word: string): string {
  if (!word) return word;
  const lower = word.toLocaleLowerCase("fr");
  return lower.charAt(0).toLocaleUpperCase("fr") + lower.slice(1);
}

/**
 * Capitalise a single token (one "word" between whitespace) handling
 * hyphenated names like "Jean-Pierre" or "Bâti-Pro" by recursing on each
 * hyphen segment. Preserves preserved acronyms and known particles.
 */
function transformToken(token: string, isLeadingOrTrailing: boolean): string {
  if (!token) return token;

  // Hyphenated word: recurse on each segment so "jean-pierre" → "Jean-Pierre"
  // and "bâti-pro" → "Bâti-Pro". Hyphen segments don't get the particle
  // demotion (a particle inside a hyphenated word is almost certainly part
  // of the proper noun, e.g. "Saint-Étienne").
  if (token.includes("-")) {
    return token
      .split("-")
      .map((seg) => transformToken(seg, true))
      .join("-");
  }

  const upper = token.toLocaleUpperCase("fr");
  if (PRESERVED_ACRONYMS.has(upper)) return upper;

  // Particles ("de", "du", "des"…) stay lowercase EXCEPT when they sit at
  // the very start or end of the full string ("De Gaulle" the surname vs.
  // "Charles de Gaulle"). The caller passes the position info via
  // `isLeadingOrTrailing`.
  const lowerToken = token.toLocaleLowerCase("fr");
  if (!isLeadingOrTrailing && FRENCH_PARTICLES.has(lowerToken)) {
    return lowerToken;
  }

  return capitaliseWord(token);
}

/**
 * Title-case a full string. Splits on whitespace, processes each word,
 * preserves the original whitespace runs (so "  Paris" doesn't collapse
 * its leading spaces).
 */
export function titleCaseFr(input: string | null | undefined): string {
  if (input == null) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Split into [word, whitespace, word, whitespace, …] so the join keeps
  // multi-space inputs intact.
  const parts = trimmed.split(/(\s+)/);
  const wordIndices: number[] = [];
  parts.forEach((p, idx) => {
    if (!/^\s+$/.test(p)) wordIndices.push(idx);
  });
  const firstWord = wordIndices[0];
  const lastWord = wordIndices[wordIndices.length - 1];

  return parts
    .map((p, idx) => {
      if (/^\s+$/.test(p)) return p;
      const leadingOrTrailing = idx === firstWord || idx === lastWord;
      return transformToken(p, leadingOrTrailing);
    })
    .join("");
}

/**
 * Convenience: title-case if value is a non-empty string, otherwise pass
 * through (null / undefined / empty string preserved). Lets API routes call
 * `payload.city = titleCaseIfPresent(rawCity)` without an `if` ladder.
 */
export function titleCaseIfPresent<T>(
  value: T,
): T extends string ? string : T {
  if (typeof value !== "string") return value as never;
  const trimmed = value.trim();
  if (!trimmed) return value as never;
  return titleCaseFr(value) as never;
}
