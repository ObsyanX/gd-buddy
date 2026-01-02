import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import PracticeSetup from "./pages/PracticeSetup";
import Session from "./pages/Session";
import SessionReportPage from "./pages/SessionReportPage";
import Multiplayer from "./pages/Multiplayer";
import MultiplayerTopic from "./pages/MultiplayerTopic";
import MultiplayerSetup from "./pages/MultiplayerSetup";
import SkillDrills from "./pages/SkillDrills";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="text-xl font-mono">LOADING...</p>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/practice" element={
              <ProtectedRoute>
                <Practice />
              </ProtectedRoute>
            } />
            <Route path="/practice/setup" element={
              <ProtectedRoute>
                <PracticeSetup />
              </ProtectedRoute>
            } />
            <Route path="/session/:sessionId" element={
              <ProtectedRoute>
                <Session />
              </ProtectedRoute>
            } />
            <Route path="/session/:sessionId/report" element={
              <ProtectedRoute>
                <SessionReportPage />
              </ProtectedRoute>
            } />
            <Route path="/multiplayer" element={
              <ProtectedRoute>
                <Multiplayer />
              </ProtectedRoute>
            } />
            <Route path="/multiplayer/topic" element={
              <ProtectedRoute>
                <MultiplayerTopic />
              </ProtectedRoute>
            } />
            <Route path="/multiplayer/setup" element={
              <ProtectedRoute>
                <MultiplayerSetup />
              </ProtectedRoute>
            } />
            <Route path="/drills" element={
              <ProtectedRoute>
                <SkillDrills />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
