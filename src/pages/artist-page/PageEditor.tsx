import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Camera,
  Search,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  Link2,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  ODESLI_PLATFORM_MAP,
  PLATFORM_LABELS,
  PLATFORM_PRESETS,
} from "../../lib/constants";
import { toBaseSlug, slugToTitle } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkRow {
  id?: string;
  platform: string;
  label: string;
  url: string;
  is_visible: boolean;
  display_order: number;
}

interface OdesliEntity {
  title?: string;
  artistName?: string;
  thumbnailUrl?: string;
}

interface OdesliResult {
  entityInfo: OdesliEntity;
  detectedLinks: Array<{
    odesliKey: string;
    platform: string;
    label: string;
    url: string;
  }>;
}

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

function platformLabel(platform: string, customLabel?: string): string {
  if (customLabel && customLabel !== platform) return customLabel;
  return PLATFORM_LABELS[platform] ?? platform;
}

function detectPlatformFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("instagram.com")) return "instagram";
    if (hostname.includes("tiktok.com")) return "tiktok";
    if (hostname.includes("twitter.com") || hostname.includes("x.com"))
      return "twitter";
    if (hostname.includes("facebook.com") || hostname.includes("fb.com"))
      return "facebook";
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be"))
      return "youtube";
    if (hostname.includes("spotify.com")) return "spotify";
    if (hostname.includes("music.apple.com")) return "apple_music";
    if (hostname.includes("soundcloud.com")) return "soundcloud";
  } catch {
    // invalid URL — ignore
  }
  return null;
}

function TikTokIcon({ size = 14 }: { size?: number }) {
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

function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "instagram":
      return <Instagram size={14} />;
    case "tiktok":
      return <TikTokIcon size={14} />;
    case "twitter":
      return <Twitter size={14} />;
    case "facebook":
      return <Facebook size={14} />;
    case "youtube":
    case "youtube_music":
      return <Youtube size={14} />;
    default:
      return <Link2 size={14} />;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PageEditor() {
  const { user, profile, refreshProfile } = useAuth();
  const bannerRef = useRef<HTMLInputElement>(null);

  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [coverArtLoading, setCoverArtLoading] = useState(false);

  const [links, setLinks] = useState<LinkRow[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Odesli smart detector
  const [detectUrl, setDetectUrl] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState("");
  const [odesliResult, setOdesliResult] = useState<OdesliResult | null>(null);
  const [selectedOdesliKeys, setSelectedOdesliKeys] = useState<Set<string>>(
    new Set(),
  );

  // ── Load existing data ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    setBannerUrl(profile?.banner_photo_url ?? null);
    // Slug is stored as "{artistSlug}/{customSlug}" — only expose the custom part
    const fullSlug = profile?.slug ?? "";
    const slashIdx = fullSlug.indexOf("/");
    setSlug(slashIdx >= 0 ? fullSlug.slice(slashIdx + 1) : "");
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    setLinksLoading(true);
    supabase
      .from("links")
      .select("*")
      .eq("profile_id", user.id)
      .order("display_order")
      .then(({ data }) => {
        setLinks(
          (data ?? []).map((l, i) => ({
            id: l.id,
            platform: l.platform,
            label: l.label,
            url: l.url,
            is_visible: l.is_visible,
            display_order: i,
          })),
        );
        setLinksLoading(false);
      });
  }, [user]);

  // ── Banner upload ──────────────────────────────────────────────────────────

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setBannerUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/banner.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-assets")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setBannerUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("profile-assets")
      .getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ banner_photo_url: publicUrl })
      .eq("id", user.id);

    setBannerUrl(publicUrl);
    await refreshProfile();
    setBannerUploading(false);
  }

  // ── Set cover art from a remote URL (used after Odesli detection) ──────────

  async function setCoverArtFromUrl(thumbnailUrl: string) {
    if (!user) return;
    setCoverArtLoading(true);

    try {
      // Apple Music URLs support a size param — try to get a larger version
      const highResUrl = thumbnailUrl.replace(/\b\d+x\d+bb\b/, "600x600bb");

      const response = await fetch(highResUrl);
      if (!response.ok) throw new Error("fetch failed");

      const blob = await response.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const path = `${user.id}/banner.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-assets")
        .upload(path, blob, { upsert: true, contentType: blob.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-assets")
        .getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ banner_photo_url: publicUrl })
        .eq("id", user.id);

      setBannerUrl(publicUrl);
      await refreshProfile();
    } catch {
      // Silently fall back — user can still upload manually
    } finally {
      setCoverArtLoading(false);
    }
  }

  // ── Odesli link detection ──────────────────────────────────────────────────

  async function handleDetect() {
    if (!detectUrl.trim()) return;
    setDetecting(true);
    setDetectError("");
    setOdesliResult(null);
    setSelectedOdesliKeys(new Set());

    try {
      const res = await fetch(
        `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(detectUrl.trim())}&userCountry=US`,
      );
      if (!res.ok)
        throw new Error("Could not find this link. Try a direct track URL.");
      const json = await res.json();

      // Extract entity info from first entity
      const entityId = json.entityUniqueId as string | undefined;
      const entity: OdesliEntity = entityId
        ? (json.entitiesByUniqueId?.[entityId] ?? {})
        : {};

      // Build detected links — only platforms we know about
      const existingPlatforms = new Set(links.map((l) => l.platform));
      const addedPlatforms = new Set<string>(); // deduplicate within this result set
      const detectedLinks: OdesliResult["detectedLinks"] = [];

      for (const [key, mapping] of Object.entries(ODESLI_PLATFORM_MAP)) {
        const entry = json.linksByPlatform?.[key];
        if (!entry?.url) continue;
        // Skip if user already has this platform linked or we already added it this round
        if (existingPlatforms.has(mapping.platform)) continue;
        if (addedPlatforms.has(mapping.platform)) continue;
        addedPlatforms.add(mapping.platform);
        detectedLinks.push({
          odesliKey: key,
          platform: mapping.platform,
          label: mapping.label,
          url: entry.url as string,
        });
      }

      if (detectedLinks.length === 0) {
        setDetectError(
          "No new platforms found — you may already have these links added.",
        );
      } else {
        // Pre-select all detected
        setSelectedOdesliKeys(new Set(detectedLinks.map((l) => l.odesliKey)));
        setOdesliResult({ entityInfo: entity, detectedLinks });
      }
    } catch (err) {
      setDetectError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setDetecting(false);
    }
  }

  function toggleOdesliKey(key: string) {
    setSelectedOdesliKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addDetectedLinks() {
    if (!odesliResult) return;
    const toAdd = odesliResult.detectedLinks
      .filter((l) => selectedOdesliKeys.has(l.odesliKey))
      .map((l, i) => ({
        platform: l.platform,
        label: l.label,
        url: l.url,
        is_visible: true,
        display_order: links.length + i,
      }));
    setLinks((prev) => [...prev, ...toAdd]);
    setOdesliResult(null);
    setDetectUrl("");
    setSelectedOdesliKeys(new Set());
    setSaved(false);
  }

  // ── Link management ────────────────────────────────────────────────────────

  function toggleVisibility(index: number) {
    setLinks((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, is_visible: !l.is_visible } : l,
      ),
    );
    setSaved(false);
  }

  function removeLink(index: number) {
    setLinks((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((l, i) => ({ ...l, display_order: i })),
    );
    setSaved(false);
  }

  function addCustomLink() {
    const preset = PLATFORM_PRESETS.find(
      (p) => !links.some((l) => l.platform === p.platform),
    );
    setLinks((prev) => [
      ...prev,
      {
        platform: preset?.platform ?? "custom",
        label: preset?.label ?? "Custom Link",
        url: "",
        is_visible: true,
        display_order: prev.length,
      },
    ]);
    setSaved(false);
  }

  function updateLink(
    index: number,
    field: keyof LinkRow,
    value: string | boolean,
  ) {
    setLinks((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const updated = { ...l, [field]: value };
        // Auto-detect platform when the URL field changes
        if (field === "url" && typeof value === "string") {
          const detected = detectPlatformFromUrl(value);
          if (detected) {
            updated.platform = detected;
            updated.label = PLATFORM_LABELS[detected] ?? detected;
          }
        }
        return updated;
      }),
    );
    setSaved(false);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSlugError("");

    // Validate + save slug if it changed
    // Slug is stored as "{artistSlug}/{customSlug}" — build the full path
    const artistSlugPrefix = toBaseSlug(profile?.artist_name ?? "");
    const cleanCustomSlug = toBaseSlug(slug);
    const fullSlug = cleanCustomSlug
      ? `${artistSlugPrefix}/${cleanCustomSlug}`
      : "";
    const currentFullSlug = profile?.slug ?? "";

    if (fullSlug !== currentFullSlug) {
      let slugToSave = fullSlug;

      if (fullSlug) {
        // Check uniqueness of the combined path
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("slug", fullSlug)
          .neq("id", user.id)
          .maybeSingle();

        if (existing) {
          let suffix = 2;
          let candidate = `${artistSlugPrefix}/${cleanCustomSlug}-${suffix}`;
          while (true) {
            const { data: e } = await supabase
              .from("profiles")
              .select("id")
              .eq("slug", candidate)
              .neq("id", user.id)
              .maybeSingle();
            if (!e) break;
            suffix++;
            candidate = `${artistSlugPrefix}/${cleanCustomSlug}-${suffix}`;
          }
          const newCustomSlug = `${cleanCustomSlug}-${suffix}`;
          setSlugError(
            `That URL is taken — we suggest /${artistSlugPrefix}/${newCustomSlug}`,
          );
          setSlug(newCustomSlug);
          slugToSave = candidate;
        }
      }

      await supabase
        .from("profiles")
        .update({ slug: slugToSave })
        .eq("id", user.id);
      await refreshProfile();
    }

    // Delete + re-insert (established pattern in this codebase)
    await supabase.from("links").delete().eq("profile_id", user.id);

    const toInsert = links
      .filter((l) => l.url.trim())
      .map((l, i) => ({
        profile_id: user.id,
        platform: l.platform,
        label: l.label,
        url: l.url.trim(),
        is_visible: l.is_visible,
        display_order: i,
      }));

    if (toInsert.length > 0) {
      await supabase.from("links").insert(toInsert);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">
            {slug ? slugToTitle(slug) : "Your"}
          </h1>
          <p className="text-xs text-text-muted">Page Editor</p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.slug && slug && (
            <a
              href={`/${toBaseSlug(profile.artist_name ?? "")}/${slug}`}
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
        {/* ── Cover Art ── */}
        <SectionLabel>Cover Art</SectionLabel>

        <div
          className="relative w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-surface-raised border border-border cursor-pointer group"
          onClick={() => bannerRef.current?.click()}
        >
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Cover art"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Camera size={28} className="text-text-muted" />
              <p className="text-xs text-text-muted">Upload cover art</p>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {bannerUploading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="flex items-center gap-1.5 text-white text-sm font-medium">
                <Camera size={16} />
                {bannerUrl ? "Change" : "Upload"}
              </div>
            )}
          </div>
        </div>

        <input
          ref={bannerRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerUpload}
        />

        <p className="text-xs text-text-muted text-center mt-3">
          Colors from your cover art are used as the gradient on your public
          page.
        </p>

        <Divider />

        {/* ── Page URL ── */}
        <SectionLabel>Page URL</SectionLabel>
        <div className="flex items-center rounded-xl border border-border bg-surface overflow-hidden">
          <span className="px-3 py-3 text-xs text-text-muted border-r border-border whitespace-nowrap select-none">
            {toBaseSlug(profile?.artist_name ?? "")}/
          </span>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(toBaseSlug(e.target.value));
              setSlugError("");
              setSaved(false);
            }}
            placeholder="custom-link"
            className="flex-1 bg-transparent px-3 py-3 text-sm text-text-primary outline-none"
          />
        </div>
        {slugError && <p className="text-xs text-error mt-1.5">{slugError}</p>}
        {slug && !slugError && (
          <p className="text-xs text-text-muted mt-1.5">
            smallworldassist.com/{toBaseSlug(profile?.artist_name ?? "")}/{slug}
          </p>
        )}

        <Divider />

        {/* ── Smart Link Detector ── */}
        <SectionLabel>Detect Links</SectionLabel>
        <p className="text-xs text-text-muted mb-4 -mt-2">
          Paste a Spotify or Apple Music URL — we'll find the same song on every
          platform.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="https://open.spotify.com/track/…"
            value={detectUrl}
            onChange={(e) => {
              setDetectUrl(e.target.value);
              setDetectError("");
              setOdesliResult(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleDetect()}
            className="flex-1 text-sm"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDetect}
            loading={detecting}
            disabled={!detectUrl.trim() || detecting}
            className="shrink-0"
          >
            <Search size={14} />
          </Button>
        </div>

        {detectError && (
          <p className="text-xs text-error mt-2">{detectError}</p>
        )}

        {odesliResult && (
          <div className="mt-4 rounded-xl bg-surface border border-border p-4 flex flex-col gap-4">
            {/* Entity info */}
            {(odesliResult.entityInfo.title ||
              odesliResult.entityInfo.thumbnailUrl) && (
              <div className="flex items-center gap-3">
                {odesliResult.entityInfo.thumbnailUrl && (
                  <div className="relative shrink-0 group/thumb">
                    <img
                      src={odesliResult.entityInfo.thumbnailUrl}
                      alt="Track thumbnail"
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    {/* "Use as cover art" overlay */}
                    <button
                      onClick={() =>
                        setCoverArtFromUrl(
                          odesliResult.entityInfo.thumbnailUrl!,
                        )
                      }
                      disabled={coverArtLoading}
                      className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                      title="Use as cover art"
                    >
                      {coverArtLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera size={14} className="text-white" />
                      )}
                    </button>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {odesliResult.entityInfo.title && (
                    <p className="text-sm font-semibold text-text-primary leading-tight truncate">
                      {odesliResult.entityInfo.title}
                    </p>
                  )}
                  {odesliResult.entityInfo.artistName && (
                    <p className="text-xs text-text-muted mt-0.5">
                      {odesliResult.entityInfo.artistName}
                    </p>
                  )}
                  {odesliResult.entityInfo.thumbnailUrl && (
                    <button
                      onClick={() =>
                        setCoverArtFromUrl(
                          odesliResult.entityInfo.thumbnailUrl!,
                        )
                      }
                      disabled={coverArtLoading}
                      className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-accent disabled:opacity-50"
                    >
                      {coverArtLoading ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera size={11} />
                      )}
                      {coverArtLoading ? "Setting…" : "Use as cover art"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Platform chips */}
            <div className="flex flex-wrap gap-2">
              {odesliResult.detectedLinks.map((l) => {
                const selected = selectedOdesliKeys.has(l.odesliKey);
                return (
                  <button
                    key={l.odesliKey}
                    onClick={() => toggleOdesliKey(l.odesliKey)}
                    className={[
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      selected
                        ? "bg-accent border-accent text-white"
                        : "bg-transparent border-border text-text-secondary",
                    ].join(" ")}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>

            <Button
              size="sm"
              onClick={addDetectedLinks}
              disabled={selectedOdesliKeys.size === 0}
              className="self-start"
            >
              <Plus size={14} />
              Add {selectedOdesliKeys.size > 0
                ? selectedOdesliKeys.size
                : ""}{" "}
              link
              {selectedOdesliKeys.size !== 1 ? "s" : ""}
            </Button>
          </div>
        )}

        <Divider />

        {/* ── Links ── */}
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Links</SectionLabel>
          <button
            onClick={addCustomLink}
            className="flex items-center gap-1 text-xs text-accent font-medium"
          >
            <Plus size={14} /> Add link
          </button>
        </div>

        {linksLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : links.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">
            No links yet. Use the detector above or add one manually.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {links.map((link, i) => (
              <div
                key={i}
                className={[
                  "rounded-xl border p-4 flex flex-col gap-3 transition-colors",
                  link.is_visible
                    ? "bg-surface border-border"
                    : "bg-transparent border-border-subtle opacity-50",
                ].join(" ")}
              >
                {/* Row 1: drag handle + platform icon + label + controls */}
                <div className="flex items-center gap-2">
                  <GripVertical
                    size={16}
                    className="text-text-muted shrink-0 cursor-grab"
                  />
                  <span className="text-text-muted shrink-0">
                    <PlatformIcon platform={link.platform} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <input
                      value={link.label}
                      onChange={(e) => updateLink(i, "label", e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-text-primary outline-none"
                      placeholder={platformLabel(link.platform)}
                    />
                    <p className="text-[10px] text-text-muted mt-0.5 truncate">
                      {link.url || "No URL set"}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleVisibility(i)}
                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary transition-colors"
                    aria-label={link.is_visible ? "Hide link" : "Show link"}
                  >
                    {link.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    onClick={() => removeLink(i)}
                    className="p-1.5 rounded-md text-text-muted hover:text-error transition-colors"
                    aria-label="Remove link"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Row 2: URL input */}
                <input
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="https://…"
                  className="w-full bg-surface-raised rounded-lg px-3 py-2 text-xs text-text-secondary outline-none focus:ring-1 focus:ring-accent border border-transparent focus:border-accent transition-all"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 mb-4">
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
