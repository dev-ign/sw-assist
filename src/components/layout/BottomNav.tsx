import { NavLink } from "react-router-dom";
import { House, Link2, Briefcase, BarChart2, User } from "lucide-react";

const TABS = [
  { to: "/dashboard", icon: House, label: "Home" },
  { to: "/page", icon: Link2, label: "Page" },
  { to: "/epk", icon: Briefcase, label: "EPK" },
  { to: "/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/profile/edit", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <div className="flex items-stretch">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 text-[10px] font-medium tracking-wide transition-colors",
                isActive
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      {/* Safe area spacer for iOS home indicator */}
      <div
        className="h-safe-bottom bg-[var(--color-surface)]"
        style={{ height: "env(safe-area-inset-bottom)" }}
      />
    </nav>
  );
}
