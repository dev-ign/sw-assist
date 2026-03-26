# Artist Page Execution Plan

## Summary
This document is the source of truth for improving the Artist Page in controlled phases. The roadmap reflects the current codebase, corrects inconsistencies from the rough outline, and makes Phase 1 the active implementation target with a hard pause after completion for manual testing and review.

The public link flow remains landing-page-first. A shared link lands on the existing public artist/song page, captures attribution and device context, stores a visit, then records downstream platform clicks as events tied back to that visit.

## Current State
- Public artist pages already exist at `/:artistSlug/:pageSlug` in `src/App.tsx`.
- The current public page UI lives in `src/pages/public/ArtistPage.tsx`.
- Artist Page editing already supports song-link style slugs and cross-platform link detection in `src/pages/artist-page/PageEditor.tsx`.
- The app currently has a coarse analytics path using `page_analytics` plus the `track-page-event` edge function, but that structure is too limited for the roadmap and should be replaced by `visits` plus `events`.

## Roadmap
### Phase 1: Core Smart Links
Goal: get a working public link that tracks visits and routes users cleanly.

Tasks:
- Capture URL attribution via `?source=...`
- Normalize accepted source values to `tiktok`, `instagram`, `youtube`, `direct`
- Detect device as `ios`, `android`, or `desktop`
- Save one visit row on page load
- Record a `page_view` event tied to that visit
- Record platform click events tied to that visit
- Keep navigation non-blocking for outbound links

### Phase 2: Event Tracking Engine
Goal: track behavior, not just visits.

Tasks:
- Expand event usage on the frontend
- Track events like `click_spotify`, `click_apple_music`, and `click_youtube`
- Keep events tied to `visit_id` so analytics can group a full session

### Phase 3: Platform Detection and Personalization
Goal: personalize the page based on listener behavior.

Tasks:
- Save `preferred_platform` on platform click
- Persist it locally with `localStorage`
- Send preferred platform to the backend
- Reorder primary buttons based on the listener's preference
- Optionally add a first-time prompt like “Where do you listen?”

### Phase 4: Guided Funnel UI
Goal: reduce overwhelm and guide action.

Tasks:
- Replace a flat list of equal-priority links with one primary CTA
- Add a step-based flow:
  Step 1: Listen
  Step 2: Save
  Step 3: Follow
- Add conversion-focused microcopy

### Phase 5: Return Experience
Goal: improve retention and second-visit conversion.

Tasks:
- Detect returning listeners using local storage or a cookie
- Show contextual return messaging based on incomplete actions
- Adapt prompts when a listener already clicked a platform previously

### Phase 6: Basic Analytics Dashboard
Goal: understand what is working before overdesigning the analytics UI.

Tasks:
- Show total visits
- Show clicks per platform
- Show conversion rate
- Break metrics down by source

### Phase 7: Link Generator
Goal: generate distribution-ready links for release workflow.

Tasks:
- Generate share links with source params
- Support TikTok, Instagram, YouTube, and direct variants
- Add copy/share controls

## Phase 1 Build Spec
### Data Model
- `visits`
  - `id`
  - `profile_id`
  - `link_id` nullable
  - `source`
  - `device`
  - `referrer`
  - `preferred_platform` nullable
  - `visitor_token` nullable
  - `created_at`
- `events`
  - `id`
  - `visit_id`
  - `profile_id`
  - `link_id` nullable
  - `event_type`
  - `metadata` nullable
  - `created_at`

### Backend Behavior
- Replace the old coarse `track-page-event` flow with a visit-aware tracking endpoint.
- On page load, create one visit and return `visit_id`.
- After visit creation, record a `page_view` event tied to that visit.
- On platform click, record a platform-specific event like `click_spotify`.
- Parse `source` from `?source=...`, default to `direct`, and whitelist accepted values.
- Detect `ios` and `android` explicitly from user agent before falling back to `desktop`.

### Frontend Behavior
- On Artist Page load, read `source` from the URL and create one visit.
- Keep the returned `visit_id` in memory for follow-up tracking.
- Fire `page_view` after visit creation succeeds.
- On platform button click, fire the platform event and continue to the destination without blocking navigation.
- Do not add button reordering, listener prompts, or funnel UI in Phase 1.

## Public Interfaces / Types
- Add `Visit` and `Event` types in `src/types/database.ts`.
- Extend the local `Database` interface with `visits` and `events`.
- Use two explicit tracking operations:
  - `create_visit`: `profile_id`, optional `link_id`, `source`, optional `preferred_platform`, optional `visitor_token`
  - `track_event`: `visit_id`, `profile_id`, optional `link_id`, `event_type`, optional `metadata`

## Checkpoint
After Phase 1 schema work, edge function wiring, and Artist Page frontend wiring are complete, pause implementation for manual testing and review before starting Phase 2.

## Test Plan
- Visit a public artist/song page without query params and confirm a `visits` row is created with `source='direct'`.
- Visit with `?source=tiktok`, `?source=instagram`, and `?source=youtube` and confirm source is stored correctly.
- Validate device classification on iOS, Android, and desktop.
- Confirm one page load creates one visit and one `page_view` event.
- Click Spotify, Apple Music, and YouTube buttons and confirm matching `click_*` events are written with the same `visit_id`.
- Confirm tracking failures never block page render or outbound navigation.
- Confirm the public Artist Page no longer depends on `page_analytics` after Phase 1.

## Assumptions
- The planning document lives at repo root as `artist-page-execution-plan.md`.
- Phase 1 keeps the current landing-page-first flow instead of auto-redirecting.
- We are introducing `visits` and `events` now instead of extending `page_analytics`.
- Allowed initial sources are `tiktok`, `instagram`, `youtube`, and `direct`.
- Phase 1 ends with a working tracked smart link flow and a pause for testing before Phase 2 begins.
