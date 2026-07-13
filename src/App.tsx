import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense, useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminGuard from "@/components/AdminGuard";
import '@/lib/error-monitor'; // Initialize global error monitoring
import { OfflineBanner } from "@/components/OfflineBanner";
import { LazyMotionProvider } from "@/components/motion/LazyMotionProvider";
import A11yBootstrap from "@/components/A11yBootstrap";
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
import NotFound from "./pages/NotFound";

// Lazy — trims initial JS for landing visitors; prefetched on CTA hover.
const Auth = lazy(() => import("./pages/Auth"));

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
const InstructorDashboard = lazy(() => import("./pages/InstructorDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Governance = lazy(() => import("./pages/Governance"));
const FeedbackHistory = lazy(() => import("./pages/FeedbackHistory"));
const Health = lazy(() => import("./pages/Health"));
const Intelligence = lazy(() => import("./pages/Intelligence"));
const ADRs = lazy(() => import("./pages/ADRs"));

// Blog + admin phase 1
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const AdminShell = lazy(() => import("./components/admin/AdminShell"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminArticles = lazy(() => import("./pages/admin/AdminArticles"));
const AdminArticleEdit = lazy(() => import("./pages/admin/AdminArticleEdit"));
const AdminAds = lazy(() => import("./pages/admin/AdminAds"));
const AdminAdEdit = lazy(() => import("./pages/admin/AdminAdEdit"));
const AdminPlaceholder = lazy(() => import("./pages/admin/AdminPlaceholder"));
const AdminComments = lazy(() => import("./pages/admin/AdminComments"));
const AdminNewsletter = lazy(() => import("./pages/admin/AdminNewsletter"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminCampaigns = lazy(() => import("./pages/admin/AdminCampaigns"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminReportsDigest = lazy(() => import("./pages/admin/AdminReportsDigest"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));
const AdminIntelligence = lazy(() => import("./pages/admin/AdminIntelligence"));
const AdminSessions = lazy(() => import("./pages/admin/AdminSessions"));
const AdminSessionDetail = lazy(() => import("./pages/admin/AdminSessionDetail"));
const AdminEdgeErrors = lazy(() => import("./pages/admin/AdminEdgeErrors"));

// SEO content pages (public, indexable)
const GDTopics = lazy(() => import("./pages/GDTopics"));
const HowToCrackGD = lazy(() => import("./pages/HowToCrackGD"));
const CommonGDMistakes = lazy(() => import("./pages/CommonGDMistakes"));
const CommunicationSkills = lazy(() => import("./pages/CommunicationSkills"));
const About = lazy(() => import("./pages/About"));
const GDPreparationGuide = lazy(() => import("./pages/GDPreparationGuide"));
const AIGDSimulator = lazy(() => import("./pages/AIGDSimulator"));
const SpeakConfidently = lazy(() => import("./pages/SpeakConfidently"));
const StartGD = lazy(() => import("./pages/StartGD"));
const ConcludeGD = lazy(() => import("./pages/ConcludeGD"));
const BodyLanguageTips = lazy(() => import("./pages/BodyLanguageTips"));
const GDTopicPage = lazy(() => import("./pages/GDTopicPage"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-live="polite">
    <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    <span className="sr-only">Loading…</span>
  </div>
);

// Branded landing skeleton — mirrors hero layout to prevent CLS.
const LandingSkeleton = () => (
  <div className="min-h-dvh flex flex-col" aria-busy="true" aria-live="polite">
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="h-14 rounded-full skeleton-shimmer" />
    </div>
    <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-16 flex-1">
      <div className="rounded-[2.5rem] p-8 md:p-12 space-y-6 skeleton-shimmer min-h-[520px]" />
    </div>
    <span className="sr-only">Loading GD Buddy…</span>
  </div>
);

// Auth skeleton — mirrors auth card to prevent CLS.
const AuthSkeleton = () => (
  <div className="min-h-dvh flex items-center justify-center px-4" aria-busy="true" aria-live="polite">
    <div className="w-full max-w-md space-y-4">
      <div className="h-10 rounded-2xl skeleton-shimmer" />
      <div className="h-64 rounded-3xl skeleton-shimmer" />
      <div className="h-12 rounded-2xl skeleton-shimmer" />
    </div>
    <span className="sr-only">Loading sign in…</span>
  </div>
);

// Redirect authenticated users from / to /home
const LandingGuard = () => {
  const { user, loading } = useAuth();
  if (loading) return <LandingSkeleton />;
  if (user) return <Navigate to="/home" replace />;
  return <Landing />;
};

// Redirect authenticated users away from /auth
const AuthGuard = () => {
  const { user, loading } = useAuth();
  if (loading) return <AuthSkeleton />;
  if (user) return <Navigate to="/home" replace />;
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <Auth />
    </Suspense>
  );
};

// Protect all /home/* routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};



import { useTracker } from "@/hooks/useTracker";

const RouteTracker = () => { useTracker(); return null; };

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <LazyMotionProvider>
        <TooltipProvider>
          <RouteTracker />
          <Toaster />
          <Sonner />
          <OfflineBanner />
          <A11yBootstrap />
          <ErrorBoundary fallbackTitle="Application Error">
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Public landing page — canonical ranking page */}
              <Route path="/" element={<LandingGuard />} />

              {/* Public SEO pages */}
              <Route path="/gd-topics-for-placements" element={<GDTopics />} />
              <Route path="/how-to-crack-group-discussion" element={<HowToCrackGD />} />
              <Route path="/common-gd-mistakes" element={<CommonGDMistakes />} />
              <Route path="/communication-skills-for-gd" element={<CommunicationSkills />} />
              <Route path="/about" element={<About />} />
              <Route path="/group-discussion-preparation-guide" element={<GDPreparationGuide />} />
              <Route path="/ai-gd-simulator" element={<AIGDSimulator />} />
              <Route path="/how-to-speak-confidently-in-group-discussion" element={<SpeakConfidently />} />
              <Route path="/how-to-start-group-discussion" element={<StartGD />} />
              <Route path="/how-to-conclude-gd-round" element={<ConcludeGD />} />
              <Route path="/body-language-tips-for-gd" element={<BodyLanguageTips />} />
              <Route path="/gd-topic/:slug" element={<GDTopicPage />} />

              {/* Blog (public) */}
              <Route path="/blog" element={<Suspense fallback={<Loading />}><Blog /></Suspense>} />
              <Route path="/blog/:slug" element={<Suspense fallback={<Loading />}><BlogArticle /></Suspense>} />

              <Route path="/auth" element={<AuthGuard />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />

              {/* Protected app routes under /home */}
              <Route path="/home" element={<ProtectedRoute><Suspense fallback={<Loading />}><AppLayout /></Suspense></ProtectedRoute>}>
                <Route index element={<Suspense fallback={<HomeSkeleton />}><PageTransition><Home /></PageTransition></Suspense>} />
                <Route path="dashboard" element={<Suspense fallback={<DashboardSkeleton />}><PageTransition><Dashboard /></PageTransition></Suspense>} />
                <Route path="practice" element={<Suspense fallback={<PracticeSkeleton />}><PageTransition><Practice /></PageTransition></Suspense>} />
                <Route path="practice/setup" element={<Suspense fallback={<SessionSkeleton />}><PageTransition><PracticeSetup /></PageTransition></Suspense>} />
                <Route path="session/:sessionId" element={<ErrorBoundary fallbackTitle="Session Error"><Suspense fallback={<SessionSkeleton />}><PageTransition><Session /></PageTransition></Suspense></ErrorBoundary>} />
                <Route path="session/:sessionId/report" element={<ErrorBoundary fallbackTitle="Report Error"><Suspense fallback={<DashboardSkeleton />}><PageTransition><SessionReportPage /></PageTransition></Suspense></ErrorBoundary>} />
                <Route path="multiplayer" element={<Suspense fallback={<PageSkeleton />}><PageTransition><Multiplayer /></PageTransition></Suspense>} />
                <Route path="multiplayer/topic" element={<Suspense fallback={<PageSkeleton />}><PageTransition><MultiplayerTopic /></PageTransition></Suspense>} />
                <Route path="multiplayer/setup" element={<Suspense fallback={<SessionSkeleton />}><PageTransition><MultiplayerSetup /></PageTransition></Suspense>} />
                <Route path="drills" element={<ErrorBoundary fallbackTitle="Drills Error"><Suspense fallback={<DrillsSkeleton />}><PageTransition><SkillDrills /></PageTransition></Suspense></ErrorBoundary>} />
                <Route path="profile" element={<Suspense fallback={<ProfileSkeleton />}><PageTransition><Profile /></PageTransition></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<SettingsSkeleton />}><PageTransition><Settings /></PageTransition></Suspense>} />
                <Route path="instructor" element={<Suspense fallback={<DashboardSkeleton />}><PageTransition><InstructorDashboard /></PageTransition></Suspense>} />
                <Route path="admin" element={<AdminGuard><Suspense fallback={<DashboardSkeleton />}><AdminShell /></Suspense></AdminGuard>}>
                  <Route index element={<Suspense fallback={<DashboardSkeleton />}><Admin /></Suspense>} />
                  <Route path="analytics" element={<Suspense fallback={<DashboardSkeleton />}><AdminAnalytics /></Suspense>} />
                  <Route path="articles" element={<Suspense fallback={<DashboardSkeleton />}><AdminArticles /></Suspense>} />
                  <Route path="articles/new" element={<Suspense fallback={<DashboardSkeleton />}><AdminArticleEdit /></Suspense>} />
                  <Route path="articles/:id/edit" element={<Suspense fallback={<DashboardSkeleton />}><AdminArticleEdit /></Suspense>} />
                  <Route path="ads" element={<Suspense fallback={<DashboardSkeleton />}><AdminAds /></Suspense>} />
                  <Route path="ads/new" element={<Suspense fallback={<DashboardSkeleton />}><AdminAdEdit /></Suspense>} />
                  <Route path="ads/:id/edit" element={<Suspense fallback={<DashboardSkeleton />}><AdminAdEdit /></Suspense>} />
                  <Route path="users" element={<Suspense fallback={<DashboardSkeleton />}><AdminUsers /></Suspense>} />
                  <Route path="sessions" element={<Suspense fallback={<DashboardSkeleton />}><AdminSessions /></Suspense>} />
                  <Route path="sessions/:id" element={<Suspense fallback={<DashboardSkeleton />}><AdminSessionDetail /></Suspense>} />
                  <Route path="categories" element={<Suspense fallback={<DashboardSkeleton />}><AdminPlaceholder title="Categories" note="Manage categories via SQL for now — full UI in Phase 3." /></Suspense>} />
                  <Route path="tags" element={<Suspense fallback={<DashboardSkeleton />}><AdminPlaceholder title="Tags" /></Suspense>} />
                  <Route path="campaigns" element={<Suspense fallback={<DashboardSkeleton />}><AdminCampaigns /></Suspense>} />
                  <Route path="comments" element={<Suspense fallback={<DashboardSkeleton />}><AdminComments /></Suspense>} />
                  <Route path="newsletter" element={<Suspense fallback={<DashboardSkeleton />}><AdminNewsletter /></Suspense>} />
                  <Route path="reports" element={<Suspense fallback={<DashboardSkeleton />}><AdminReports /></Suspense>} />
                  <Route path="reports/digest" element={<Suspense fallback={<DashboardSkeleton />}><AdminReportsDigest /></Suspense>} />
                  <Route path="revenue" element={<Suspense fallback={<DashboardSkeleton />}><AdminRevenue /></Suspense>} />
                  <Route path="intelligence" element={<Suspense fallback={<DashboardSkeleton />}><AdminIntelligence /></Suspense>} />
                  <Route path="settings" element={<Suspense fallback={<DashboardSkeleton />}><AdminSettingsPage /></Suspense>} />
                  <Route path="audit" element={<Suspense fallback={<DashboardSkeleton />}><AdminAudit /></Suspense>} />
                </Route>
                <Route path="governance" element={<Suspense fallback={<DashboardSkeleton />}><PageTransition><Governance /></PageTransition></Suspense>} />
                <Route path="feedback" element={<Suspense fallback={<DashboardSkeleton />}><PageTransition><FeedbackHistory /></PageTransition></Suspense>} />
                <Route path="health" element={<Suspense fallback={<Loading />}><PageTransition><Health /></PageTransition></Suspense>} />
                <Route path="intelligence" element={<Suspense fallback={<DashboardSkeleton />}><PageTransition><Intelligence /></PageTransition></Suspense>} />
                <Route path="adrs" element={<Suspense fallback={<DashboardSkeleton />}><PageTransition><ADRs /></PageTransition></Suspense>} />
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
          </ErrorBoundary>
        </TooltipProvider>
        </LazyMotionProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
