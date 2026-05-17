-- Pro users can opt out of the "Devis créé avec Quovi" mention on client-facing
-- materials (PDF, email, public signature page). Free + Starter never get the
-- opt-out — the viral branding stays. shouldShowBranding() in
-- lib/branding/should-show.ts is the canonical reader of this column.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS hide_branding BOOLEAN NOT NULL DEFAULT FALSE;

-- No RLS additions — the column inherits the existing profiles policies
-- (user can read/update only their own row). The /api/profile allowlist
-- gates the write path so non-Pro users can't flip the flag from the UI.
