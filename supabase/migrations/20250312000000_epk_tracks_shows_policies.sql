-- ── Tracks ────────────────────────────────────────────────────────────────────

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD
CREATE POLICY "tracks_owner_all" ON tracks
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Public: read tracks that are on an EPK
CREATE POLICY "tracks_public_read" ON tracks
  FOR SELECT
  USING (is_on_epk = true);

-- ── Shows ─────────────────────────────────────────────────────────────────────

ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD
CREATE POLICY "shows_owner_all" ON shows
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Public: read visible shows
CREATE POLICY "shows_public_read" ON shows
  FOR SELECT
  USING (is_visible = true);

-- ── EPK ───────────────────────────────────────────────────────────────────────

ALTER TABLE epk ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD
CREATE POLICY "epk_owner_all" ON epk
  FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Public: read all EPKs (press kit is meant to be shared)
CREATE POLICY "epk_public_read" ON epk
  FOR SELECT
  USING (true);
