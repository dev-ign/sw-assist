import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Copy,
  ExternalLink,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import type { Epk } from "../../types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrackRow {
  id?: string;
  title: string;
  streaming_url: string;
  release_date: string;
  is_featured: boolean;
  is_on_epk: boolean;
}

interface ShowRow {
  id?: string;
  venue_name: string;
  city: string;
  date: string;
  ticket_url: string;
  is_headline: boolean;
  is_visible: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATS_FIELDS = [
  { key: "monthly_listeners", label: "Monthly Spotify Listeners" },
  { key: "spotify_followers", label: "Spotify Followers" },
  { key: "instagram_followers", label: "Instagram Followers" },
  { key: "tiktok_followers", label: "TikTok Followers" },
  { key: "youtube_subscribers", label: "YouTube Subscribers" },
  { key: "total_streams", label: "Total Streams" },
] as const;

const MAX_PHOTOS = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-text-muted mb-4">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-border-subtle my-8" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EpkEditor() {
  const { user, profile } = useAuth();

  // EPK row fields
  const [epkId, setEpkId] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [bioOverride, setBioOverride] = useState("");
  const [pressPhotos, setPressPhotos] = useState<string[]>([]);
  const [statsSnapshot, setStatsSnapshot] = useState<Record<string, string>>(
    {},
  );

  // Tracks + Shows
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [shows, setShows] = useState<ShowRow[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [suggestingHeadline, setSuggestingHeadline] = useState(false);
  const [photoUploading, setPhotoUploading] = useState<number | null>(null);

  const photoRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Public EPK URL ──────────────────────────────────────────────────────────

  const publicUrl = profile?.slug
    ? `${window.location.origin}/${profile.slug}/epk`
    : null;

  // ── Load data ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);

      const [epkRes, tracksRes, showsRes] = await Promise.all([
        supabase
          .from("epk")
          .select("*")
          .eq("profile_id", user!.id)
          .maybeSingle(),
        supabase
          .from("tracks")
          .select("*")
          .eq("profile_id", user!.id)
          .order("created_at"),
        supabase
          .from("shows")
          .select("*")
          .eq("profile_id", user!.id)
          .order("date"),
      ]);

      if (epkRes.data) {
        const e = epkRes.data as Epk;
        setEpkId(e.id);
        setHeadline(e.headline ?? "");
        setBioOverride(e.bio_override ?? "");
        setPressPhotos(e.press_photos ?? []);
        setStatsSnapshot((e.stats_snapshot ?? {}) as Record<string, string>);
      }

      setTracks(
        (tracksRes.data ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          streaming_url: t.streaming_url ?? "",
          release_date: t.release_date ?? "",
          is_featured: t.is_featured,
          is_on_epk: t.is_on_epk,
        })),
      );

      setShows(
        (showsRes.data ?? []).map((s) => ({
          id: s.id,
          venue_name: s.venue_name,
          city: s.city,
          date: s.date,
          ticket_url: s.ticket_url ?? "",
          is_headline: s.is_headline,
          is_visible: s.is_visible,
        })),
      );

      setLoading(false);
    }

    load();
  }, [user]);

  // ── Press photo upload ──────────────────────────────────────────────────────

  async function handlePhotoUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    slotIndex: number,
  ) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setPhotoUploading(slotIndex);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/photo-${slotIndex}.${ext}`;

    const { error } = await supabase.storage
      .from("press-photos")
      .upload(path, file, { upsert: true });

    if (!error) {
      const { data: urlData } = supabase.storage
        .from("press-photos")
        .getPublicUrl(path);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      setPressPhotos((prev) => {
        const next = [...prev];
        next[slotIndex] = url;
        return next;
      });
      setSaved(false);
    }

    setPhotoUploading(null);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPressPhotos((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  // ── Track management ────────────────────────────────────────────────────────

  function addTrack() {
    setTracks((prev) => [
      ...prev,
      {
        title: "",
        streaming_url: "",
        release_date: "",
        is_featured: false,
        is_on_epk: true,
      },
    ]);
    setSaved(false);
  }

  function updateTrack(
    index: number,
    field: keyof Omit<TrackRow, "id">,
    value: string | boolean,
  ) {
    setTracks((prev) =>
      prev.map((t, i) => {
        if (i !== index) {
          // Unset is_featured on others when setting a new one
          if (field === "is_featured" && value === true) {
            return { ...t, is_featured: false };
          }
          return t;
        }
        return { ...t, [field]: value };
      }),
    );
    setSaved(false);
  }

  function removeTrack(index: number) {
    setTracks((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  // ── Show management ─────────────────────────────────────────────────────────

  function addShow() {
    setShows((prev) => [
      ...prev,
      {
        venue_name: "",
        city: "",
        date: "",
        ticket_url: "",
        is_headline: false,
        is_visible: true,
      },
    ]);
    setSaved(false);
  }

  function updateShow(
    index: number,
    field: keyof Omit<ShowRow, "id">,
    value: string | boolean,
  ) {
    setShows((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
    setSaved(false);
  }

  function removeShow(index: number) {
    setShows((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  // ── AI headline suggestion ──────────────────────────────────────────────────

  async function handleSuggestHeadline() {
    setSuggestingHeadline(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(
        `${supabaseUrl}/functions/v1/suggest-epk-headline`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        },
      );

      if (!res.ok) throw new Error("Request failed");

      const { headline: suggested } = await res.json();
      if (suggested) {
        setHeadline(suggested);
        setSaved(false);
      }
    } catch {
      // Silently fail — user can still write manually
    } finally {
      setSuggestingHeadline(false);
    }
  }

  // ── Copy URL ────────────────────────────────────────────────────────────────

  function copyPublicUrl() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    const statsToSave = Object.fromEntries(
      Object.entries(statsSnapshot).filter(([, v]) => v?.trim()),
    );

    // Upsert EPK row
    if (epkId) {
      await supabase
        .from("epk")
        .update({
          headline: headline.trim() || null,
          bio_override: bioOverride.trim() || null,
          press_photos: pressPhotos,
          stats_snapshot: statsToSave,
          updated_at: new Date().toISOString(),
        })
        .eq("id", epkId);
    } else {
      const { data } = await supabase
        .from("epk")
        .insert({
          profile_id: user.id,
          headline: headline.trim() || null,
          bio_override: bioOverride.trim() || null,
          press_photos: pressPhotos,
          stats_snapshot: statsToSave,
        })
        .select("id")
        .maybeSingle();
      if (data) setEpkId(data.id);
    }

    // Tracks: delete + re-insert (established codebase pattern)
    await supabase.from("tracks").delete().eq("profile_id", user.id);
    const tracksToInsert = tracks
      .filter((t) => t.title.trim())
      .map((t) => ({
        profile_id: user.id,
        title: t.title.trim(),
        streaming_url: t.streaming_url.trim() || null,
        release_date: t.release_date || null,
        is_featured: t.is_featured,
        is_on_epk: t.is_on_epk,
      }));
    if (tracksToInsert.length > 0) {
      await supabase.from("tracks").insert(tracksToInsert);
    }

    // Shows: delete + re-insert
    await supabase.from("shows").delete().eq("profile_id", user.id);
    const showsToInsert = shows
      .filter((s) => s.venue_name.trim() && s.date)
      .map((s) => ({
        profile_id: user.id,
        venue_name: s.venue_name.trim(),
        city: s.city.trim(),
        date: s.date,
        ticket_url: s.ticket_url.trim() || null,
        is_headline: s.is_headline,
        is_visible: s.is_visible,
      }));
    if (showsToInsert.length > 0) {
      await supabase.from("shows").insert(showsToInsert);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">EPK</h1>
          <p className="text-xs text-text-muted">Electronic Press Kit</p>
        </div>
        <div className="flex items-center gap-2">
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Preview <ExternalLink size={12} />
            </a>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={saving}
          >
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      <div className="px-5 py-8 flex flex-col gap-0">
        {/* ── Public Link ── */}
        <SectionLabel>Public EPK Link</SectionLabel>
        {publicUrl ? (
          <button
            onClick={copyPublicUrl}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left group"
          >
            <span className="flex-1 text-xs text-text-muted font-mono truncate">
              {publicUrl.replace(/^https?:\/\//, "")}
            </span>
            <span className="shrink-0 text-text-muted group-hover:text-text-primary transition-colors">
              {copied ? (
                <Check size={14} className="text-success" />
              ) : (
                <Copy size={14} />
              )}
            </span>
          </button>
        ) : (
          <p className="text-xs text-text-muted bg-surface rounded-xl border border-border-subtle px-4 py-3">
            Set your page URL in the{" "}
            <a href="/page" className="text-accent">
              Page editor
            </a>{" "}
            first to activate your public EPK link.
          </p>
        )}

        <Divider />

        {/* ── Headline ── */}
        <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1 mb-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-text-muted">
            Headline
          </p>
          <button
            onClick={handleSuggestHeadline}
            disabled={suggestingHeadline}
            className="flex items-center gap-1.5 text-[11px] font-medium text-accent disabled:opacity-50 transition-opacity"
          >
            {suggestingHeadline ? (
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {suggestingHeadline ? "Generating…" : "Use Assist"}
          </button>
        </div>
        <Input
          placeholder={`${profile?.artist_name ?? "Artist"} — Genre-bending artist from City`}
          value={headline}
          onChange={(e) => {
            setHeadline(e.target.value);
            setSaved(false);
          }}
        />
        <p className="text-xs text-text-muted mt-2">
          A one-liner for blogs, bookers, and playlist curators.
        </p>

        <Divider />

        {/* ── Bio ── */}
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Bio</SectionLabel>
          {profile?.bio && !bioOverride && (
            <button
              onClick={() => {
                setBioOverride(profile.bio!);
                setSaved(false);
              }}
              className="text-xs text-accent font-medium -mt-4"
            >
              Use profile bio
            </button>
          )}
        </div>
        <Textarea
          placeholder="Write an EPK-specific bio for press and industry contacts..."
          value={bioOverride}
          onChange={(e) => {
            setBioOverride(e.target.value);
            setSaved(false);
          }}
          rows={5}
        />

        <Divider />

        {/* ── Press Photos ── */}
        <SectionLabel>Press Photos</SectionLabel>
        <p className="text-xs text-text-muted -mt-2 mb-4">
          High-quality photos for media use. Up to {MAX_PHOTOS}.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
            const url = pressPhotos[i];
            return (
              <div key={i} className="relative aspect-square">
                {url ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={url}
                      alt={`Press photo ${i + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => photoRefs.current[i]?.click()}
                        className="p-1.5 rounded-lg bg-white/20 text-white"
                        disabled={photoUploading !== null}
                      >
                        <Camera size={13} />
                      </button>
                      <button
                        onClick={() => removePhoto(i)}
                        className="p-1.5 rounded-lg bg-white/20 text-white"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {photoUploading === i && (
                      <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => photoRefs.current[i]?.click()}
                    disabled={photoUploading !== null}
                    className="w-full h-full rounded-xl border-2 border-dashed border-border hover:border-accent transition-colors flex flex-col items-center justify-center gap-1 text-text-muted hover:text-accent"
                  >
                    {photoUploading === i ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera size={16} />
                        <span className="text-[10px]">Add</span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={(el) => {
                    photoRefs.current[i] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, i)}
                />
              </div>
            );
          })}
        </div>

        <Divider />

        {/* ── Tracks ── */}
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Tracks</SectionLabel>
          <button
            onClick={addTrack}
            className="flex items-center gap-1 text-xs text-accent font-medium"
          >
            <Plus size={14} /> Add track
          </button>
        </div>

        {tracks.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">
            No tracks yet. Add your music to the EPK.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {tracks.map((track, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateTrack(i, "is_featured", !track.is_featured)
                    }
                    aria-label={
                      track.is_featured ? "Unmark featured" : "Mark as featured"
                    }
                    className={[
                      "shrink-0 p-1 rounded-md transition-colors",
                      track.is_featured
                        ? "text-yellow-400"
                        : "text-text-muted hover:text-text-primary",
                    ].join(" ")}
                  >
                    <Star
                      size={15}
                      fill={track.is_featured ? "currentColor" : "none"}
                    />
                  </button>
                  <input
                    value={track.title}
                    onChange={(e) => updateTrack(i, "title", e.target.value)}
                    placeholder="Track title"
                    className="flex-1 bg-transparent text-sm font-medium text-text-primary outline-none"
                  />
                  <button
                    onClick={() => removeTrack(i)}
                    className="p-1.5 rounded-md text-text-muted hover:text-error transition-colors"
                    aria-label="Remove track"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={track.streaming_url}
                    onChange={(e) =>
                      updateTrack(i, "streaming_url", e.target.value)
                    }
                    placeholder="Spotify / Apple Music URL"
                    className="flex-1 bg-surface-raised rounded-lg px-3 py-2 text-xs text-text-secondary outline-none focus:ring-1 focus:ring-accent border border-transparent focus:border-accent transition-all"
                  />
                  <input
                    value={track.release_date}
                    onChange={(e) =>
                      updateTrack(i, "release_date", e.target.value)
                    }
                    type="date"
                    className="w-32 bg-surface-raised rounded-lg px-3 py-2 text-xs text-text-secondary outline-none focus:ring-1 focus:ring-accent border border-transparent focus:border-accent transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Divider />

        {/* ── Shows ── */}
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Shows</SectionLabel>
          <button
            onClick={addShow}
            className="flex items-center gap-1 text-xs text-accent font-medium"
          >
            <Plus size={14} /> Add show
          </button>
        </div>

        {shows.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">
            No shows yet. Add upcoming dates.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {shows.map((show, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={show.venue_name}
                    onChange={(e) =>
                      updateShow(i, "venue_name", e.target.value)
                    }
                    placeholder="Venue name"
                    className="flex-1 bg-transparent text-sm font-medium text-text-primary outline-none"
                  />
                  <button
                    onClick={() => removeShow(i)}
                    className="p-1.5 rounded-md text-text-muted hover:text-error transition-colors"
                    aria-label="Remove show"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={show.city}
                    onChange={(e) => updateShow(i, "city", e.target.value)}
                    placeholder="City"
                    className="flex-1 bg-surface-raised rounded-lg px-3 py-2 text-xs text-text-secondary outline-none focus:ring-1 focus:ring-accent border border-transparent focus:border-accent transition-all"
                  />
                  <input
                    value={show.date}
                    onChange={(e) => updateShow(i, "date", e.target.value)}
                    type="date"
                    className="w-36 bg-surface-raised rounded-lg px-3 py-2 text-xs text-text-secondary outline-none focus:ring-1 focus:ring-accent border border-transparent focus:border-accent transition-all"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    value={show.ticket_url}
                    onChange={(e) =>
                      updateShow(i, "ticket_url", e.target.value)
                    }
                    placeholder="Ticket URL (optional)"
                    className="flex-1 bg-surface-raised rounded-lg px-3 py-2 text-xs text-text-secondary outline-none focus:ring-1 focus:ring-accent border border-transparent focus:border-accent transition-all"
                  />
                  <button
                    onClick={() =>
                      updateShow(i, "is_headline", !show.is_headline)
                    }
                    className={[
                      "shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all",
                      show.is_headline
                        ? "bg-accent border-accent text-white"
                        : "bg-transparent border-border text-text-muted",
                    ].join(" ")}
                  >
                    Headline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Divider />

        {/* ── Stats ── */}
        <SectionLabel>Stats</SectionLabel>
        <p className="text-xs text-text-muted -mt-2 mb-4">
          Key numbers for bookers and label contacts.
        </p>
        <div className="flex flex-col gap-2">
          {STATS_FIELDS.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-xl border border-border bg-surface px-4 py-3"
            >
              <p className="text-[10px] text-text-muted mb-1">{label}</p>
              <input
                value={statsSnapshot[key] ?? ""}
                onChange={(e) => {
                  setStatsSnapshot((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }));
                  setSaved(false);
                }}
                placeholder="e.g. 12.4K"
                className="w-full bg-transparent text-sm text-text-primary outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 mb-4">
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving}
            className="w-full"
          >
            {saved ? "Saved" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
