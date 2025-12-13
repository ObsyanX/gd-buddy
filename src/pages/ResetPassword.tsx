import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetComplete, setIsResetComplete] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      toast({
        title: "Invalid link",
        description: "This password reset link is invalid or has expired.",
        variant: "destructive",
      });
      setTimeout(() => navigate("/auth"), 3000);
    }
  }, [navigate, toast]);

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
          ) : (
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
