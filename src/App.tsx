import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { AppShell } from "./components/layout/AppShell";
import { SignUp } from "./pages/auth/SignUp";
import { Login } from "./pages/auth/Login";
import { Onboarding } from "./pages/onboarding/Onboarding";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { EditProfile } from "./pages/profile/EditProfile";
import { PageEditor } from "./pages/artist-page/PageEditor";
import { ArtistPage } from "./pages/public/ArtistPage";

function Spinner() {
  return (
    <div className="min-h-screen bg-[var(--color-black)] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (profile?.onboarding_completed)
    return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6">
      <p className="text-[var(--color-text-muted)] text-sm">
        {label} — coming soon
      </p>
    </div>
  );
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;

  return (
    <Routes>
      {/* ── Public auth ── */}
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />

      {/* ── Onboarding (standalone, no bottom nav) ── */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <Onboarding />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />

      {/* ── App shell (protected, with bottom nav) ── */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/page" element={<PageEditor />} />
        <Route path="/epk" element={<ComingSoon label="EPK" />} />
        <Route path="/analytics" element={<ComingSoon label="Analytics" />} />
        <Route path="/profile/edit" element={<EditProfile />} />
      </Route>

      {/* ── Public artist page (no auth) ── */}
      <Route path="/:artistSlug/:pageSlug" element={<ArtistPage />} />

      {/* ── Root redirect ── */}
      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/signup" replace />
          ) : !profile?.onboarding_completed ? (
            <Navigate to="/onboarding" replace />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* ── Catch-all ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
