import type { OnboardingData } from '../Onboarding'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'

interface Props {
  data: OnboardingData
  update: (partial: Partial<OnboardingData>) => void
  onFinish: () => void
  onBack: () => void
  saving: boolean
}

const PRIMARY_GOALS = [
  'Grow my streaming numbers',
  'Land a sync placement',
  'Book more shows',
  'Get on playlists',
  'Attract label attention',
  'Build my fanbase',
]

const CAREER_STAGES = [
  { value: 'just_starting', label: 'Just starting out' },
  { value: 'building', label: 'Building momentum' },
  { value: 'established', label: 'Established indie' },
  { value: 'scaling', label: 'Scaling up' },
]

const RELEASE_TIMELINES = [
  { value: 'asap', label: 'ASAP' },
  { value: '1_3_months', label: '1–3 months' },
  { value: '3_6_months', label: '3–6 months' },
  { value: 'no_release', label: 'No release planned' },
]

export function StepGoals({ data, update, onFinish, onBack, saving }: Props) {
  const goals = data.goals

  function updateGoal(key: keyof typeof goals, value: string) {
    update({ goals: { ...goals, [key]: value } })
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
        Your goals are what your AI manager uses to give you direction. Be honest — this is just for you.
      </p>

      {/* Primary goal */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          What's your main focus right now?
        </p>
        <div className="flex flex-col gap-2">
          {PRIMARY_GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => updateGoal('primary_goal', g)}
              className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                goals.primary_goal === g
                  ? 'bg-[var(--color-accent-subtle)] border border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
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
          Where are you in your career?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CAREER_STAGES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => updateGoal('career_stage', s.value)}
              className={`text-left px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                goals.career_stage === s.value
                  ? 'bg-[var(--color-accent-subtle)] border border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Next release */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          When's your next release?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {RELEASE_TIMELINES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => updateGoal('release_timeline', t.value)}
              className={`text-left px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                goals.release_timeline === t.value
                  ? 'bg-[var(--color-accent-subtle)] border border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
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
        value={goals.monthly_listeners_target}
        onChange={(e) => updateGoal('monthly_listeners_target', e.target.value)}
        hint="Optional — helps your manager set benchmarks"
      />

      <div className="flex gap-3 mt-2">
        <Button onClick={onBack} variant="secondary" size="lg" className="flex-1">
          Back
        </Button>
        <Button onClick={onFinish} loading={saving} size="lg" className="flex-1">
          {saving ? 'Setting up...' : "Let's go"}
        </Button>
      </div>
    </div>
  )
}
