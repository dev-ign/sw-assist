-- ═══════════════════════════════════════════════════════════════════════════════
-- Small World Assist — Master Schema
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Single source of truth for the entire database.
-- Safe to run on both fresh and existing Supabase projects.
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE / ON CONFLICT).
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → paste and run this file.
--
-- WHAT THIS COVERS:
--   1. Enum types
--   2. All table definitions (profiles, links, tracks, shows, epk, page_analytics)
--   3. Indexes
--   4. updated_at auto-trigger (shared function, applied to all relevant tables)
--   5. handle_new_user trigger (creates profile + epk row on every signup)
--   6. Row Level Security — all tables, all policies
--   7. Storage buckets + upload/read policies
--
-- AFTER RUNNING THIS:
--   See the APPENDIX at the bottom for manual steps (secrets, edge functions, etc.)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. ENUM TYPES ──────────────────────────────────────────────────────────────
--
-- subscription_tier drives feature access throughout the app.
-- Stored as text with a CHECK constraint on the profiles table (safer than
-- an enum type since ALTER TYPE ADD VALUE requires a transaction boundary).
--
-- Tiers (ascending):  free → rising → indie → superstar
-- Upgrade logic is handled outside the DB (Stripe webhooks → update profiles row).


-- ── 2. TABLE DEFINITIONS ───────────────────────────────────────────────────────


-- ── profiles ──────────────────────────────────────────────────────────────────
-- One row per user. Auto-created by handle_new_user trigger on signup.
-- Never manually inserted by the app — always updated after creation.
--
-- Key fields the app reads/writes:
--   artist_name      — display name everywhere; base of slug generation
--   slug             — stored as "{artistSlug}/{pageSlug}" (e.g. "nova/my-page")
--                      empty string '' during onboarding (before page is set)
--   banner_photo_url — cover art; used as background on public artist page
--   profile_photo_url— shown on EPK public page header
--   genre            — text[], shown as tags on artist page + EPK
--   goals            — jsonb from onboarding step 4 (PRIMARY_GOALS choices)
--   onboarding_completed — gating flag; false redirects to /onboarding
--   subscription_tier — controls feature limits (free/rising/indie/superstar)

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name         text        NOT NULL DEFAULT '',
  real_name           text,
  bio                 text,
  genre               text[],
  location            text,
  profile_photo_url   text,
  banner_photo_url    text,
  slug                text        NOT NULL DEFAULT '',
  subscription_tier   text        NOT NULL DEFAULT 'free'
                                  CHECK (subscription_tier IN ('free','rising','indie','superstar')),
  goals               jsonb,
  onboarding_completed boolean    NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);


-- ── links ──────────────────────────────────────────────────────────────────────
-- Streaming + social links shown on the public artist page.
-- Managed in PageEditor (/page) and EditProfile (/profile/edit).
-- Mutation pattern: DELETE all for user → re-INSERT current set (no incremental update).
--
-- platform examples: 'spotify', 'apple_music', 'instagram', 'tiktok', 'youtube', 'custom'
-- is_visible: false = hidden from public page but kept in editor
-- display_order: 0-based integer set on save

CREATE TABLE IF NOT EXISTS public.links (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform      text        NOT NULL,
  label         text        NOT NULL,
  url           text        NOT NULL,
  icon          text,
  display_order integer     NOT NULL DEFAULT 0,
  is_visible    boolean     NOT NULL DEFAULT true,
  click_count   integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);


-- ── tracks ─────────────────────────────────────────────────────────────────────
-- Music added in the EPK editor (/epk).
-- Mutation pattern: DELETE all for user → re-INSERT current set.
--
-- is_on_epk: controls public visibility on the EPK page (default true in EpkEditor)
-- is_featured: at most one track is featured (shown with a star on EPK page)
-- release_date: stored as text 'YYYY-MM-DD' (matches date input value)
-- streaming_url: Spotify / Apple Music / etc. link shown as "Listen" button on EPK

CREATE TABLE IF NOT EXISTS public.tracks (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  cover_art_url     text,
  audio_preview_url text,
  streaming_url     text,
  release_date      text,
  genre             text,
  mood              text[],
  tempo             text,
  is_featured       boolean     NOT NULL DEFAULT false,
  is_on_epk         boolean     NOT NULL DEFAULT true,
  play_count        integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);


-- ── shows ──────────────────────────────────────────────────────────────────────
-- Upcoming live dates added in the EPK editor (/epk).
-- Mutation pattern: DELETE all for user → re-INSERT current set.
--
-- date: stored as text 'YYYY-MM-DD' (matches date input value)
-- Public EPK page only shows shows where is_visible=true AND date >= today
-- is_headline: shown as a purple "Headline" badge on the EPK page

CREATE TABLE IF NOT EXISTS public.shows (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_name   text        NOT NULL,
  city         text        NOT NULL DEFAULT '',
  date         text        NOT NULL,
  ticket_url   text,
  is_headline  boolean     NOT NULL DEFAULT false,
  is_visible   boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);


-- ── epk ────────────────────────────────────────────────────────────────────────
-- Electronic Press Kit — exactly one row per artist.
-- Auto-created by handle_new_user trigger on signup.
-- Managed in EpkEditor (/epk); rendered publicly at /:artistSlug/:pageSlug/epk.
--
-- headline:         short one-liner for press (can be AI-generated via suggest-epk-headline)
-- bio_override:     EPK-specific bio (falls back to profiles.bio on public page)
-- press_photos:     array of public URLs from the 'press-photos' storage bucket
-- stats_snapshot:   jsonb — manually entered stats, keys:
--                   monthly_listeners, spotify_followers, instagram_followers,
--                   tiktok_followers, youtube_subscribers, total_streams
-- custom_sections:  reserved for future custom content blocks
-- selected_track_ids: reserved (app currently uses is_on_epk on tracks instead)
-- view_count:       incremented on public EPK page load (future analytics feature)

CREATE TABLE IF NOT EXISTS public.epk (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline            text,
  bio_override        text,
  selected_track_ids  text[],
  press_photos        text[],
  stats_snapshot      jsonb,
  custom_sections     jsonb,
  view_count          integer     NOT NULL DEFAULT 0,
  last_generated_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);


-- ── page_analytics ─────────────────────────────────────────────────────────────
-- Written by the track-page-event edge function (uses service role key, bypasses RLS).
-- Tracks page views and link clicks on public artist pages.
-- Future: used by the Analytics dashboard (Phase 5).
--
-- event_type: 'page_view' (on page load) | 'link_click' (on link tap)
-- link_id: populated for link_click events only
-- device: 'mobile' | 'desktop' (parsed from User-Agent in edge function)
-- country: ISO 3166-1 alpha-2 from Cloudflare cf-ipcountry header

CREATE TABLE IF NOT EXISTS public.page_analytics (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type  text        NOT NULL CHECK (event_type IN ('page_view', 'link_click')),
  link_id     uuid        REFERENCES public.links(id) ON DELETE SET NULL,
  referrer    text,
  country     text,
  device      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ── 3. INDEXES ─────────────────────────────────────────────────────────────────

-- Slug uniqueness: partial index so empty strings '' don't conflict
CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_unique
  ON public.profiles (slug)
  WHERE slug IS NOT NULL AND slug <> '';

-- Fast child-table lookups by profile
CREATE INDEX IF NOT EXISTS links_profile_id_idx
  ON public.links (profile_id);

CREATE INDEX IF NOT EXISTS tracks_profile_id_idx
  ON public.tracks (profile_id);

-- Compound index: profile + date for upcoming-show queries (gte filter)
CREATE INDEX IF NOT EXISTS shows_profile_date_idx
  ON public.shows (profile_id, date);

-- Compound index: profile + time for analytics queries
CREATE INDEX IF NOT EXISTS analytics_profile_time_idx
  ON public.page_analytics (profile_id, created_at DESC);


-- ── 4. UPDATED_AT AUTO-TRIGGER ─────────────────────────────────────────────────
--
-- Shared function — applied once, reused across all tables that have updated_at.
-- This means you don't need to manually pass updated_at on every UPDATE call;
-- the DB sets it automatically. EpkEditor still passes it explicitly as a safety
-- net but it's not required.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER links_set_updated_at
    BEFORE UPDATE ON public.links
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER epk_set_updated_at
    BEFORE UPDATE ON public.epk
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 5. SIGNUP TRIGGER ──────────────────────────────────────────────────────────
--
-- Fires AFTER every INSERT on auth.users (every new signup).
-- Creates the profile row and the epk row so the app always has valid starting state:
--   - profile: artist_name='', slug='', subscription_tier='free', onboarding_completed=false
--   - epk: all fields null (EpkEditor checks for existing row and UPDATE vs INSERT)
--
-- SECURITY DEFINER is critical — without it, the supabase_auth_admin role
-- cannot write to public.profiles and signup returns "Database error saving new user".
-- SET search_path = '' prevents search_path injection attacks.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Profile row (ON CONFLICT = safe to re-run; trigger fires exactly once per signup)
  INSERT INTO public.profiles (id, artist_name, slug, subscription_tier, onboarding_completed)
  VALUES (NEW.id, '', '', 'free', false)
  ON CONFLICT (id) DO NOTHING;

  -- EPK row — ensures EpkEditor always gets an existing row to UPDATE (not INSERT)
  INSERT INTO public.epk (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();


-- ── 6. ROW LEVEL SECURITY ──────────────────────────────────────────────────────

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epk            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;


-- ── profiles ───────────────────────────────────────────────────────────────────
--
-- Two SELECT policies coexist (PostgreSQL ORs them):
--   • profiles_owner_select  — authenticated user sees their own row (any slug, incl. '')
--   • profiles_public_by_slug — anyone (anon) sees rows where slug is set
--     This powers ArtistPage and EpkPage without requiring login.

DROP POLICY IF EXISTS "profiles_owner_select"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_insert"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_by_slug" ON public.profiles;
-- clean up legacy policy names from earlier migrations
DROP POLICY IF EXISTS "Users can view own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles by slug" ON public.profiles;

CREATE POLICY "profiles_owner_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_public_by_slug" ON public.profiles
  FOR SELECT USING (slug IS NOT NULL AND slug <> '');


-- ── links ───────────────────────────────────────────────────────────────────────
--
-- Two SELECT policies (ORed by Postgres):
--   • links_owner_all  — owner sees all their links (hidden ones too, for the editor)
--   • links_public_read — anyone sees is_visible=true links (powers public artist page)

DROP POLICY IF EXISTS "links_owner_all"   ON public.links;
DROP POLICY IF EXISTS "links_public_read" ON public.links;
DROP POLICY IF EXISTS "Users can manage own links"    ON public.links;
DROP POLICY IF EXISTS "Public can view visible links" ON public.links;

CREATE POLICY "links_owner_all" ON public.links
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "links_public_read" ON public.links
  FOR SELECT USING (is_visible = true);


-- ── tracks ──────────────────────────────────────────────────────────────────────
--
-- Owner sees all their tracks (including ones not on EPK, for the editor).
-- Public sees only tracks with is_on_epk=true (renders on EpkPage).

DROP POLICY IF EXISTS "tracks_owner_all"   ON public.tracks;
DROP POLICY IF EXISTS "tracks_public_read" ON public.tracks;

CREATE POLICY "tracks_owner_all" ON public.tracks
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "tracks_public_read" ON public.tracks
  FOR SELECT USING (is_on_epk = true);


-- ── shows ───────────────────────────────────────────────────────────────────────
--
-- Owner sees all shows (including hidden ones, for the editor).
-- Public sees only is_visible=true shows — the EpkPage additionally filters date >= today
-- client-side via .gte('date', today).

DROP POLICY IF EXISTS "shows_owner_all"   ON public.shows;
DROP POLICY IF EXISTS "shows_public_read" ON public.shows;

CREATE POLICY "shows_owner_all" ON public.shows
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "shows_public_read" ON public.shows
  FOR SELECT USING (is_visible = true);


-- ── epk ─────────────────────────────────────────────────────────────────────────
--
-- EPKs are intentionally public — that's the whole point of a press kit.
-- The owner can manage their own EPK row; anyone can read any EPK.

DROP POLICY IF EXISTS "epk_owner_all"   ON public.epk;
DROP POLICY IF EXISTS "epk_public_read" ON public.epk;

CREATE POLICY "epk_owner_all" ON public.epk
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "epk_public_read" ON public.epk
  FOR SELECT USING (true);


-- ── page_analytics ──────────────────────────────────────────────────────────────
--
-- Writes come from the track-page-event edge function which uses SUPABASE_SERVICE_ROLE_KEY.
-- The service role key bypasses RLS entirely, so no INSERT policy is needed for it.
-- The analytics_service_write policy is here for completeness and future flexibility
-- (e.g. if we ever want to allow client-side event posting without the edge function).
-- Owner read policy lets the artist view their own stats (Phase 5 analytics dashboard).

DROP POLICY IF EXISTS "analytics_owner_read"    ON public.page_analytics;
DROP POLICY IF EXISTS "analytics_service_write" ON public.page_analytics;

CREATE POLICY "analytics_owner_read" ON public.page_analytics
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "analytics_service_write" ON public.page_analytics
  FOR INSERT WITH CHECK (true);


-- ── 7. STORAGE BUCKETS & POLICIES ──────────────────────────────────────────────
--
-- All four buckets are PUBLIC (public=true), meaning the Supabase CDN serves
-- files without auth. This is intentional — artist pages and EPKs are public.
--
-- Upload paths follow the convention: {userId}/{filename}
-- The storage policies enforce that users can only upload to their own folder.
-- Public read is implicit when public=true but we define it explicitly for clarity.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('profile-assets', 'profile-assets', true),
  ('press-photos',   'press-photos',   true),
  ('epk-pdfs',       'epk-pdfs',       true),
  ('track-previews', 'track-previews', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies (idempotent)
DROP POLICY IF EXISTS "profile_assets_owner_upload" ON storage.objects;
DROP POLICY IF EXISTS "profile_assets_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "press_photos_owner_upload"   ON storage.objects;
DROP POLICY IF EXISTS "press_photos_owner_update"   ON storage.objects;
DROP POLICY IF EXISTS "storage_public_read"         ON storage.objects;

-- profile-assets: upload/replace own files
--   Used for: profile photo ({userId}/profile.{ext})
--             banner/cover art ({userId}/banner.{ext})
CREATE POLICY "profile_assets_owner_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-assets'
    AND name LIKE auth.uid()::text || '/%'
  );

CREATE POLICY "profile_assets_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-assets'
    AND name LIKE auth.uid()::text || '/%'
  );

-- press-photos: upload/replace own files
--   Used for: EPK press photos ({userId}/photo-{0..5}.{ext})
CREATE POLICY "press_photos_owner_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'press-photos'
    AND name LIKE auth.uid()::text || '/%'
  );

CREATE POLICY "press_photos_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'press-photos'
    AND name LIKE auth.uid()::text || '/%'
  );

-- Public read: all four buckets (mirrors bucket-level public=true flag)
CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('profile-assets', 'press-photos', 'epk-pdfs', 'track-previews')
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- APPENDIX — Manual Steps (cannot be done in SQL)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- ── A. Frontend Environment Variables ─────────────────────────────────────────
--
--   File: .env.local (git-ignored)
--
--   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
--   VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard → Settings → API>
--
--
-- ── B. Supabase Edge Function Secrets ─────────────────────────────────────────
--
--   Set via: Supabase Dashboard → Edge Functions → Manage secrets
--   Or via CLI: supabase secrets set KEY=value
--
--   ANTHROPIC_API_KEY=sk-ant-...   ← Required by suggest-epk-headline function
--
--   (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are automatically
--    available in all edge functions — you do not need to set these manually.)
--
--
-- ── C. Deploy Edge Functions ───────────────────────────────────────────────────
--
--   supabase functions deploy track-page-event
--   supabase functions deploy suggest-epk-headline
--
--   Or via Supabase Dashboard → Edge Functions → Deploy new function.
--
--
-- ── D. Generate TypeScript Types (optional but recommended) ───────────────────
--
--   After running this migration, generate typed DB client:
--
--   npx supabase gen types typescript \
--     --project-id <project-ref> \
--     > src/types/database.generated.ts
--
--   Then swap the client in src/lib/supabase.ts:
--     import type { Database } from '../types/database.generated'
--     createClient<Database>(url, key)
--
--
-- ── E. Verify Signup Flow ──────────────────────────────────────────────────────
--
--   After running the migration, test a fresh signup and confirm:
--
--   SELECT id, artist_name, slug, onboarding_completed
--   FROM public.profiles
--   ORDER BY created_at DESC LIMIT 5;
--
--   SELECT profile_id, headline, view_count
--   FROM public.epk
--   ORDER BY created_at DESC LIMIT 5;
--
--   Both should have rows immediately after signup (created by handle_new_user).
--
-- ═══════════════════════════════════════════════════════════════════════════════
