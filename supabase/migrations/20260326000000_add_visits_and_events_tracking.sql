-- Phase 1 Artist Page smart-link tracking
-- Adds visit/session-level tracking tables used by the public Artist Page.

CREATE TABLE IF NOT EXISTS public.visits (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  link_id             uuid        REFERENCES public.links(id) ON DELETE SET NULL,
  source              text        NOT NULL CHECK (source IN ('tiktok', 'instagram', 'youtube', 'direct')),
  device              text        NOT NULL CHECK (device IN ('ios', 'android', 'desktop')),
  referrer            text,
  preferred_platform  text,
  visitor_token       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid        NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  link_id     uuid        REFERENCES public.links(id) ON DELETE SET NULL,
  event_type  text        NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visits_profile_created_idx
  ON public.visits (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS visits_source_created_idx
  ON public.visits (source, created_at DESC);

CREATE INDEX IF NOT EXISTS events_visit_created_idx
  ON public.events (visit_id, created_at DESC);

CREATE INDEX IF NOT EXISTS events_profile_created_idx
  ON public.events (profile_id, created_at DESC);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visits_owner_read" ON public.visits;
DROP POLICY IF EXISTS "events_owner_read" ON public.events;

CREATE POLICY "visits_owner_read" ON public.visits
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "events_owner_read" ON public.events
  FOR SELECT USING (auth.uid() = profile_id);
