import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import FeedbackForm from "@/components/report/FeedbackForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Standalone GD Buddy feedback form (not tied to a session).
 * Shares the same `user_feedback` storage as the post-session form,
 * so everything submitted here is visible to admins in one place.
 */
export default function FeedbackFormPage() {
  const { user, loading } = useAuth();

  return (
    <div className="container mx-auto max-w-2xl p-4 md:p-8 space-y-6">
      <Helmet>
        <title>Share Feedback | GD Buddy</title>
        <meta name="description" content="Tell us what you think about GD Buddy — ratings, NPS and comments help us improve the product." />
      </Helmet>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Share your feedback</h1>
        <p className="text-sm text-muted-foreground">
          Your ratings and comments go straight to the GD Buddy team. It takes under a minute.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !user ? (
        <div className="rounded-lg border p-6 space-y-3">
          <p className="text-sm">Please sign in so we can link your feedback to your account.</p>
          <Button asChild><Link to="/auth">Sign in to continue</Link></Button>
        </div>
      ) : (
        <FeedbackForm />
      )}

      <p className="text-xs text-muted-foreground">
        Already shared feedback? <Link className="underline" to="/home/feedback">View your submissions</Link>
      </p>
    </div>
  );
}
