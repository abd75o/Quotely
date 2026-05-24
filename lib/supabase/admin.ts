import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — not instantiated at module load so the build never throws
// when SUPABASE_SERVICE_ROLE_KEY is absent from the build environment.
let _client: SupabaseClient | null = null;

/**
 * Returns the service-role Supabase client. Throws a CLEAR error if the env
 * key is missing instead of silently building a client with undefined auth
 * (which is what `createClient(url, undefined!)` used to do — calls then
 * fell back to anon, hit RLS, returned no rows, and the caller assumed the
 * row simply didn't exist). Callers that want to degrade gracefully should
 * wrap the call in try/catch and fall back to the SSR client.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase admin client unavailable: " +
          (!url ? "NEXT_PUBLIC_SUPABASE_URL " : "") +
          (!key ? "SUPABASE_SERVICE_ROLE_KEY " : "") +
          "missing from runtime env.",
      );
    }
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _client;
}
