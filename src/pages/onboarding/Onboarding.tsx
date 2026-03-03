import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { StepBasicInfo } from './steps/StepBasicInfo'
import { StepBioPhoto } from './steps/StepBioPhoto'
import { StepLinks } from './steps/StepLinks'
import { StepGoals } from './steps/StepGoals'

export interface OnboardingData {
  // Step 1
  artist_name: string
  real_name: string
  genre: string[]
  location: string
  // Step 2
  bio: string
  profile_photo_url: string
  // Step 3
  links: Array<{ platform: string; label: string; url: string }>
  // Step 4
  goals: {
    monthly_listeners_target: string
    primary_goal: string
    career_stage: string
    release_timeline: string
  }
}

const TOTAL_STEPS = 4

const STEP_LABELS = [
  'The basics',
  'Your story',
  'Your links',
  'Your goals',
]

export function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    artist_name: '',
    real_name: '',
    genre: [],
    location: '',
    bio: '',
    profile_photo_url: '',
    links: [],
    goals: {
      monthly_listeners_target: '',
      primary_goal: '',
      career_stage: '',
      release_timeline: '',
    },
  })

  function update(partial: Partial<OnboardingData>) {
    setData((d) => ({ ...d, ...partial }))
  }

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function finish() {
    if (!user) return
    setSaving(true)

    // Build the slug from artist_name
    const slug = data.artist_name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    // Update the profile row (created automatically by the trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        artist_name: data.artist_name,
        real_name: data.real_name || null,
        bio: data.bio || null,
        genre: data.genre,
        location: data.location || null,
        profile_photo_url: data.profile_photo_url || null,
        slug,
        goals: data.goals,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      setSaving(false)
      return
    }

    // Insert links if any
    if (data.links.length > 0) {
      const linksPayload = data.links.map((l, i) => ({
        profile_id: user.id,
        platform: l.platform,
        label: l.label,
        url: l.url,
        display_order: i,
        is_visible: true,
      }))

      await supabase.from('links').insert(linksPayload)
    }

    navigate('/dashboard')
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-[var(--color-black)] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 w-full bg-[var(--color-surface-raised)]">
        <div
          className="h-full bg-[var(--color-accent)] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">
              Step {step} of {TOTAL_STEPS}
            </p>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {STEP_LABELS[step - 1]}
            </h2>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            Small World <span className="text-[var(--color-accent)]">Assist</span>
          </span>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-5 pb-8">
        {step === 1 && (
          <StepBasicInfo data={data} update={update} onNext={next} />
        )}
        {step === 2 && (
          <StepBioPhoto data={data} update={update} onNext={next} onBack={back} />
        )}
        {step === 3 && (
          <StepLinks data={data} update={update} onNext={next} onBack={back} />
        )}
        {step === 4 && (
          <StepGoals
            data={data}
            update={update}
            onFinish={finish}
            onBack={back}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}
