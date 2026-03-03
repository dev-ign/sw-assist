export type SubscriptionTier = 'free' | 'rising' | 'indie' | 'superstar'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due'
export type AiRole = 'user' | 'assistant'
export type OpportunityType = 'playlist_submission' | 'sync_brief' | 'blog_feature' | 'show_opening' | 'grant'

export interface Profile {
  id: string
  artist_name: string | null
  real_name: string | null
  bio: string | null
  genre: string[] | null
  location: string | null
  profile_photo_url: string | null
  banner_photo_url: string | null
  slug: string | null
  subscription_tier: SubscriptionTier
  goals: Record<string, unknown> | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Link {
  id: string
  profile_id: string
  platform: string
  label: string
  url: string
  icon: string | null
  display_order: number
  is_visible: boolean
  click_count: number
  created_at: string
}

export interface Track {
  id: string
  profile_id: string
  title: string
  cover_art_url: string | null
  audio_preview_url: string | null
  streaming_url: string | null
  release_date: string | null
  genre: string | null
  mood: string[] | null
  tempo: string | null
  is_featured: boolean
  is_on_epk: boolean
  play_count: number
  created_at: string
}

export interface Show {
  id: string
  profile_id: string
  venue_name: string
  city: string
  date: string
  ticket_url: string | null
  is_headline: boolean
  is_visible: boolean
  created_at: string
}

export interface Epk {
  id: string
  profile_id: string
  headline: string | null
  bio_override: string | null
  selected_track_ids: string[] | null
  press_photos: string[] | null
  stats_snapshot: Record<string, unknown> | null
  custom_sections: Record<string, unknown> | null
  view_count: number
  last_generated_at: string | null
  created_at: string
  updated_at: string
}

export interface AiBriefing {
  id: string
  profile_id: string
  content: string
  opportunities: Record<string, unknown> | null
  tasks: Record<string, unknown> | null
  insights: Record<string, unknown> | null
  generated_at: string
  is_read: boolean
  created_at: string
}

// Supabase Database type map
// Relationships array is required by the Supabase client generics
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Omit<Profile, 'id'>> & { id: string }
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      links: {
        Row: Link
        Insert: Omit<Link, 'id' | 'created_at' | 'click_count'>
        Update: Partial<Omit<Link, 'id' | 'created_at'>>
        Relationships: []
      }
      tracks: {
        Row: Track
        Insert: Omit<Track, 'id' | 'created_at' | 'play_count'>
        Update: Partial<Omit<Track, 'id' | 'created_at'>>
        Relationships: []
      }
      shows: {
        Row: Show
        Insert: Omit<Show, 'id' | 'created_at'>
        Update: Partial<Omit<Show, 'id' | 'created_at'>>
        Relationships: []
      }
      epk: {
        Row: Epk
        Insert: Omit<Epk, 'id' | 'created_at' | 'updated_at' | 'view_count'>
        Update: Partial<Omit<Epk, 'id' | 'created_at'>>
        Relationships: []
      }
      ai_briefings: {
        Row: AiBriefing
        Insert: Omit<AiBriefing, 'id' | 'created_at'>
        Update: Partial<Omit<AiBriefing, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
