import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <SEOHead title="Page Not Found" noindex path={location.pathname} />
      <MessageSquare className="w-16 h-16 mb-6 text-muted-foreground" aria-hidden="true" />
      <h1 className="mb-4 text-display font-bold">404</h1>
      <p className="mb-6 text-h2 text-muted-foreground text-center">This page doesn't exist</p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Button asChild size="lg" className="border-4 border-border">
          <Link to="/">Go Home</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="border-4 border-border">
          <Link to="/gd-topics-for-placements">Browse GD Topics</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
