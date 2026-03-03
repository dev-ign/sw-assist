import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function Dashboard() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[var(--color-black)] flex flex-col">
      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Profile photo */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex-shrink-0">
              {profile?.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt={profile.artist_name ?? 'Artist'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[var(--color-accent-subtle)]" />
              )}
            </div>
          </div>

          {/* Name + greeting */}
          <div>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">
              Good morning
            </p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight">
                {profile?.artist_name ?? 'Artist'}
              </h1>
              <button
                onClick={() => navigate('/profile/edit')}
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-all"
                aria-label="Edit profile"
              >
                <Pencil size={13} />
              </button>
            </div>
            {profile?.genre && profile.genre.length > 0 && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {profile.genre.join(' · ')}
              </p>
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={signOut} className="text-xs">
          Sign out
        </Button>
      </div>

      <div className="px-5 flex flex-col gap-6 pb-12">
        {/* ── AI Briefing card ── */}
        <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <p className="text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-[0.15em]">
              Your manager
            </p>
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
            Your daily briefing is being set up. Connect your Spotify account and
            we'll have your first briefing ready tomorrow morning.
          </p>
          <Button variant="secondary" size="sm" className="self-start">
            Connect Spotify
          </Button>
        </div>

        {/* ── Pillars grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Artist Page', desc: 'Your public presence', icon: '◈' },
            { label: 'EPK',         desc: 'Your press kit',       icon: '◉' },
            { label: 'Analytics',   desc: 'Your numbers',         icon: '◎' },
            { label: 'Opportunities', desc: "What's out there",   icon: '◇' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 flex flex-col gap-2 cursor-pointer hover:border-[var(--color-accent)] active:scale-[0.98] transition-all"
            >
              <span className="text-base text-[var(--color-accent)] font-light">
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {item.label}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
