import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Suspense, useEffect } from "react";
import { lazyRetry as lazy } from "@/lib/lazy-retry";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteBoundary from "@/components/RouteBoundary";
import AdminGuard from "@/components/AdminGuard";
import '@/lib/error-monitor'; // Initialize global error monitoring
import { OfflineBanner } from "@/components/OfflineBanner";
import PWAInstallBanner from "@/components/PWAInstallBanner";
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

// Public content pages (eagerly loaded for AdSense/SEO crawlers)
import About from "./pages/About";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import Contact from "./pages/legal/Contact";
import Disclaimer from "./pages/legal/Disclaimer";
import GDTopics from "./pages/GDTopics";
import HowToCrackGD from "./pages/HowToCrackGD";
import CommonGDMistakes from "./pages/CommonGDMistakes";
import CommunicationSkills from "./pages/CommunicationSkills";
import GDPreparationGuide from "./pages/GDPreparationGuide";
import AIGDSimulator from "./pages/AIGDSimulator";
import SpeakConfidently from "./pages/SpeakConfidently";
import StartGD from "./pages/StartGD";
import ConcludeGD from "./pages/ConcludeGD";
import BodyLanguageTips from "./pages/BodyLanguageTips";
import GDTopicPage from "./pages/GDTopicPage";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import AdsenseTest from "./pages/AdsenseTest";

import {
  ProfileDeepLink,
  ReportDeepLink,
  MultiplayerJoinDeepLink,
  InviteDeepLink,
} from "@/components/DeepLinks";

// Lazy — trims initial JS for landing visitors; prefetched on CTA hover.
const Auth = lazy(() => import("./pages/Auth"), "Auth");

// Layout
const AppLayout = lazy(() => import("./layouts/AppLayout"), "AppLayout");

// Lazy load all app pages
const Home = lazy(() => import("./pages/Home"), "Home");
const ResetPassword = lazy(() => import("./pages/ResetPassword"), "ResetPassword");
const Dashboard = lazy(() => import("./pages/Dashboard"), "Dashboard");
const Practice = lazy(() => import("./pages/Practice"), "Practice");
const PracticeSetup = lazy(() => import("./pages/PracticeSetup"), "PracticeSetup");
const Session = lazy(() => import("./pages/Session"), "Session");
const SessionReportPage = lazy(() => import("./pages/SessionReportPage"), "SessionReportPage");
const Multiplayer = lazy(() => import("./pages/Multiplayer"), "Multiplayer");
const MultiplayerTopic = lazy(() => import("./pages/MultiplayerTopic"), "MultiplayerTopic");
const MultiplayerSetup = lazy(() => import("./pages/MultiplayerSetup"), "MultiplayerSetup");
const SkillDrills = lazy(() => import("./pages/SkillDrills"), "SkillDrills");
const Profile = lazy(() => import("./pages/Profile"), "Profile");
const Settings = lazy(() => import("./pages/Settings"), "Settings");
const InstructorDashboard = lazy(() => import("./pages/InstructorDashboard"), "InstructorDashboard");
const Admin = lazy(() => import("./pages/Admin"), "Admin");
const Governance = lazy(() => import("./pages/Governance"), "Governance");
const FeedbackHistory = lazy(() => import("./pages/FeedbackHistory"), "FeedbackHistory");
const Health = lazy(() => import("./pages/Health"), "Health");
const Intelligence = lazy(() => import("./pages/Intelligence"), "Intelligence");
const ADRs = lazy(() => import("./pages/ADRs"), "ADRs");

// Legal & policy pages (required for AdSense) — already eagerly imported above
// Public content pages — already eagerly imported above

// Auth
const Auth = lazy(() => import("./pages/Auth"), "Auth");

// Layout
const AppLayout = lazy(() => import("./layouts/AppLayout"), "AppLayout");

// Lazy load all authenticated app pages
const Home = lazy(() => import("./pages/Home"), "Home");
const ResetPassword = lazy(() => import("./pages/ResetPassword"), "ResetPassword");
const Dashboard = lazy(() => import("./pages/Dashboard"), "Dashboard");
const Practice = lazy(() => import("./pages/Practice"), "Practice");
const PracticeSetup = lazy(() => import("./pages/PracticeSetup"), "PracticeSetup");
const Session = lazy(() => import("./pages/Session"), "Session");
const SessionReportPage = lazy(() => import("./pages/SessionReportPage"), "SessionReportPage");
const Multiplayer = lazy(() => import("./pages/Multiplayer"), "Multiplayer");
const MultiplayerTopic = lazy(() => import("./pages/MultiplayerTopic"), "MultiplayerTopic");
const MultiplayerSetup = lazy(() => import("./pages/MultiplayerSetup"), "MultiplayerSetup");
const SkillDrills = lazy(() => import("./pages/SkillDrills"), "SkillDrills");
const Profile = lazy(() => import("./pages/Profile"), "Profile");
const Settings = lazy(() => import("./pages/Settings"), "Settings");
const InstructorDashboard = lazy(() => import("./pages/InstructorDashboard"), "InstructorDashboard");
const Admin = lazy(() => import("./pages/Admin"), "Admin");
const Governance = lazy(() => import("./pages/Governance"), "Governance");
const FeedbackHistory = lazy(() => import("./pages/FeedbackHistory"), "FeedbackHistory");
const Health = lazy(() => import("./pages/Health"), "Health");
const Intelligence = lazy(() => import("./pages/Intelligence"), "Intelligence");
const ADRs = lazy(() => import("./pages/ADRs"), "ADRs");

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
          <PWAInstallBanner />
          <A11yBootstrap />
          <ErrorBoundary fallbackTitle="Application Error">
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Public landing page — canonical ranking page */}
              <Route path="/" element={<RouteBoundary title="Home unavailable"><LandingGuard /></RouteBoundary>} />

              {/* Public SEO pages */}
              <Route path="/gd-topics-for-placements" element={<RouteBoundary><Suspense fallback={<Loading />}><GDTopics /></Suspense></RouteBoundary>} />
              <Route path="/how-to-crack-group-discussion" element={<RouteBoundary><Suspense fallback={<Loading />}><HowToCrackGD /></Suspense></RouteBoundary>} />
              <Route path="/common-gd-mistakes" element={<RouteBoundary><Suspense fallback={<Loading />}><CommonGDMistakes /></Suspense></RouteBoundary>} />
              <Route path="/communication-skills-for-gd" element={<RouteBoundary><Suspense fallback={<Loading />}><CommunicationSkills /></Suspense></RouteBoundary>} />
              <Route path="/about" element={<RouteBoundary><Suspense fallback={<Loading />}><About /></Suspense></RouteBoundary>} />
              <Route path="/group-discussion-preparation-guide" element={<RouteBoundary><Suspense fallback={<Loading />}><GDPreparationGuide /></Suspense></RouteBoundary>} />
              <Route path="/ai-gd-simulator" element={<RouteBoundary><Suspense fallback={<Loading />}><AIGDSimulator /></Suspense></RouteBoundary>} />
              <Route path="/how-to-speak-confidently-in-group-discussion" element={<RouteBoundary><Suspense fallback={<Loading />}><SpeakConfidently /></Suspense></RouteBoundary>} />
              <Route path="/how-to-start-group-discussion" element={<RouteBoundary><Suspense fallback={<Loading />}><StartGD /></Suspense></RouteBoundary>} />
              <Route path="/how-to-conclude-gd-round" element={<RouteBoundary><Suspense fallback={<Loading />}><ConcludeGD /></Suspense></RouteBoundary>} />
              <Route path="/body-language-tips-for-gd" element={<RouteBoundary><Suspense fallback={<Loading />}><BodyLanguageTips /></Suspense></RouteBoundary>} />
              <Route path="/gd-topic/:slug" element={<RouteBoundary><Suspense fallback={<Loading />}><GDTopicPage /></Suspense></RouteBoundary>} />

              {/* Blog (public) */}
              <Route path="/blog" element={<RouteBoundary><Suspense fallback={<Loading />}><Blog /></Suspense></RouteBoundary>} />
              <Route path="/blog/:slug" element={<RouteBoundary><Suspense fallback={<Loading />}><BlogArticle /></Suspense></RouteBoundary>} />

              {/* Legal & policy pages (required for AdSense) */}
              <Route path="/privacy" element={<RouteBoundary><Suspense fallback={<Loading />}><PrivacyPolicy /></Suspense></RouteBoundary>} />
              <Route path="/terms" element={<RouteBoundary><Suspense fallback={<Loading />}><TermsOfService /></Suspense></RouteBoundary>} />
              <Route path="/contact" element={<RouteBoundary><Suspense fallback={<Loading />}><Contact /></Suspense></RouteBoundary>} />
              <Route path="/disclaimer" element={<RouteBoundary><Suspense fallback={<Loading />}><Disclaimer /></Suspense></RouteBoundary>} />
              <Route path="/adsense-test" element={<RouteBoundary><Suspense fallback={<Loading />}><AdsenseTest /></Suspense></RouteBoundary>} />

              {/* Public deep-link redirectors for shared URLs */}
              <Route path="/p/:userId" element={<RouteBoundary><ProfileDeepLink /></RouteBoundary>} />
              <Route path="/r/:sessionId" element={<RouteBoundary><ReportDeepLink /></RouteBoundary>} />
              <Route path="/join/:code" element={<RouteBoundary><MultiplayerJoinDeepLink /></RouteBoundary>} />
              <Route path="/i/:ref" element={<RouteBoundary><InviteDeepLink /></RouteBoundary>} />

              <Route path="/auth" element={<RouteBoundary title="Sign in unavailable"><AuthGuard /></RouteBoundary>} />
              <Route path="/auth/reset-password" element={<RouteBoundary><Suspense fallback={<Loading />}><ResetPassword /></Suspense></RouteBoundary>} />

              {/* Protected app routes under /home */}
              <Route path="/home" element={<RouteBoundary title="App failed to load"><ProtectedRoute><Suspense fallback={<Loading />}><AppLayout /></Suspense></ProtectedRoute></RouteBoundary>}>
                <Route index element={<RouteBoundary><Suspense fallback={<HomeSkeleton />}><PageTransition><Home /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="dashboard" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><PageTransition><Dashboard /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="practice" element={<RouteBoundary><Suspense fallback={<PracticeSkeleton />}><PageTransition><Practice /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="practice/setup" element={<RouteBoundary><Suspense fallback={<SessionSkeleton />}><PageTransition><PracticeSetup /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="session/:sessionId" element={<RouteBoundary title="Session Error"><Suspense fallback={<SessionSkeleton />}><PageTransition><Session /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="session/:sessionId/report" element={<RouteBoundary title="Report Error"><Suspense fallback={<DashboardSkeleton />}><PageTransition><SessionReportPage /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="multiplayer" element={<RouteBoundary><Suspense fallback={<PageSkeleton />}><PageTransition><Multiplayer /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="multiplayer/topic" element={<RouteBoundary><Suspense fallback={<PageSkeleton />}><PageTransition><MultiplayerTopic /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="multiplayer/setup" element={<RouteBoundary><Suspense fallback={<SessionSkeleton />}><PageTransition><MultiplayerSetup /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="drills" element={<RouteBoundary title="Drills Error"><Suspense fallback={<DrillsSkeleton />}><PageTransition><SkillDrills /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="profile" element={<RouteBoundary><Suspense fallback={<ProfileSkeleton />}><PageTransition><Profile /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="settings" element={<RouteBoundary><Suspense fallback={<SettingsSkeleton />}><PageTransition><Settings /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="instructor" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><PageTransition><InstructorDashboard /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="admin" element={<AdminGuard><Suspense fallback={<DashboardSkeleton />}><AdminShell /></Suspense></AdminGuard>}>
                  <Route index element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><Admin /></Suspense></RouteBoundary>} />
                  <Route path="analytics" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminAnalytics /></Suspense></RouteBoundary>} />
                  <Route path="articles" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminArticles /></Suspense></RouteBoundary>} />
                  <Route path="articles/new" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminArticleEdit /></Suspense></RouteBoundary>} />
                  <Route path="articles/:id/edit" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminArticleEdit /></Suspense></RouteBoundary>} />
                  <Route path="ads" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminAds /></Suspense></RouteBoundary>} />
                  <Route path="ads/new" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminAdEdit /></Suspense></RouteBoundary>} />
                  <Route path="ads/:id/edit" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminAdEdit /></Suspense></RouteBoundary>} />
                  <Route path="users" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminUsers /></Suspense></RouteBoundary>} />
                  <Route path="sessions" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminSessions /></Suspense></RouteBoundary>} />
                  <Route path="sessions/:id" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminSessionDetail /></Suspense></RouteBoundary>} />
                  <Route path="categories" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminCategories /></Suspense></RouteBoundary>} />
                  <Route path="tags" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminTags /></Suspense></RouteBoundary>} />
                  <Route path="campaigns" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminCampaigns /></Suspense></RouteBoundary>} />
                  <Route path="comments" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminComments /></Suspense></RouteBoundary>} />
                  <Route path="newsletter" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminNewsletter /></Suspense></RouteBoundary>} />
                  <Route path="feedback" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminFeedback /></Suspense></RouteBoundary>} />
                  <Route path="reports" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminReports /></Suspense></RouteBoundary>} />
                  <Route path="reports/digest" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminReportsDigest /></Suspense></RouteBoundary>} />
                  <Route path="revenue" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminRevenue /></Suspense></RouteBoundary>} />
                  <Route path="intelligence" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminIntelligence /></Suspense></RouteBoundary>} />
                  <Route path="settings" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminSettingsPage /></Suspense></RouteBoundary>} />
                  <Route path="audit" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminAudit /></Suspense></RouteBoundary>} />
                  <Route path="incidents" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminIncidents /></Suspense></RouteBoundary>} />
                  <Route path="edge-errors" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminEdgeErrors /></Suspense></RouteBoundary>} />
                  <Route path="auth-errors" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminAuthErrors /></Suspense></RouteBoundary>} />
                  <Route path="performance" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminPerformance /></Suspense></RouteBoundary>} />
                  <Route path="shares" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminShareAnalytics /></Suspense></RouteBoundary>} />
                  <Route path="shares/:target" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><AdminShareDrilldown /></Suspense></RouteBoundary>} />
                </Route>
                <Route path="governance" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><PageTransition><Governance /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="feedback" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><PageTransition><FeedbackHistory /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="feedback/new" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><PageTransition><FeedbackFormPage /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="health" element={<RouteBoundary><Suspense fallback={<Loading />}><PageTransition><Health /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="intelligence" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><PageTransition><Intelligence /></PageTransition></Suspense></RouteBoundary>} />
                <Route path="adrs" element={<RouteBoundary><Suspense fallback={<DashboardSkeleton />}><PageTransition><ADRs /></PageTransition></Suspense></RouteBoundary>} />
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
