import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { MessageSquare, Loader2, AlertCircle, RefreshCw, X } from "lucide-react";
import { z } from "zod";
import { Link } from "react-router-dom";
import SEOFooter from "@/components/SEOFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { mapAuthError, logAuthError, type MappedAuthError } from "@/lib/auth-errors";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

type AuthTab = "login" | "signup" | "reset";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [googleError, setGoogleError] = useState<MappedAuthError | null>(null);
  const [emailError, setEmailError] = useState<MappedAuthError | null>(null);
  const [verifyingSession, setVerifyingSession] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");

  // Forgot password form
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Login failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in."
        });
        navigate("/home");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      z.string().min(2, "Display name must be at least 2 characters").parse(signupDisplayName);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(signupEmail, signupPassword, signupDisplayName);

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Signup failed",
            description: "This email is already registered. Please login instead.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Account created!",
          description: "Check your email to confirm your account. You can now log in."
        });
        setTimeout(() => {
          navigate("/home");
        }, 1000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(resetEmail);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const { error } = await resetPassword(resetEmail);

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to send reset email",
          variant: "destructive"
        });
      } else {
        setResetSent(true);
        toast({
          title: "Reset link sent!",
          description: "Check your email for the password reset link."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
        extraParams: { prompt: "select_account" },
      });

      if (result?.error) {
        const raw = (result.error as any)?.message || String(result.error) || "";
        const msg = raw.toLowerCase();
        let friendly = "Unable to sign in with Google. Please try again.";
        if (msg.includes("popup") && msg.includes("close")) {
          friendly = "Google sign-in was cancelled. Please complete the sign-in in the popup window.";
        } else if (msg.includes("popup") && msg.includes("block")) {
          friendly = "Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.";
        } else if (msg.includes("access_denied") || msg.includes("denied")) {
          friendly = "You denied access. Please approve the Google permissions to continue.";
        } else if (msg.includes("network") || msg.includes("fetch")) {
          friendly = "Network issue while contacting Google. Check your connection and try again.";
        } else if (msg.includes("unsupported provider") || msg.includes("provider is not enabled")) {
          friendly = "Google sign-in isn't enabled yet. Please contact support.";
        } else if (msg.includes("redirect") && msg.includes("uri")) {
          friendly = "This domain isn't authorized for Google sign-in. Please try from the official site.";
        } else if (raw) {
          friendly = raw;
        }
        toast({ title: "Google Sign-in Failed", description: friendly, variant: "destructive" });
        return;
      }

      if (result?.redirected) return;

      // Confirm session before navigating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Sign-in incomplete",
          description: "We couldn't confirm your Google session. Please try again.",
          variant: "destructive"
        });
        return;
      }
      toast({ title: "Welcome!", description: "Signed in with Google." });
      navigate("/home");
    } catch (error: any) {
      const raw = error?.message || "";
      toast({
        title: "Google Sign-in Failed",
        description: raw || "An unexpected error occurred during Google sign-in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <div className="ambient-orb w-[60vw] h-[60vw] -top-[20%] -left-[10%]" style={{ background: "hsl(29 60% 45% / 0.5)" }} />
        <div className="ambient-orb w-[46vw] h-[46vw] bottom-[-20%] -right-[10%]" style={{ background: "hsl(12 55% 40% / 0.4)", animationDelay: "3s" }} />
      </div>

      <header className="relative z-20 py-6 px-4 md:px-6">
        <div className="container mx-auto">
          <Link to="/" className="inline-flex items-center gap-3 group" aria-label="GD Buddy Home">
            <div className="w-10 h-10 rounded-xl bg-gradient-copper flex items-center justify-center shadow-copper group-hover:rotate-6 transition-transform duration-slow ease-editorial">
              <MessageSquare className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <span className="font-display text-2xl tracking-tight">GD Buddy</span>
              <p className="text-micro text-muted-foreground">Authenticate</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 md:py-12 px-4 md:px-6 flex items-center justify-center relative z-10">
        <Card className="w-full max-w-md p-8 glass-strong shadow-premium">
          <div className="mb-6 text-center">
            <h1 className="font-display text-h1">
              Welcome <span className="italic-accent copper-text">back.</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">Rehearse. Refine. Return sharper.</p>
          </div>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 glass-subtle rounded-full p-1">
              <TabsTrigger value="login" className="rounded-full">Login</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">Sign up</TabsTrigger>
              <TabsTrigger value="reset" className="rounded-full">Forgot</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-micro text-muted-foreground">Email</Label>
                  <Input id="login-email" type="email" placeholder="your@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-micro text-muted-foreground">Password</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" variant="premium" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</> : "Sign in"}
                </Button>
              </form>

              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-micro text-muted-foreground">or</span>
              </div>

              <Button type="button" variant="glass" size="lg" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
                {isGoogleLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting…</> :
                <>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                }
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-micro text-muted-foreground">Display name</Label>
                  <Input id="signup-name" type="text" placeholder="Your name" value={signupDisplayName} onChange={(e) => setSignupDisplayName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-micro text-muted-foreground">Email</Label>
                  <Input id="signup-email" type="email" placeholder="your@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-micro text-muted-foreground">Password</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                  <p className="text-micro text-muted-foreground">Minimum 6 characters</p>
                </div>
                <Button type="submit" variant="premium" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create account"}
                </Button>
              </form>

              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-micro text-muted-foreground">or</span>
              </div>

              <Button type="button" variant="glass" size="lg" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
                {isGoogleLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting…</> :
                <>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Sign up with Google
                  </>
                }
              </Button>
            </TabsContent>

            <TabsContent value="reset" className="space-y-4 mt-6">
              {resetSent ?
              <div className="space-y-4 text-center py-6">
                  <p className="font-display text-h2">Check your email</p>
                  <p className="text-sm text-muted-foreground">
                    We've sent a reset link to <strong className="text-foreground">{resetEmail}</strong>.
                  </p>
                  <Button onClick={() => {setResetSent(false);setResetEmail("");}} variant="glass" className="w-full">
                    Send another
                  </Button>
                </div> :
              <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter your email and we'll send a link to reset your password.</p>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-micro text-muted-foreground">Email</Label>
                    <Input id="reset-email" type="email" placeholder="your@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" variant="premium" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : "Send reset link"}
                  </Button>
                </form>
              }
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      <SEOFooter />
    </div>);

};

export default Auth;
