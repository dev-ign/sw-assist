import { useState } from 'react'
import type { OnboardingData } from '../Onboarding'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  data: OnboardingData
  update: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const PLATFORM_PRESETS = [
  { platform: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...' },
  { platform: 'apple_music', label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
  { platform: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { platform: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { platform: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
]

export function StepLinks({ data, update, onNext, onBack }: Props) {
  const [activePresets, setActivePresets] = useState<string[]>([])

  function togglePreset(platform: string) {
    if (activePresets.includes(platform)) {
      setActivePresets((p) => p.filter((x) => x !== platform))
      update({
        links: data.links.filter((l) => l.platform !== platform),
      })
    } else {
      const preset = PLATFORM_PRESETS.find((p) => p.platform === platform)!
      setActivePresets((p) => [...p, platform])
      update({
        links: [
          ...data.links,
          { platform, label: preset.label, url: '' },
        ],
      })
    }
  }

  function updateLinkUrl(platform: string, url: string) {
    update({
      links: data.links.map((l) =>
        l.platform === platform ? { ...l, url } : l,
      ),
    })
  }

  function addCustomLink() {
    update({
      links: [...data.links, { platform: 'custom', label: '', url: '' }],
    })
  }

  function removeCustomLink(index: number) {
    update({ links: data.links.filter((_, i) => i !== index) })
  }

  function updateCustomLink(
    index: number,
    field: 'label' | 'url',
    value: string,
  ) {
    update({
      links: data.links.map((l, i) =>
        i === index ? { ...l, [field]: value } : l,
      ),
    })
  }

  const presetLinks = data.links.filter((l) => l.platform !== 'custom')
  const customLinks = data.links.filter((l) => l.platform === 'custom')

  return (
    <div className="flex flex-col gap-6 pt-2">
      <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
        Add your streaming and social links. These will appear on your artist page.
      </p>

      {/* Platform chips */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Select platforms
        </p>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_PRESETS.map((p) => {
            const active = activePresets.includes(p.platform)
            return (
              <button
                key={p.platform}
                type="button"
                onClick={() => togglePreset(p.platform)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  active
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* URL inputs for selected presets */}
      {presetLinks.length > 0 && (
        <div className="flex flex-col gap-4">
          {presetLinks.map((link) => {
            const preset = PLATFORM_PRESETS.find(
              (p) => p.platform === link.platform,
            )!
            return (
              <Input
                key={link.platform}
                label={preset.label}
                type="url"
                placeholder={preset.placeholder}
                value={link.url}
                onChange={(e) => updateLinkUrl(link.platform, e.target.value)}
              />
            )
          })}
        </div>
      )}

      {/* Custom links */}
      {customLinks.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            Custom links
          </p>
          {customLinks.map((link, i) => {
            const actualIndex = data.links.indexOf(link)
            return (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 flex flex-col gap-2">
                  <Input
                    placeholder="Label (e.g. Website)"
                    value={link.label}
                    onChange={(e) =>
                      updateCustomLink(actualIndex, 'label', e.target.value)
                    }
                  />
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) =>
                      updateCustomLink(actualIndex, 'url', e.target.value)
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomLink(actualIndex)}
                  className="mt-1 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addCustomLink}
        className="flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline self-start"
      >
        <Plus size={16} />
        Add custom link
      </button>

      <div className="flex gap-3 mt-2">
        <Button onClick={onBack} variant="secondary" size="lg" className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} size="lg" className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  )
}
