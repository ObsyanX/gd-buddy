import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import {
  HomeSkeleton,
  DashboardSkeleton,
  ProfileSkeleton,
  SettingsSkeleton,
  DrillsSkeleton,
  PracticeSkeleton,
  SessionSkeleton,
  PageSkeleton,
} from "@/components/SkeletonLoaders";
import PageTransition from "@/components/PageTransition";

// Eager load core pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Layout
const AppLayout = lazy(() => import("./layouts/AppLayout"));

// Lazy load all app pages
const Home = lazy(() => import("./pages/Home"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Practice = lazy(() => import("./pages/Practice"));
const PracticeSetup = lazy(() => import("./pages/PracticeSetup"));
const Session = lazy(() => import("./pages/Session"));
const SessionReportPage = lazy(() => import("./pages/SessionReportPage"));
const Multiplayer = lazy(() => import("./pages/Multiplayer"));
const MultiplayerTopic = lazy(() => import("./pages/MultiplayerTopic"));
const MultiplayerSetup = lazy(() => import("./pages/MultiplayerSetup"));
const SkillDrills = lazy(() => import("./pages/SkillDrills"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));

// SEO content pages (public, indexable)
const GDTopics = lazy(() => import("./pages/GDTopics"));
const HowToCrackGD = lazy(() => import("./pages/HowToCrackGD"));
const CommonGDMistakes = lazy(() => import("./pages/CommonGDMistakes"));
const CommunicationSkills = lazy(() => import("./pages/CommunicationSkills"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <p className="text-xl font-mono">LOADING...</p>
  </div>
);

// Redirect authenticated users from / to /home
const LandingGuard = () => {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/home" replace />;
  return <Landing />;
};

// Redirect authenticated users away from /auth
const AuthGuard = () => {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/home" replace />;
  return <Auth />;
};

// Protect all /home/* routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Public landing page — canonical ranking page */}
              <Route path="/" element={<LandingGuard />} />

              {/* Public SEO pages */}
              <Route path="/gd-topics-for-placements" element={<GDTopics />} />
              <Route path="/how-to-crack-group-discussion" element={<HowToCrackGD />} />
              <Route path="/common-gd-mistakes" element={<CommonGDMistakes />} />
              <Route path="/communication-skills-for-gd" element={<CommunicationSkills />} />

              <Route path="/auth" element={<AuthGuard />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />

              {/* Protected app routes under /home */}
              <Route path="/home" element={<ProtectedRoute><Suspense fallback={<Loading />}><AppLayout /></Suspense></ProtectedRoute>}>
                <Route index element={<Suspense fallback={<HomeSkeleton />}><PageTransition><Home /></PageTransition></Suspense>} />
                <Route path="dashboard" element={<Suspense fallback={<DashboardSkeleton />}><PageTransition><Dashboard /></PageTransition></Suspense>} />
                <Route path="practice" element={<Suspense fallback={<PracticeSkeleton />}><PageTransition><Practice /></PageTransition></Suspense>} />
                <Route path="practice/setup" element={<Suspense fallback={<SessionSkeleton />}><PageTransition><PracticeSetup /></PageTransition></Suspense>} />
                <Route path="session/:sessionId" element={<Suspense fallback={<SessionSkeleton />}><PageTransition><Session /></PageTransition></Suspense>} />
                <Route path="session/:sessionId/report" element={<Suspense fallback={<DashboardSkeleton />}><PageTransition><SessionReportPage /></PageTransition></Suspense>} />
                <Route path="multiplayer" element={<Suspense fallback={<PageSkeleton />}><PageTransition><Multiplayer /></PageTransition></Suspense>} />
                <Route path="multiplayer/topic" element={<Suspense fallback={<PageSkeleton />}><PageTransition><MultiplayerTopic /></PageTransition></Suspense>} />
                <Route path="multiplayer/setup" element={<Suspense fallback={<SessionSkeleton />}><PageTransition><MultiplayerSetup /></PageTransition></Suspense>} />
                <Route path="drills" element={<Suspense fallback={<DrillsSkeleton />}><PageTransition><SkillDrills /></PageTransition></Suspense>} />
                <Route path="profile" element={<Suspense fallback={<ProfileSkeleton />}><PageTransition><Profile /></PageTransition></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<SettingsSkeleton />}><PageTransition><Settings /></PageTransition></Suspense>} />
              </Route>

              {/* Legacy redirects: redirect old paths to new /home/* paths */}
              <Route path="/dashboard" element={<Navigate to="/home/dashboard" replace />} />
              <Route path="/practice" element={<Navigate to="/home/practice" replace />} />
              <Route path="/practice/setup" element={<Navigate to="/home/practice/setup" replace />} />
              <Route path="/session/:sessionId" element={<Navigate to="/home/session/:sessionId" replace />} />
              <Route path="/drills" element={<Navigate to="/home/drills" replace />} />
              <Route path="/multiplayer" element={<Navigate to="/home/multiplayer" replace />} />
              <Route path="/profile" element={<Navigate to="/home/profile" replace />} />
              <Route path="/settings" element={<Navigate to="/home/settings" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
