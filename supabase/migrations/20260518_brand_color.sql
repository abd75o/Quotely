-- Canonical brand-accent color for the artisan, used by the PDF, the email
-- and the public signature page. Replaces the legacy duo
-- `primary_color` / `couleur_principale` going forward (those stay around as
-- fall-backs in the PDF resolver until back-fill is complete).
--
-- Default = slate-900 (#0F172A): the Apple-receipt aesthetic, a safe pick
-- that always reads on white and reverts cleanly if the artisan never
-- customises.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS brand_color TEXT NOT NULL DEFAULT '#0F172A';

-- Hex sanity-check enforced server-side AND in DB so a hand-crafted SQL
-- update can't poison the rendering. The API also runs the same regex but
-- treats the column with the same trust as everything else past the
-- profiles_plan_check pattern.
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_brand_color_hex;

ALTER TABLE profiles
ADD CONSTRAINT profiles_brand_color_hex
CHECK (brand_color ~ '^#[0-9A-Fa-f]{6}$');

-- Back-fill rows that already had primary_color set so existing artisans
-- don't see their look reset on first save. Skip rows where the legacy
-- value is malformed (the CHECK above would reject them anyway).
UPDATE profiles
SET brand_color = primary_color
WHERE primary_color ~ '^#[0-9A-Fa-f]{6}$'
  AND brand_color = '#0F172A';
