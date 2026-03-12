export const GENRES = [
  "Hip-Hop",
  "R&B",
  "Pop",
  "Electronic",
  "Rock",
  "Indie",
  "Jazz",
  "Soul",
  "Afrobeats",
  "Latin",
  "Reggaeton",
  "Country",
  "Trap",
  "Classical",
  "Gospel",
  "Reggae",
  "Folk",
  "Blues",
  "Disco",
  "Funk",
  "Salsa",
  "Tango",
  "Vallenato",
  "Zouk",
  "Zydeco",
  "Samba",
  "Bachata",
  "Merengue",
  "Cumbia",
  "Soca",
  "Calypso",
];

export const PLATFORM_PRESETS = [
  {
    platform: "spotify",
    label: "Spotify",
    placeholder: "https://open.spotify.com/artist/...",
  },
  {
    platform: "apple_music",
    label: "Apple Music",
    placeholder: "https://music.apple.com/...",
  },
  {
    platform: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/...",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@...",
  },
  {
    platform: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@...",
  },
];

export const PRIMARY_GOALS = [
  "Grow my streaming numbers",
  "Land a sync placement",
  "Book more shows",
  "Get on playlists",
  "Attract label attention",
  "Build my fanbase",
];

export const CAREER_STAGES = [
  { value: "just_starting", label: "Just starting out" },
  { value: "building", label: "Building momentum" },
  { value: "established", label: "Established indie" },
  { value: "scaling", label: "Scaling up" },
];

export const RELEASE_TIMELINES = [
  { value: "asap", label: "ASAP" },
  { value: "1_3_months", label: "1–3 months" },
  { value: "3_6_months", label: "3–6 months" },
  { value: "no_release", label: "No release planned" },
];

// Odesli (song.link) API platform key → our platform value + display label
export const ODESLI_PLATFORM_MAP: Record<
  string,
  { platform: string; label: string }
> = {
  spotify: { platform: "spotify", label: "Spotify" },
  appleMusic: { platform: "apple_music", label: "Apple Music" },
  youtube: { platform: "youtube", label: "YouTube" },
  youtubeMusic: { platform: "youtube_music", label: "YouTube Music" },
  soundcloud: { platform: "soundcloud", label: "SoundCloud" },
  tidal: { platform: "custom", label: "Tidal" },
  deezer: { platform: "custom", label: "Deezer" },
  amazonMusic: { platform: "custom", label: "Amazon Music" },
  pandora: { platform: "custom", label: "Pandora" },
};

// Platforms treated as social media (shown as icons, not buttons)
export const SOCIAL_PLATFORMS = new Set([
  "instagram",
  "tiktok",
  "twitter",
  "facebook",
]);

// Platform display labels used on the public artist page
export const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  youtube_music: "YouTube Music",
  soundcloud: "SoundCloud",
  twitter: "Twitter / X",
  facebook: "Facebook",
  website: "Website",
  custom: "Link",
};
