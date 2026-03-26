# Artist Page Execution Plan

## Summary
This document is the source of truth for improving the Artist Page in controlled phases. The roadmap reflects the current codebase, corrects inconsistencies from the rough outline, and makes Phase 1 the active implementation target with a hard pause after completion for manual testing and review.

The public link flow remains landing-page-first. A shared link lands on the existing public artist/song page, captures attribution and device context, stores a visit, then records downstream platform clicks as events tied back to that visit.

## Current State
- Public artist pages already exist at `/:artistSlug/:pageSlug` in `src/App.tsx`.
- The current public page UI lives in `src/pages/public/ArtistPage.tsx`.
- Artist Page editing already supports song-link style slugs and cross-platform link detection in `src/pages/artist-page/PageEditor.tsx`.
- The app currently has a coarse analytics path using `page_analytics` plus the `track-page-event` edge function, but that structure is too limited for the roadmap and should be replaced by `visits` plus `events`.
- Phase 1 is now implemented:
  - page loads create `visits`
  - `page_view` events are stored
  - platform clicks like `click_spotify`, `click_apple_music`, and `click_youtube` are stored
  - duplicate visit creation has been reduced with client-side dedupe guards

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
- Expand event usage on the frontend by moving from "page load + outbound click only" to a small, deliberate event model used across the Artist Page UI
- Keep every event tied to `visit_id` so analytics can group a full session
- Centralize event firing in one frontend helper so new UI states do not create ad hoc tracking calls
- Lock the public-page event taxonomy:
  - `page_view`
  - `click_spotify`
  - `click_apple_music`
  - `click_youtube`
  - `click_soundcloud`
  - `click_instagram`
  - `click_tiktok`
  - `click_twitter`
  - `click_facebook`
  - `click_custom_link`
  - `cta_click` reserved for Phase 4 primary-CTA work
  - `return_prompt_view` reserved for Phase 5 return-experience work
  - `return_prompt_click` reserved for Phase 5 return-experience work
- For Phase 2 implementation, keep `page_view` plus platform-specific click events
- Keep event names human-readable and dashboard-friendly, but still attach metadata so later phases do not need to infer context from the event name alone
- Add required metadata for all click events:
  - `link_platform`
  - `link_label`
  - `link_position`
  - `section` (`streaming` or `social`)
- Add optional metadata only when it directly supports later phases:
  - `is_primary` for future CTA prioritization
  - `destination_domain` for debugging and reporting
  - `source_param` to make event-level attribution queries easier without joining every time
- Do not yet track low-signal events like scroll depth, hover, focus, or every button impression
- Do not yet introduce backend aggregation logic in this phase; Phase 2 is about cleaner event capture and naming on the frontend

Meaning of "expand event usage on the frontend":
- The frontend should treat tracking as part of the page behavior, not just a one-off fetch call
- Every meaningful user action on the public Artist Page should map to a named event from the approved taxonomy
- Event naming should be explicit and stable enough that Phase 6 dashboard queries can rely on it without needing cleanup logic
- Event payloads should remain small and intentional; only add metadata that directly helps later analytics or personalization
- The current platform-specific click events from Phase 1 should remain the standard
- Metadata should enrich those event names, not replace them
- The goal is to measure listener intent cleanly while keeping the analytics readable enough to inspect without complicated SQL translation

Phase 2 event contract:
- `page_view`
  - When it fires:
    - once after a visit is successfully created
  - Required metadata:
    - none
  - Optional metadata:
    - `source_param`
    - `has_streaming_links`
    - `has_social_links`
    - `visible_link_count`
- `link_click`
  - Replace this generic shape with explicit click events per platform
  - Do not emit a generic `link_click` event in Phase 2
- Platform-specific click events
  - When they fire:
    - every time a user taps an outbound link button or social icon on the public page
  - Supported event names:
    - `click_spotify`
    - `click_apple_music`
    - `click_youtube`
    - `click_soundcloud`
    - `click_instagram`
    - `click_tiktok`
    - `click_twitter`
    - `click_facebook`
    - `click_custom_link`
  - Required metadata:
    - `link_platform`
    - `link_label`
    - `link_position`
    - `section`
  - Optional metadata:
    - `is_primary`
    - `destination_domain`
    - `source_param`

Metadata rules:
- `link_platform`
  - use the platform slug already stored in `links.platform`
  - examples: `spotify`, `apple_music`, `youtube`, `instagram`, `tiktok`
- `link_label`
  - use the rendered label shown to the user
  - this helps explain custom links and manually renamed links
- `link_position`
  - zero-based index within its rendered section
  - this supports later analysis of button order and personalization impact
- `section`
  - one of `streaming` or `social`
- `is_primary`
  - `true` only when a future guided funnel or CTA system marks a link as primary
  - Phase 2 can default this to `false` or omit it
- `destination_domain`
  - parsed hostname of the outbound URL
  - useful for debugging custom links and grouping unexpected destinations
- `source_param`
  - normalized attribution value from the page URL
  - duplicates visit-level attribution intentionally to simplify event-only queries

Out of scope for Phase 2:
- `button_impression`
- `scroll_depth`
- `hover_link`
- `time_on_page`
- `cover_art_view`
- replacing readable platform-specific click names with a single generic `link_click`

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

### Phase 2 Frontend Extension
- Replace direct event-name construction in the page component with a small tracking helper that accepts:
  - `eventType`
  - `linkId` optional
  - `metadata` optional
- Use that helper for all public-page click paths so streaming buttons and social icons follow the same contract
- For every click event, always store `link_platform`, `link_label`, `link_position`, and `section`
- Also store `destination_domain` and `source_param` when available
- Keep Phase 1 platform-specific events and formalize them through the shared tracking helper
- Keep tracking fire-and-forget so analytics never block outbound navigation
- Keep `visit_id` handling exactly as established in Phase 1

## Public Interfaces / Types
- Add `Visit` and `Event` types in `src/types/database.ts`.
- Extend the local `Database` interface with `visits` and `events`.
- Use two explicit tracking operations:
  - `create_visit`: `profile_id`, optional `link_id`, `source`, optional `preferred_platform`, optional `visitor_token`
  - `track_event`: `visit_id`, `profile_id`, optional `link_id`, `event_type`, optional `metadata`

## Checkpoint
After Phase 1 schema work, edge function wiring, and Artist Page frontend wiring are complete, pause implementation for manual testing and review before starting Phase 2.

Alignment before Phase 2:
- Phase 2 does not mean "track everything"
- Phase 2 means formalizing the Artist Page event contract so later personalization and dashboard work can trust the event names and metadata
- If a new interaction does not clearly support conversion, personalization, or reporting, it should stay out of the event model for now

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
