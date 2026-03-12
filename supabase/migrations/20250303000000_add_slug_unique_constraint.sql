-- Phase 2: Artist Page
-- 1. Enforce slug uniqueness (only for non-empty slugs — empty strings are fine during onboarding)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_unique
  ON public.profiles (slug)
  WHERE slug IS NOT NULL AND slug <> '';

-- 2. Public read policy: anyone can view a profile by its slug (powers the public artist page)
DROP POLICY IF EXISTS "Public can view profiles by slug" ON public.profiles;
CREATE POLICY "Public can view profiles by slug"
  ON public.profiles FOR SELECT
  USING (slug IS NOT NULL AND slug <> '');
