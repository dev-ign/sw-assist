import { useRef, useState } from 'react'
import type { OnboardingData } from '../Onboarding'
import { Button } from '../../../components/ui/Button'
import { Textarea } from '../../../components/ui/Textarea'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { Camera } from 'lucide-react'

interface Props {
  data: OnboardingData
  update: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export function StepBioPhoto({ data, update, onNext, onBack }: Props) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handlePhotoUpload(file: File) {
    if (!user) return
    setUploading(true)
    setUploadError('')

    const ext = file.name.split('.').pop()
    const path = `${user.id}/profile.${ext}`

    const { error } = await supabase.storage
      .from('profile-assets')
      .upload(path, file, { upsert: true })

    if (error) {
      setUploadError('Upload failed. Try again.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('profile-assets')
      .getPublicUrl(path)

    update({ profile_photo_url: urlData.publicUrl })
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
        Put a face to the name. Your bio and photo are the first things people see.
      </p>

      {/* Photo upload */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-24 h-24 rounded-full bg-[var(--color-surface-raised)] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors overflow-hidden flex items-center justify-center"
        >
          {data.profile_photo_url ? (
            <img
              src={data.profile_photo_url}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera size={24} className="text-[var(--color-text-muted)]" />
          )}
          {uploading ? (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : null}
        </button>
        <p className="text-xs text-[var(--color-text-muted)]">
          {data.profile_photo_url ? 'Tap to change' : 'Upload photo'}
        </p>
        {uploadError ? (
          <p className="text-xs text-[var(--color-error)]">{uploadError}</p>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handlePhotoUpload(file)
          }}
        />
      </div>

      <Textarea
        label="Bio"
        placeholder="Tell your story. Who are you as an artist? What drives your music?"
        value={data.bio}
        onChange={(e) => update({ bio: e.target.value })}
        rows={5}
        hint="This will appear on your artist page and EPK"
      />

      <div className="flex gap-3">
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
