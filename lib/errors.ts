/**
 * Centralised error → human message translation.
 *
 * Supabase returns PostgrestError (NOT a JS Error), fetch throws TypeError,
 * server APIs may return arbitrary shapes. This helper digs through those
 * common shapes and produces a sentence an artisan can actually read.
 *
 * Generic catch-all is kept short on purpose: long technical messages
 * scare non-tech users. Show the real Supabase / HTTP code in console for
 * debugging, surface a clear sentence in the toast.
 */
export function humanizeError(err: unknown, fallback?: string): string {
  if (!err) return fallback ?? "Une erreur est survenue.";

  // 1. Standard JS Error
  if (err instanceof Error) {
    const msg = err.message;
    const mapped = mapMessage(msg);
    if (mapped) return mapped;
    if (err.name === "AbortError") return "Action annulée.";
    if (err.name === "TypeError" && /fetch/i.test(msg)) {
      return "Connexion perdue. Vérifie ton accès Internet et réessaie.";
    }
    return msg || fallback || "Une erreur est survenue.";
  }

  // 2. Supabase PostgrestError shape: { message, code, details, hint }
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const code = (e.code ?? e.status) as string | number | undefined;
    const message = (e.message ?? e.error ?? e.statusText) as
      | string
      | undefined;

    if (typeof code === "string") {
      const mapped = mapSupabaseCode(code);
      if (mapped) return mapped;
    }
    if (typeof code === "number") {
      const mapped = mapHttpStatus(code);
      if (mapped) return mapped;
    }
    if (message) {
      const mapped = mapMessage(message);
      if (mapped) return mapped;
      return message;
    }
  }

  // 3. Plain string thrown
  if (typeof err === "string") {
    return mapMessage(err) ?? err;
  }

  return fallback ?? "Une erreur est survenue.";
}

/**
 * Match a raw error message string against known patterns and return
 * a friendlier French sentence. Returns null if no pattern matches.
 */
function mapMessage(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes("network") || m.includes("failed to fetch")) {
    return "Connexion perdue. Vérifie ton accès Internet et réessaie.";
  }
  if (m.includes("siret") && m.includes("14")) {
    return "Le SIRET doit contenir 14 chiffres.";
  }
  if (m.includes("invalid email") || m.includes("email_invalid")) {
    return "Adresse email invalide.";
  }
  if (m.includes("duplicate key") || m.includes("already exists")) {
    return "Cet élément existe déjà.";
  }
  if (m.includes("permission denied") || m.includes("row-level security")) {
    return "Tu n'as pas les droits pour cette action.";
  }
  if (m.includes("violates not-null") || m.includes("null value")) {
    return "Un champ obligatoire est vide.";
  }
  if (m.includes("session") && (m.includes("expired") || m.includes("missing"))) {
    return "Session expirée. Reconnecte-toi.";
  }
  return null;
}

function mapSupabaseCode(code: string): string | null {
  switch (code) {
    case "23505": // unique_violation
      return "Cet élément existe déjà.";
    case "23503": // foreign_key_violation
      return "Référence introuvable (client ou devis supprimé).";
    case "23502": // not_null_violation
      return "Un champ obligatoire est vide.";
    case "42501": // insufficient_privilege
      return "Tu n'as pas les droits pour cette action.";
    case "PGRST116": // no rows
      return "Aucun résultat trouvé.";
    case "PGRST301": // RLS no permission
      return "Tu n'as pas les droits pour cette action.";
    default:
      return null;
  }
}

function mapHttpStatus(code: number): string | null {
  if (code >= 500) return "Aïe, problème côté serveur. Réessaie dans quelques secondes.";
  if (code === 401 || code === 403) return "Tu n'as pas les droits pour cette action.";
  if (code === 404) return "Ressource introuvable.";
  if (code === 409) return "Conflit : cet élément existe déjà.";
  if (code === 422 || code === 400) return "Données invalides — vérifie tes champs.";
  return null;
}
