import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetComplete, setIsResetComplete] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Handle the password recovery flow
    // Supabase sends the user to this page with tokens in the URL hash
    // The auth state listener will pick up the session automatically
    
    const checkSession = async () => {
      setIsCheckingSession(true);
      
      // Check URL hash for recovery tokens
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");
      
      console.log("Reset password page loaded", { hasAccessToken: !!accessToken, type });
      
      // If we have tokens in the URL, set the session manually
      if (accessToken && type === "recovery") {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });
          
          if (error) {
            console.error("Error setting session:", error);
            toast({
              title: "Invalid or expired link",
              description: "This password reset link is invalid or has expired. Please request a new one.",
              variant: "destructive",
            });
            setTimeout(() => navigate("/auth"), 3000);
            setIsCheckingSession(false);
            return;
          }
          
          if (data.session) {
            console.log("Session set successfully for password reset");
            setIsValidSession(true);
            // Clear the hash from URL for security
            window.history.replaceState(null, "", window.location.pathname);
          }
        } catch (error) {
          console.error("Error processing recovery tokens:", error);
          toast({
            title: "Error",
            description: "Failed to process the reset link. Please try again.",
            variant: "destructive",
          });
          setTimeout(() => navigate("/auth"), 3000);
        }
      } else if (user) {
        // User is already logged in (maybe came back to this page)
        setIsValidSession(true);
      } else {
        // No valid tokens and no user session
        toast({
          title: "Invalid link",
          description: "This password reset link is invalid or has expired. Please request a new one.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/auth"), 3000);
      }
      
      setIsCheckingSession(false);
    };
    
    // Small delay to allow auth state to settle
    const timer = setTimeout(checkSession, 500);
    return () => clearTimeout(timer);
  }, [navigate, toast, user]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    try {
      passwordSchema.parse(newPassword);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to reset password",
          variant: "destructive",
        });
      } else {
        setIsResetComplete(true);
        toast({
          title: "Password reset successful!",
          description: "You can now log in with your new password.",
        });
        // Sign out to force re-login with new password
        await supabase.auth.signOut();
        setTimeout(() => navigate("/auth"), 2000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b-4 border-border p-6">
          <div className="container mx-auto flex items-center gap-4">
            <MessageSquare className="w-10 h-10" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">GD CONDUCTOR</h1>
              <p className="text-sm font-mono text-muted-foreground">RESET PASSWORD</p>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto py-12 px-6 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground font-mono">Verifying reset link...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b-4 border-border p-6">
        <div className="container mx-auto flex items-center gap-4">
          <MessageSquare className="w-10 h-10" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight">GD CONDUCTOR</h1>
            <p className="text-sm font-mono text-muted-foreground">RESET PASSWORD</p>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-12 px-6 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 border-4 border-border">
          {isResetComplete ? (
            <div className="space-y-6 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-600" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">PASSWORD RESET COMPLETE</h2>
                <p className="text-sm text-muted-foreground">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full border-4 border-border shadow-md"
              >
                GO TO LOGIN
              </Button>
            </div>
          ) : isValidSession ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">SET NEW PASSWORD</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">NEW PASSWORD</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-2"
                    required
                  />
                  <p className="text-xs text-muted-foreground font-mono">
                    Minimum 6 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">CONFIRM PASSWORD</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-2"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full border-4 border-border shadow-md"
                  disabled={isLoading || !newPassword || !confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      RESETTING PASSWORD...
                    </>
                  ) : (
                    "RESET PASSWORD"
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">INVALID LINK</h2>
                <p className="text-sm text-muted-foreground">
                  This password reset link is invalid or has expired. Redirecting to login...
                </p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          )}
        </Card>
      </main>

      <footer className="border-t-4 border-border p-6 text-center text-sm text-muted-foreground font-mono">
        <p>SECURE AUTHENTICATION • GD CONDUCTOR</p>
      </footer>
    </div>
  );
};

export default ResetPassword;
