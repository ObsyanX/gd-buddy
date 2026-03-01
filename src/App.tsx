import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";

// Eager load core pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load all other pages
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
              {/* Public SEO pages */}
              <Route path="/gd-topics-for-placements" element={<GDTopics />} />
              <Route path="/how-to-crack-group-discussion" element={<HowToCrackGD />} />
              <Route path="/common-gd-mistakes" element={<CommonGDMistakes />} />
              <Route path="/communication-skills-for-gd" element={<CommunicationSkills />} />

              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset-password" element={<Suspense fallback={<Loading />}><ResetPassword /></Suspense>} />

              {/* Protected routes (noindex) */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
              <Route path="/practice/setup" element={<ProtectedRoute><PracticeSetup /></ProtectedRoute>} />
              <Route path="/session/:sessionId" element={<ProtectedRoute><Session /></ProtectedRoute>} />
              <Route path="/session/:sessionId/report" element={<ProtectedRoute><SessionReportPage /></ProtectedRoute>} />
              <Route path="/multiplayer" element={<ProtectedRoute><Multiplayer /></ProtectedRoute>} />
              <Route path="/multiplayer/topic" element={<ProtectedRoute><MultiplayerTopic /></ProtectedRoute>} />
              <Route path="/multiplayer/setup" element={<ProtectedRoute><MultiplayerSetup /></ProtectedRoute>} />
              <Route path="/drills" element={<ProtectedRoute><SkillDrills /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
