-- Create links table
CREATE TABLE IF NOT EXISTS public.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "Users can manage own links"
  ON public.links FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Public read policy (visible links only — powers the public artist page)
CREATE POLICY "Public can view visible links"
  ON public.links FOR SELECT
  USING (is_visible = true);

-- Index for fast lookup by profile
CREATE INDEX IF NOT EXISTS links_profile_id_idx ON public.links (profile_id);
