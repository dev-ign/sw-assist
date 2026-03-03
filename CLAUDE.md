# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Type-check + production build (tsc -b && vite build)
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

No test framework is configured yet.

To generate Supabase TypeScript types:
```bash
npx supabase gen types typescript --project-id nerzwarajaprnbcprpfc > src/types/database.generated.ts
```

## Architecture

**Small World Assist** is an AI music manager web app for independent artists. Mobile-first, dark-themed, subscription-based.

### Auth & routing flow

`useAuth` (`src/hooks/useAuth.ts`) is the single source of truth for auth state. It holds `session`, `user`, `profile`, and `loading`. It subscribes to Supabase auth changes and fetches the `profiles` row automatically. It also exposes `signOut` and `refreshProfile` — call `refreshProfile()` after any page mutates the `profiles` table so the global state stays in sync.

`App.tsx` uses two route guards:
- `ProtectedRoute` — redirects to `/login` if no user
- `OnboardingGuard` — redirects to `/dashboard` if `profile.onboarding_completed` is already true

Root `/` uses a three-way redirect: unauthenticated → `/signup`, not onboarded → `/onboarding`, otherwise → `/dashboard`.

Current routes:
- `/signup`, `/login` — public auth
- `/onboarding` — protected + onboarding guard
- `/dashboard` — protected; shows AI briefing card + pillar nav grid
- `/profile/edit` — protected; full profile editor (identity, bio, links, goals)

### Supabase integration

- Client: `src/lib/supabase.ts` — currently typed as `any`. Swap in the generated `Database` type once `database.generated.ts` exists.
- Manual types: `src/types/database.ts` — source of truth for all table shapes until generated types replace them. Also exports the `Database` interface shape for future typed client use.
- On signup, a Postgres trigger (`handle_new_user`) auto-inserts a `profiles` row with `subscription_tier='free'` and `onboarding_completed=false`. The app never manually inserts a profile row.
- All DB mutations go directly through the Supabase client — no intermediate API layer.
- **Link mutation pattern**: pages that edit links delete all existing rows for the user, then bulk-insert the current set. There is no incremental update path.
- `slug` is auto-derived from `artist_name` on save (lowercase, hyphenated, alphanumeric only).

### Onboarding

`Onboarding.tsx` owns the full `OnboardingData` state object and passes `data` + `update` down to each step. Steps are pure presentational — they receive props and call `onNext` / `onBack`. On `finish()`, the onboarding page writes to `profiles` (UPDATE) and `links` (INSERT), then navigates to `/dashboard`.

### Design system

Tailwind v4 is configured via `@theme` in `src/index.css` — **no `tailwind.config.js`**. All colors, radii, and fonts are CSS custom properties consumed as `var(--color-*)`, `var(--radius-*)`, etc. in both Tailwind utilities and inline styles. Use the semantic tokens, not raw hex values.

Key tokens:
- Backgrounds: `--color-black` (#0a0a0a), `--color-surface` (#141414), `--color-surface-raised` (#1c1c1c)
- Accent: `--color-accent` (#7c3aed), `--color-accent-hover` (#6d28d9), `--color-accent-subtle` (#1e1030)
- Text: `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- Borders: `--color-border`, `--color-border-subtle`
- Status: `--color-success` (#22c55e), `--color-warning` (#f59e0b), `--color-error` (#ef4444)
- Radius: `--radius-sm` (8px), `--radius-md` (12px), `--radius-lg` (16px), `--radius-xl` (24px)

### UI components

`src/components/ui/` has `Button`, `Input`, `Textarea`. `Button` supports `variant` (primary/secondary/ghost) and `size` (sm/md/lg) props plus a `loading` spinner state. All use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge). Icons come from `lucide-react`.

### Shared constants

`src/lib/constants.ts` exports all option sets shared across onboarding and profile editing: `GENRES`, `PLATFORM_PRESETS`, `PRIMARY_GOALS`, `CAREER_STAGES`, `RELEASE_TIMELINES`. Add new options here, not inline in components.

### MVP pillars (build order)

1. Dashboard — basic shell built (`pages/dashboard/Dashboard.tsx`); AI briefing card is a placeholder
2. Artist Page — public profile at `/:slug` (not yet built)
3. EPK — auto-generated press kit (not yet built)
4. Analytics dashboard (not yet built)
5. Supabase edge function `generate-daily-briefing` calling Claude API (not yet built)

### Storage buckets (Supabase, all public)

`profile-assets`, `press-photos`, `epk-pdfs`, `track-previews`

Photo uploads go to `profile-assets/{userId}/profile.{ext}` with `upsert: true`.

### Subscription tiers

`free` → `rising` → `indie` → `superstar` (stored on `profiles.subscription_tier`)
