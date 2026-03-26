import { useEffect, useRef, useState } from "react";
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

type VisitSource = "tiktok" | "instagram" | "youtube" | "direct";
type LinkSection = "streaming" | "social";
type PreferredPlatform =
  | "spotify"
  | "apple_music"
  | "youtube"
  | "youtube_music"
  | "soundcloud";
type ClickEventType =
  | "click_spotify"
  | "click_apple_music"
  | "click_youtube"
  | "click_soundcloud"
  | "click_instagram"
  | "click_tiktok"
  | "click_twitter"
  | "click_facebook"
  | "click_custom_link";

const TRACKING_ENDPOINT = "/functions/v1/track-page-event";
const VISITOR_TOKEN_KEY = "sw-assist-visitor-token";
const ACTIVE_VISIT_KEY_PREFIX = "sw-assist-active-visit:";
const PAGE_VIEW_SENT_KEY_PREFIX = "sw-assist-page-view-sent:";
const PREFERRED_PLATFORM_KEY = "sw-assist-preferred-platform";
const VISIT_CACHE_TTL_MS = 15_000;
const inFlightVisits = new Map<string, Promise<CreateVisitResult | null>>();

interface CreateVisitResult {
  visitId: string;
  reused: boolean;
}

interface EventMetadata {
  source_param?: VisitSource;
  has_streaming_links?: boolean;
  has_social_links?: boolean;
  visible_link_count?: number;
  link_platform?: string;
  link_label?: string;
  link_position?: number;
  section?: LinkSection;
  destination_domain?: string;
  is_primary?: boolean;
}

function getTrackingHeaders() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!supabaseUrl || !supabaseKey) return null;

  return {
    url: `${supabaseUrl}${TRACKING_ENDPOINT}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
  };
}

function readVisitSource(): VisitSource {
  const raw = new URLSearchParams(window.location.search).get("source");
  if (!raw) return "direct";

  const normalized = raw.trim().toLowerCase();

  switch (normalized) {
    case "tiktok":
      return "tiktok";
    case "ig":
    case "instagram":
      return "instagram";
    case "yt":
    case "youtube":
      return "youtube";
    default:
      return "direct";
  }
}

function getVisitorToken() {
  const existing = window.localStorage.getItem(VISITOR_TOKEN_KEY);
  if (existing) return existing;

  const token =
    window.crypto?.randomUUID?.() ??
    `visitor-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(VISITOR_TOKEN_KEY, token);
  return token;
}

function getDestinationDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getClickEventType(platform: string): ClickEventType {
  switch (platform) {
    case "spotify":
      return "click_spotify";
    case "apple_music":
      return "click_apple_music";
    case "youtube":
    case "youtube_music":
      return "click_youtube";
    case "soundcloud":
      return "click_soundcloud";
    case "instagram":
      return "click_instagram";
    case "tiktok":
      return "click_tiktok";
    case "twitter":
      return "click_twitter";
    case "facebook":
      return "click_facebook";
    default:
      return "click_custom_link";
  }
}

function isPreferredPlatform(value: string | null): value is PreferredPlatform {
  return (
    value === "spotify" ||
    value === "apple_music" ||
    value === "youtube" ||
    value === "youtube_music" ||
    value === "soundcloud"
  );
}

function readPreferredPlatform(): PreferredPlatform | null {
  const value = window.localStorage.getItem(PREFERRED_PLATFORM_KEY);
  return isPreferredPlatform(value) ? value : null;
}

function savePreferredPlatform(platform: PreferredPlatform) {
  window.localStorage.setItem(PREFERRED_PLATFORM_KEY, platform);
}

function reorderStreamingLinks(
  links: Link[],
  preferredPlatform: PreferredPlatform | null,
) {
  if (!preferredPlatform) return links;

  const preferredIndex = links.findIndex((link) => {
    if (preferredPlatform === "youtube") {
      return (
        link.platform === "youtube" || link.platform === "youtube_music"
      );
    }
    return link.platform === preferredPlatform;
  });

  if (preferredIndex <= 0) return links;

  const preferredLink = links[preferredIndex];
  return [
    preferredLink,
    ...links.slice(0, preferredIndex),
    ...links.slice(preferredIndex + 1),
  ];
}

async function createVisit(profileId: string): Promise<CreateVisitResult | null> {
  const pageKey = `${ACTIVE_VISIT_KEY_PREFIX}${window.location.pathname}${window.location.search}`;
  const cachedVisit = window.sessionStorage.getItem(pageKey);

  if (cachedVisit) {
    try {
      const parsed = JSON.parse(cachedVisit) as {
        id: string;
        createdAt: number;
      };
      if (Date.now() - parsed.createdAt < VISIT_CACHE_TTL_MS) {
        return { visitId: parsed.id, reused: true };
      }
      window.sessionStorage.removeItem(pageKey);
    } catch {
      window.sessionStorage.removeItem(pageKey);
    }
  }

  const existingRequest = inFlightVisits.get(pageKey);
  if (existingRequest) {
    return existingRequest;
  }

  const tracking = getTrackingHeaders();
  if (!tracking) return null;

  const request = (async () => {
    try {
      const response = await fetch(tracking.url, {
        method: "POST",
        headers: tracking.headers,
        body: JSON.stringify({
          operation: "create_visit",
          profile_id: profileId,
          source: readVisitSource(),
          visitor_token: getVisitorToken(),
        }),
      });

      if (!response.ok) return null;

      const json = (await response.json()) as { visit_id?: string };
      const visitId = json.visit_id ?? null;
      if (!visitId) return null;

      window.sessionStorage.setItem(
        pageKey,
        JSON.stringify({ id: visitId, createdAt: Date.now() }),
      );

      return { visitId, reused: false };
    } catch {
      return null;
    } finally {
      inFlightVisits.delete(pageKey);
    }
  })();

  inFlightVisits.set(pageKey, request);
  return request;
}

function trackEvent(
  profileId: string,
  visitId: string,
  eventType: string,
  metadata?: EventMetadata,
  linkId?: string,
) {
  const tracking = getTrackingHeaders();
  if (!tracking) return;

  fetch(tracking.url, {
    method: "POST",
    headers: tracking.headers,
    keepalive: true,
    body: JSON.stringify({
      operation: "track_event",
      visit_id: visitId,
      profile_id: profileId,
      event_type: eventType,
      link_id: linkId ?? null,
      metadata: metadata ?? null,
    }),
  }).catch(() => {
    // fire-and-forget — never block the user
  });
}

function updateVisitPreference(
  profileId: string,
  visitId: string,
  preferredPlatform: PreferredPlatform,
) {
  const tracking = getTrackingHeaders();
  if (!tracking) return;

  fetch(tracking.url, {
    method: "POST",
    headers: tracking.headers,
    keepalive: true,
    body: JSON.stringify({
      operation: "update_visit_preference",
      visit_id: visitId,
      profile_id: profileId,
      preferred_platform: preferredPlatform,
    }),
  }).catch(() => {
    // fire-and-forget — never block the user
  });
}

function markPageViewSent(visitId: string) {
  window.sessionStorage.setItem(`${PAGE_VIEW_SENT_KEY_PREFIX}${visitId}`, "1");
}

function hasSentPageView(visitId: string) {
  return (
    window.sessionStorage.getItem(`${PAGE_VIEW_SENT_KEY_PREFIX}${visitId}`) ===
    "1"
  );
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
  const visitIdRef = useRef<string | null>(null);

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

      const visit = await createVisit(profileData.id);
      if (visit) {
        visitIdRef.current = visit.visitId;
        if (!hasSentPageView(visit.visitId)) {
          markPageViewSent(visit.visitId);
          trackEvent(
            profileData.id,
            visit.visitId,
            "page_view",
            {
              source_param: readVisitSource(),
              has_streaming_links:
                (linksData ?? []).some((l) => !SOCIAL_PLATFORMS.has(l.platform)),
              has_social_links:
                (linksData ?? []).some((l) => SOCIAL_PLATFORMS.has(l.platform)),
              visible_link_count: (linksData ?? []).length,
            },
          );
        }
      }
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
  const orderedStreamingLinks = reorderStreamingLinks(
    streamingLinks,
    readPreferredPlatform(),
  );
  const sourceParam = readVisitSource();

  function trackArtistPageEvent(
    eventType: string,
    options?: {
      link?: Link;
      section?: LinkSection;
      position?: number;
      metadata?: EventMetadata;
    },
  ) {
    if (!profile) return;

    const visitId = visitIdRef.current;
    if (!visitId) return;

    const metadata: EventMetadata = {
      source_param: sourceParam,
      ...options?.metadata,
    };

    if (
      options?.link &&
      options.section !== undefined &&
      options.position !== undefined
    ) {
      metadata.link_platform = options.link.platform;
      metadata.link_label = linkLabel(options.link);
      metadata.link_position = options.position;
      metadata.section = options.section;
      metadata.destination_domain =
        getDestinationDomain(options.link.url) ?? undefined;
      metadata.is_primary = false;
    }

    trackEvent(profile.id, visitId, eventType, metadata, options?.link?.id);
  }

  function handleLinkPress(
    link: Link,
    section: LinkSection,
    position: number,
  ) {
    const visitId = visitIdRef.current;

    if (section === "streaming") {
      const preferredPlatform =
        link.platform === "youtube_music"
          ? "youtube"
          : isPreferredPlatform(link.platform)
            ? link.platform
            : null;

      if (preferredPlatform) {
        savePreferredPlatform(preferredPlatform);
        if (profile && visitId) {
          updateVisitPreference(profile.id, visitId, preferredPlatform);
        }
      }
    }

    trackArtistPageEvent(getClickEventType(link.platform), {
      link,
      section,
      position,
    });

    window.open(link.url, "_blank", "noopener,noreferrer");
  }

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
            {orderedStreamingLinks.length > 0 && (
              <div className="w-full flex flex-col gap-3">
                {orderedStreamingLinks.map((link, index) => (
                  <LinkButton
                    key={link.id}
                    link={link}
                    onPress={() => handleLinkPress(link, "streaming", index)}
                  />
                ))}
              </div>
            )}

            {/* Social media icon row */}
            {socialLinks.length > 0 && (
              <div className="flex gap-3">
                {socialLinks.map((link, index) => (
                  <button
                    key={link.id}
                    onClick={() => handleLinkPress(link, "social", index)}
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
