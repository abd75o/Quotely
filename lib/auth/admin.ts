// Admin gating: there is no `role` column in profiles. Admins are listed
// explicitly via the ADMIN_USER_IDS env var (comma-separated user UUIDs).
// Server-only check — never expose the list client-side.

const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isAdminUserId(id: string | null | undefined): boolean {
  if (!id) return false;
  return ADMIN_IDS.includes(id);
}
