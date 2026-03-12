import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useColorExtractor } from "../../hooks/useColorExtractor";
import { PLATFORM_LABELS, SOCIAL_PLATFORMS } from "../../lib/constants";
import type { Profile, Link } from "../../types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trackEvent(
  profileId: string,
  eventType: "page_view" | "link_click",
  linkId?: string,
) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!supabaseUrl) return;

  fetch(`${supabaseUrl}/functions/v1/track-page-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      profile_id: profileId,
      event_type: eventType,
      link_id: linkId ?? null,
    }),
  }).catch(() => {
    // fire-and-forget — never block the user
  });
}

function linkLabel(link: Link): string {
  if (link.label && link.label !== link.platform) return link.label;
  return PLATFORM_LABELS[link.platform] ?? link.label ?? "Link";
}

// ─── TikTok icon (not in lucide-react) ────────────────────────────────────────

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34v-7a8.16 8.16 0 0 0 4.84 1.56V6.42a4.85 4.85 0 0 1-1.07-.73z" />
    </svg>
  );
}

// ─── Social icon ──────────────────────────────────────────────────────────────

function SocialIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "instagram":
      return <Instagram size={18} />;
    case "tiktok":
      return <TikTokIcon size={18} />;
    case "twitter":
      return <Twitter size={18} />;
    case "facebook":
      return <Facebook size={18} />;
    case "youtube":
      return <Youtube size={18} />;
    default:
      return <ExternalLink size={18} />;
  }
}

// ─── Link button (streaming / music platforms) ────────────────────────────────

function LinkButton({ link, onPress }: { link: Link; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.98] backdrop-blur-sm border border-white/20 text-white font-semibold text-sm transition-all duration-150"
    >
      {linkLabel(link)}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ArtistPage() {
  const { artistSlug, pageSlug } = useParams<{
    artistSlug: string;
    pageSlug: string;
  }>();
  const slug = artistSlug && pageSlug ? `${artistSlug}/${pageSlug}` : null;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { colors } = useColorExtractor(profile?.banner_photo_url);

  // ── Fetch profile + links ──────────────────────────────────────────────────

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

      const { data: linksData } = await supabase
        .from("links")
        .select("*")
        .eq("profile_id", profileData.id)
        .eq("is_visible", true)
        .order("display_order");

      setLinks(linksData ?? []);
      setLoading(false);

      // Track page view
      trackEvent(profileData.id, "page_view");
    }

    load();
  }, [slug]);

  // ── Gradient style ─────────────────────────────────────────────────────────

  const gradientStyle = {
    background: `linear-gradient(160deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
    minHeight: "100dvh",
  } as React.CSSProperties;

  // ── States ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={gradientStyle} className="flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-white/50 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-dvh bg-[var(--color-black)] flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-[var(--color-text-primary)] text-xl font-bold">
          Page not found
        </p>
        <p className="text-[var(--color-text-muted)] text-sm text-center">
          This artist page doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  // ── Split links ────────────────────────────────────────────────────────────

  const streamingLinks = links.filter((l) => !SOCIAL_PLATFORMS.has(l.platform));
  const socialLinks = links.filter((l) => SOCIAL_PLATFORMS.has(l.platform));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={gradientStyle}>
      <div
        className="min-h-dvh flex flex-col items-center px-6 py-16"
        style={{
          background:
            "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,.6) 100%)",
        }}
      >
        <div className="w-full max-w-sm header relative">
          {/* Blurred cover art background — fades out at the bottom into the page gradient */}
          {profile.banner_photo_url && (
            <div
              className="absolute inset-0 rounded-3xl overflow-hidden"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0%, transparent 50%)",
                maskImage:
                  "linear-gradient(to bottom, black 0%, transparent 50%)",
              }}
            >
              <img
                src={profile.banner_photo_url}
                alt=""
                aria-hidden={true}
                crossOrigin="anonymous"
                className="absolute inset-0 w-full h-full object-cover scale-108 blur-xl"
              />
              {/* Dark overlay so content pops */}
              <div className="absolute inset-0 bg-black/50" />
            </div>
          )}

          {/* Content */}
          <div className="relative flex flex-col items-center gap-6 px-5 pt-10 pb-8">
            {/* Cover art */}
            {profile.banner_photo_url ? (
              <img
                src={profile.banner_photo_url}
                alt={profile.artist_name ?? "Artist"}
                crossOrigin="anonymous"
                className="w-36 h-36 rounded-2xl object-cover shadow-2xl"
              />
            ) : (
              <div className="w-36 h-36 rounded-2xl bg-white/10 shadow-2xl" />
            )}

            {/* Artist info */}
            <div className="text-center flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-white leading-tight drop-shadow-sm">
                {profile.artist_name}
              </h1>

              {profile.genre && profile.genre.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {profile.genre.map((g) => (
                    <span
                      key={g}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-medium text-white/70 bg-white/10 border border-white/15"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Streaming / music links */}
            {streamingLinks.length > 0 && (
              <div className="w-full flex flex-col gap-3">
                {streamingLinks.map((link) => (
                  <LinkButton
                    key={link.id}
                    link={link}
                    onPress={() => {
                      trackEvent(profile.id, "link_click", link.id);
                      window.open(link.url, "_blank", "noopener,noreferrer");
                    }}
                  />
                ))}
              </div>
            )}

            {/* Social media icon row */}
            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      trackEvent(profile.id, "link_click", link.id);
                      window.open(link.url, "_blank", "noopener,noreferrer");
                    }}
                    aria-label={linkLabel(link)}
                    className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-all duration-150"
                  >
                    <SocialIcon platform={link.platform} />
                  </button>
                ))}
              </div>
            )}

            {/* Footer */}
            <p className="text-[10px] text-white/30 mt-4 tracking-widest uppercase">
              Small World Assist
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
