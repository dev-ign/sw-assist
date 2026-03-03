import type { OnboardingData } from '../Onboarding'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useState } from 'react'
import { GENRES } from '../../../lib/constants'

interface Props {
  data: OnboardingData
  update: (partial: Partial<OnboardingData>) => void
  onNext: () => void
}

export function StepBasicInfo({ data, update, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!data.artist_name.trim()) e.artist_name = 'Artist name is required'
    if (data.genre.length === 0) e.genre = 'Pick at least one genre'
    return e
  }

  function handleNext() {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    onNext()
  }

  function toggleGenre(g: string) {
    const current = data.genre
    const updated = current.includes(g)
      ? current.filter((x) => x !== g)
      : [...current, g].slice(0, 3) // max 3
    update({ genre: updated })
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
        Let's get to know you. This is how you'll appear to fans, labels, and curators.
      </p>

      <Input
        label="Artist name *"
        placeholder="e.g. KXNG Crooked"
        value={data.artist_name}
        onChange={(e) => {
          update({ artist_name: e.target.value })
          setErrors((err) => ({ ...err, artist_name: '' }))
        }}
        error={errors.artist_name}
      />

      <Input
        label="Real name"
        placeholder="Optional"
        value={data.real_name}
        onChange={(e) => update({ real_name: e.target.value })}
        hint="Only visible to you"
      />

      <Input
        label="City / Location"
        placeholder="e.g. Los Angeles, CA"
        value={data.location}
        onChange={(e) => update({ location: e.target.value })}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Genre{' '}
          <span className="text-[var(--color-text-muted)] font-normal">(pick up to 3)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => {
            const selected = data.genre.includes(g)
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  toggleGenre(g)
                  setErrors((err) => ({ ...err, genre: '' }))
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selected
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
              >
                {g}
              </button>
            )
          })}
        </div>
        {errors.genre ? (
          <p className="text-xs text-[var(--color-error)]">{errors.genre}</p>
        ) : null}
      </div>

      <Button onClick={handleNext} size="lg" className="w-full mt-2">
        Continue
      </Button>
    </div>
  )
}
