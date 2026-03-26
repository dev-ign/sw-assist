import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, Star } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Epk, Profile, Show, Track } from "../../types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATS_LABELS: Record<string, string> = {
  monthly_listeners: "Monthly Listeners",
  spotify_followers: "Spotify Followers",
  instagram_followers: "Instagram",
  tiktok_followers: "TikTok",
  youtube_subscribers: "YouTube",
  total_streams: "Total Streams",
};

const STATS_COLORS: Record<string, string> = {
  monthly_listeners: "#1DB954", // Spotify green
  spotify_followers: "#1DB954", // Spotify green
  instagram_followers: "#E4405F", // Instagram pink
  tiktok_followers: "#25F4EE", // TikTok turquoise
  youtube_subscribers: "#FF0000", // YouTube red
  total_streams: "#a3a3a3", // neutral (text-secondary)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
  });
}

function formatDay(dateStr: string) {
  return new Date(dateStr + "T00:00:00").getDate();
}

function formatReleaseDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EpkPage() {
  const { artistSlug, pageSlug } = useParams<{
    artistSlug: string;
    pageSlug: string;
  }>();
  const slug = artistSlug && pageSlug ? `${artistSlug}/${pageSlug}` : null;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [epk, setEpk] = useState<Epk | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const today = new Date().toISOString().split("T")[0];

      const [epkRes, tracksRes, showsRes] = await Promise.all([
        supabase
          .from("epk")
          .select("*")
          .eq("profile_id", profileData.id)
          .maybeSingle(),
        supabase
          .from("tracks")
          .select("*")
          .eq("profile_id", profileData.id)
          .eq("is_on_epk", true)
          .order("is_featured", { ascending: false }),
        supabase
          .from("shows")
          .select("*")
          .eq("profile_id", profileData.id)
          .eq("is_visible", true)
          .gte("date", today)
          .order("date"),
      ]);

      setEpk(epkRes.data);
      setTracks(tracksRes.data ?? []);
      setShows(showsRes.data ?? []);
      setLoading(false);
    }

    load();
  }, [slug]);

  // ── States ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-dvh bg-black flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-text-primary text-xl font-bold">
          Press kit not found
        </p>
        <p className="text-text-muted text-sm text-center">
          This EPK doesn't exist or hasn't been published yet.
        </p>
      </div>
    );
  }

  const statsEntries = Object.entries(
    (epk?.stats_snapshot ?? {}) as Record<string, string>,
  ).filter(([, v]) => v);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-black">
      {/* ── Header ── */}
      <div className="relative overflow-hidden">
        {/* Blurred background */}
        {(profile.banner_photo_url || profile.profile_photo_url) && (
          <div className="absolute inset-0">
            <img
              src={profile.banner_photo_url ?? profile.profile_photo_url!}
              alt=""
              aria-hidden={true}
              className="w-full h-full object-cover scale-110 blur-2xl opacity-25"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, var(--color-black) 100%)",
              }}
            />
          </div>
        )}

        <div className="relative px-6 pt-16 pb-10 flex flex-col items-center text-center max-w-lg mx-auto">
          {/* Artist photo */}
          {(profile.banner_photo_url || profile.profile_photo_url) && (
            <img
              src={profile.banner_photo_url ?? profile.profile_photo_url!}
              alt={profile.artist_name ?? "Artist"}
              className="w-28 h-28 rounded-2xl object-cover shadow-2xl mb-5"
            />
          )}

          <h1 className="text-3xl font-bold text-white leading-tight">
            {profile.artist_name}
          </h1>

          {epk?.headline && (
            <p className="text-sm text-white/65 mt-2 leading-snug">
              {epk.headline}
            </p>
          )}

          {profile.location && (
            <p className="text-xs text-white/45 mt-1.5">{profile.location}</p>
          )}

          {/* Genre tags */}
          {profile.genre && profile.genre.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {profile.genre.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-medium text-white/60 bg-white/10 border border-white/10"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Stats chips */}
          {statsEntries.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {statsEntries.map(([k, v]) => {
                const color = STATS_COLORS[k] ?? "#a3a3a3";
                return (
                  <div
                    key={k}
                    className="px-3 py-2 rounded-xl text-center"
                    style={{
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: color,
                      backgroundColor: `${color}33`,
                    }}
                  >
                    <p className="text-sm font-bold text-white">{v}</p>
                    <p className="text-[10px] text-white/60 mt-0.5">
                      {STATS_LABELS[k] ?? k}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Content sections ── */}
      <div className="px-5 pb-16 max-w-lg mx-auto flex flex-col gap-10">
        {/* Bio */}
        {(epk?.bio_override || profile.bio) && (
          <section>
            <h2 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-text-muted mb-3">
              About
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {epk?.bio_override || profile.bio}
            </p>
          </section>
        )}

        {/* Press Photos */}
        {epk?.press_photos && epk.press_photos.length > 0 && (
          <section>
            <h2 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-text-muted mb-3">
              Press Photos
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {epk.press_photos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-xl overflow-hidden block"
                >
                  <img
                    src={url}
                    alt={`Press photo ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </a>
              ))}
            </div>
            <p className="text-[10px] text-text-muted mt-2">
              Click to open full resolution
            </p>
          </section>
        )}

        {/* Tracks */}
        {tracks.length > 0 && (
          <section>
            <h2 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-text-muted mb-3">
              Music
            </h2>
            <div className="flex flex-col gap-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 rounded-xl bg-surface border border-border p-3"
                >
                  {track.is_featured && (
                    <Star
                      size={14}
                      className="text-yellow-400 shrink-0"
                      fill="currentColor"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {track.title}
                    </p>
                    {track.release_date && (
                      <p className="text-[10px] text-text-muted">
                        {formatReleaseDate(track.release_date)}
                      </p>
                    )}
                  </div>
                  {track.streaming_url && (
                    <a
                      href={track.streaming_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-3 py-1.5 rounded-full bg-accent-subtle border border-accent/30 text-xs font-medium text-accent hover:bg-accent hover:text-white transition-all"
                    >
                      Listen
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shows */}
        {shows.length > 0 && (
          <section>
            <h2 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-text-muted mb-3">
              Upcoming Shows
            </h2>
            <div className="flex flex-col gap-2">
              {shows.map((show) => (
                <div
                  key={show.id}
                  className="flex items-center gap-3 rounded-xl bg-surface border border-border p-3"
                >
                  {/* Date block */}
                  <div className="shrink-0 text-center w-10">
                    <p className="text-[9px] font-semibold uppercase text-text-muted">
                      {formatMonth(show.date)}
                    </p>
                    <p className="text-xl font-bold text-text-primary leading-none">
                      {formatDay(show.date)}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {show.venue_name}
                    </p>
                    <p className="text-xs text-text-muted">{show.city}</p>
                  </div>

                  {show.is_headline && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-accent-subtle border border-accent/30 text-[10px] font-medium text-accent">
                      Headline
                    </span>
                  )}

                  {show.ticket_url && (
                    <a
                      href={show.ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1.5 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Get tickets"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-text-muted pb-10 tracking-widest uppercase">
        Small World Assist
      </p>
    </div>
  );
}
