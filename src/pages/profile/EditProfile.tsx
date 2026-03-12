import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, Plus, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import {
  GENRES,
  PLATFORM_PRESETS,
  PRIMARY_GOALS,
  CAREER_STAGES,
  RELEASE_TIMELINES,
} from "../../lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkRow {
  id?: string; // existing DB id — undefined for new links
  platform: string;
  label: string;
  url: string;
}

interface FormState {
  artist_name: string;
  real_name: string;
  location: string;
  genre: string[];
  bio: string;
  profile_photo_url: string;
  links: LinkRow[];
  goals: {
    primary_goal: string;
    career_stage: string;
    release_timeline: string;
    monthly_listeners_target: string;
  };
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[var(--color-text-muted)] mb-4">
      {children}
    </p>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-[var(--color-border-subtle)] my-8" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EditProfile() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    artist_name: "",
    real_name: "",
    location: "",
    genre: [],
    bio: "",
    profile_photo_url: "",
    links: [],
    goals: {
      primary_goal: "",
      career_stage: "",
      release_timeline: "",
      monthly_listeners_target: "",
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load existing data ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !profile) return;

    async function load() {
      const { data: links } = await supabase
        .from("links")
        .select("*")
        .eq("profile_id", user!.id)
        .order("display_order");

      const rawGoals = (profile!.goals ?? {}) as Record<string, string>;

      setForm({
        artist_name: profile!.artist_name ?? "",
        real_name: profile!.real_name ?? "",
        location: profile!.location ?? "",
        genre: profile!.genre ?? [],
        bio: profile!.bio ?? "",
        profile_photo_url: profile!.profile_photo_url ?? "",
        links: (links ?? []).map((l: any) => ({
          id: l.id,
          platform: l.platform,
          label: l.label,
          url: l.url,
        })),
        goals: {
          primary_goal: rawGoals.primary_goal ?? "",
          career_stage: rawGoals.career_stage ?? "",
          release_timeline: rawGoals.release_timeline ?? "",
          monthly_listeners_target: rawGoals.monthly_listeners_target ?? "",
        },
      });
      setLoading(false);
    }

    load();
  }, [user, profile]);

  // ── Field helpers ──────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setGoal(key: keyof FormState["goals"], value: string) {
    setForm((f) => ({ ...f, goals: { ...f.goals, [key]: value } }));
  }

  function toggleGenre(g: string) {
    const next = form.genre.includes(g)
      ? form.genre.filter((x) => x !== g)
      : [...form.genre, g].slice(0, 3);
    set("genre", next);
    setErrors((e) => ({ ...e, genre: "" }));
  }

  // ── Links helpers ──────────────────────────────────────────────────────────

  const presetPlatforms = PLATFORM_PRESETS.map((p) => p.platform);

  function isPresetActive(platform: string) {
    return form.links.some((l) => l.platform === platform);
  }

  function togglePreset(platform: string) {
    if (isPresetActive(platform)) {
      set(
        "links",
        form.links.filter((l) => l.platform !== platform),
      );
    } else {
      const preset = PLATFORM_PRESETS.find((p) => p.platform === platform)!;
      set("links", [...form.links, { platform, label: preset.label, url: "" }]);
    }
  }

  function updatePresetUrl(platform: string, url: string) {
    set(
      "links",
      form.links.map((l) => (l.platform === platform ? { ...l, url } : l)),
    );
  }

  function addCustomLink() {
    set("links", [...form.links, { platform: "custom", label: "", url: "" }]);
  }

  function removeLink(index: number) {
    set(
      "links",
      form.links.filter((_, i) => i !== index),
    );
  }

  function updateCustomLink(
    index: number,
    field: "label" | "url",
    value: string,
  ) {
    set(
      "links",
      form.links.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    );
  }

  // ── Photo upload ───────────────────────────────────────────────────────────

  async function handlePhotoUpload(file: File) {
    if (!user) return;
    setUploadingPhoto(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/profile.${ext}`;

    const { error } = await supabase.storage
      .from("profile-assets")
      .upload(path, file, { upsert: true });

    if (error) {
      setUploadingPhoto(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("profile-assets")
      .getPublicUrl(path);

    set("profile_photo_url", urlData.publicUrl);
    setUploadingPhoto(false);
  }

  // ── Validate ───────────────────────────────────────────────────────────────

  function validate() {
    const e: Record<string, string> = {};
    if (!form.artist_name.trim()) e.artist_name = "Artist name is required";
    if (form.genre.length === 0) e.genre = "Pick at least one genre";
    return e;
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      // Scroll to top so user sees the error
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!user) return;
    setSaving(true);

    const slug = form.artist_name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // 1. Update profile
    await supabase
      .from("profiles")
      .update({
        artist_name: form.artist_name,
        real_name: form.real_name || null,
        bio: form.bio || null,
        genre: form.genre,
        location: form.location || null,
        profile_photo_url: form.profile_photo_url || null,
        slug,
        goals: form.goals,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // 2. Replace all links — delete existing, re-insert current
    await supabase.from("links").delete().eq("profile_id", user.id);

    const validLinks = form.links.filter((l) => l.url.trim());
    if (validLinks.length > 0) {
      await supabase.from("links").insert(
        validLinks.map((l, i) => ({
          profile_id: user.id,
          platform: l.platform,
          label: l.label,
          url: l.url,
          display_order: i,
          is_visible: true,
        })),
      );
    }

    // 3. Refresh auth state so Dashboard reflects changes
    await refreshProfile();

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-black)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const presetLinks = form.links.filter((l) =>
    presetPlatforms.includes(l.platform),
  );
  const customLinks = form.links.filter((l) => l.platform === "custom");

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--color-black)]">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-[var(--color-black)]/90 backdrop-blur-md border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center justify-between px-5 h-14">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back</span>
          </button>

          <p className="text-sm font-semibold text-[var(--color-text-primary)] absolute left-1/2 -translate-x-1/2">
            Edit Profile
          </p>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-all ${
              saved
                ? "text-[var(--color-success)]"
                : "text-[var(--color-accent)] hover:opacity-80"
            } disabled:opacity-40`}
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <>
                <Check size={15} strokeWidth={2.5} />
                Saved
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>

      <div className="px-5 pt-8 pb-24 max-w-lg mx-auto">
        {/* ── Profile photo ── */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative group w-24 h-24 rounded-full overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)]"
          >
            {form.profile_photo_url ? (
              <img
                src={form.profile_photo_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera size={22} className="text-[var(--color-text-muted)]" />
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={18} className="text-white" />
            </div>
            {/* Upload spinner */}
            {uploadingPhoto ? (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null}
          </button>
          <p className="text-xs text-[var(--color-text-muted)]">
            {form.profile_photo_url ? "Tap to change photo" : "Add a photo"}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoUpload(file);
            }}
          />
        </div>

        {/* ── Identity ── */}
        <SectionLabel>Identity</SectionLabel>
        <div className="flex flex-col gap-5">
          <Input
            label="Artist name"
            placeholder="e.g. KXNG Crooked"
            value={form.artist_name}
            onChange={(e) => {
              set("artist_name", e.target.value);
              setErrors((err) => ({ ...err, artist_name: "" }));
            }}
            error={errors.artist_name}
          />
          <Input
            label="Real name"
            placeholder="Optional"
            value={form.real_name}
            onChange={(e) => set("real_name", e.target.value)}
            hint="Only visible to you"
          />
          <Input
            label="City / Location"
            placeholder="e.g. Los Angeles, CA"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
          />

          {/* Genre chips */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              Genre{" "}
              <span className="text-[var(--color-text-muted)] font-normal">
                (up to 3)
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => {
                const selected = form.genre.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selected
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)]"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            {errors.genre ? (
              <p className="text-xs text-[var(--color-error)]">
                {errors.genre}
              </p>
            ) : null}
          </div>
        </div>

        <Divider />

        {/* ── Story ── */}
        <SectionLabel>Story</SectionLabel>
        <Textarea
          label="Bio"
          placeholder="Tell your story. Who are you as an artist? What drives your music?"
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          rows={6}
          hint="Appears on your artist page and EPK"
        />

        <Divider />

        {/* ── Links ── */}
        <SectionLabel>Links</SectionLabel>
        <div className="flex flex-col gap-5">
          {/* Platform chips */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              Platforms
            </p>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_PRESETS.map((p) => {
                const active = isPresetActive(p.platform);
                return (
                  <button
                    key={p.platform}
                    type="button"
                    onClick={() => togglePreset(p.platform)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      active
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preset URL inputs */}
          {presetLinks.length > 0 && (
            <div className="flex flex-col gap-4">
              {presetLinks.map((link, i) => {
                const preset = PLATFORM_PRESETS.find(
                  (p) => p.platform === link.platform,
                )!;
                return (
                  <Input
                    key={link.id ?? `${link.platform}-${i}`}
                    label={preset.label}
                    type="url"
                    placeholder={preset.placeholder}
                    value={link.url}
                    onChange={(e) =>
                      updatePresetUrl(link.platform, e.target.value)
                    }
                  />
                );
              })}
            </div>
          )}

          {/* Custom links */}
          {customLinks.length > 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Custom
              </p>
              {customLinks.map((link) => {
                const actualIndex = form.links.indexOf(link);
                return (
                  <div key={actualIndex} className="flex gap-2 items-start">
                    <div className="flex-1 flex flex-col gap-2">
                      <Input
                        placeholder="Label (e.g. Website)"
                        value={link.label}
                        onChange={(e) =>
                          updateCustomLink(actualIndex, "label", e.target.value)
                        }
                      />
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={link.url}
                        onChange={(e) =>
                          updateCustomLink(actualIndex, "url", e.target.value)
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(actualIndex)}
                      className="mt-1 p-2.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-raised)] transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={addCustomLink}
            className="flex items-center gap-2 text-sm text-[var(--color-accent)] hover:opacity-70 transition-opacity self-start"
          >
            <Plus size={15} />
            Add custom link
          </button>
        </div>

        <Divider />

        {/* ── Goals ── */}
        <SectionLabel>Goals</SectionLabel>
        <div className="flex flex-col gap-6">
          {/* Primary goal */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              Main focus right now
            </p>
            <div className="flex flex-col gap-2">
              {PRIMARY_GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoal("primary_goal", g)}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    form.goals.primary_goal === g
                      ? "bg-[var(--color-accent-subtle)] border border-[var(--color-accent)] text-[var(--color-text-primary)]"
                      : "bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Career stage */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              Where you're at
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CAREER_STAGES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setGoal("career_stage", s.value)}
                  className={`text-left px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    form.goals.career_stage === s.value
                      ? "bg-[var(--color-accent-subtle)] border border-[var(--color-accent)] text-[var(--color-text-primary)]"
                      : "bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Release timeline */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              Next release
            </p>
            <div className="grid grid-cols-2 gap-2">
              {RELEASE_TIMELINES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setGoal("release_timeline", t.value)}
                  className={`text-left px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                    form.goals.release_timeline === t.value
                      ? "bg-[var(--color-accent-subtle)] border border-[var(--color-accent)] text-[var(--color-text-primary)]"
                      : "bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listener target */}
          <Input
            label="Monthly listeners goal"
            placeholder="e.g. 50,000"
            value={form.goals.monthly_listeners_target}
            onChange={(e) =>
              setGoal("monthly_listeners_target", e.target.value)
            }
            hint="Helps your manager set benchmarks"
          />
        </div>

        {/* ── Bottom save button ── */}
        <div className="mt-10">
          <Button
            onClick={handleSave}
            loading={saving}
            size="lg"
            className="w-full"
          >
            {saved ? (
              <span className="flex items-center gap-2">
                <Check size={16} strokeWidth={2.5} />
                Saved
              </span>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
