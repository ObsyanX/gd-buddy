import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MessageSquare, Users, BarChart3, Sparkles, LogOut, LayoutDashboard, Dumbbell, User, Settings as SettingsIcon, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import SEOFooter from "@/components/SEOFooter";

const Home = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleNavigation = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const navItems = [
    { label: "DASHBOARD", icon: LayoutDashboard, path: "/dashboard" },
    { label: "PRACTICE", icon: MessageSquare, path: "/practice" },
    { label: "DRILLS", icon: Dumbbell, path: "/drills" },
    { label: "MULTIPLAYER", icon: Users, path: "/multiplayer" },
    { label: "PROFILE", icon: User, path: "/profile" },
    { label: "SETTINGS", icon: SettingsIcon, path: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Home"
        description="Master group discussions with AI participants. Practice with realistic personas, get real-time feedback, and ace your placement interviews with GD Buddy."
        path="/"
      />

      <header className="border-b-4 border-border p-4 md:p-6" role="banner">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-4" aria-label="GD Buddy Home">
            <MessageSquare className="w-8 h-8 md:w-10 md:h-10" aria-hidden="true" />
            <div>
              <span className="text-2xl md:text-4xl font-bold tracking-tight">GD BUDDY</span>
              <p className="text-xs md:text-sm font-mono text-muted-foreground hidden sm:block">AI-POWERED GROUP DISCUSSION PRACTICE</p>
            </div>
          </Link>

          <nav className="hidden lg:flex gap-2" aria-label="Main navigation">
            {navItems.slice(0, 4).map((item) => (
              <Button key={item.path} variant="outline" onClick={() => navigate(item.path)} className="border-2" aria-label={`Go to ${item.label}`}>
                <item.icon className="w-4 h-4 mr-2" aria-hidden="true" />
                {item.label}
              </Button>
            ))}
            <Button variant="outline" onClick={handleSignOut} className="border-2" aria-label="Sign out">
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              SIGN OUT
            </Button>
          </nav>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="outline" size="icon" className="border-2" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-l-4 border-border">
              <nav className="flex flex-col gap-3 mt-8" aria-label="Mobile navigation">
                {navItems.map((item) => (
                  <Button key={item.path} variant="outline" onClick={() => handleNavigation(item.path)} className="border-2 justify-start w-full">
                    <item.icon className="w-4 h-4 mr-2" aria-hidden="true" />
                    {item.label}
                  </Button>
                ))}
                <Button variant="outline" onClick={() => { setMobileMenuOpen(false); handleSignOut(); }} className="border-2 justify-start w-full">
                  <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                  SIGN OUT
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-12 px-6" role="main">
        <div className="max-w-4xl mx-auto space-y-12">
          <section className="text-center space-y-4">
            <h1 className="text-display font-bold">AI Group Discussion Practice Platform</h1>
            <p className="text-h2 text-muted-foreground max-w-2xl mx-auto">
              Practice with AI participants. Get real-time feedback. Ace your placement interviews.
            </p>
          </section>

          <section aria-label="Key features">
            <h2 className="sr-only">Features</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
                <Users className="w-12 h-12" aria-hidden="true" />
                <h3 className="text-xl font-bold">MULTI-PERSONA AI</h3>
                <p className="text-muted-foreground">Discuss with 2-6 AI participants, each with unique personalities and speaking styles</p>
              </Card>
              <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
                <Sparkles className="w-12 h-12" aria-hidden="true" />
                <h3 className="text-xl font-bold">LIVE FEEDBACK</h3>
                <p className="text-muted-foreground">Real-time invigilator coaching on fluency, fillers, pace, and structure</p>
              </Card>
              <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
                <BarChart3 className="w-12 h-12" aria-hidden="true" />
                <h3 className="text-xl font-bold">DETAILED ANALYSIS</h3>
                <p className="text-muted-foreground">Post-session reports with scores, STAR analysis, and improvement drills</p>
              </Card>
            </div>
          </section>

          <section className="flex justify-center gap-4 flex-wrap" aria-label="Get started">
            <Button size="lg" className="text-xl px-12 py-8 border-4 border-border shadow-md hover:shadow-lg" onClick={() => navigate('/practice')} aria-label="Start a solo practice session">
              START SOLO SESSION
            </Button>
            <Button size="lg" variant="outline" className="text-xl px-12 py-8 border-4 border-border shadow-md hover:shadow-lg" onClick={() => navigate('/multiplayer')} aria-label="Start a multiplayer session">
              <Users className="w-6 h-6 mr-2" aria-hidden="true" />
              MULTIPLAYER MODE
            </Button>
          </section>

          <section className="border-4 border-border p-8 space-y-4" aria-label="How it works">
            <h2 className="text-2xl font-bold">HOW IT WORKS</h2>
            <ol className="space-y-3 text-muted-foreground font-mono">
              <li className="flex gap-3"><span className="font-bold">01.</span><span>CHOOSE A TOPIC or let AI generate one for you</span></li>
              <li className="flex gap-3"><span className="font-bold">02.</span><span>SELECT AI PARTICIPANTS with different personas and styles</span></li>
              <li className="flex gap-3"><span className="font-bold">03.</span><span>ENGAGE IN DISCUSSION with realistic turn-taking and interruptions</span></li>
              <li className="flex gap-3"><span className="font-bold">04.</span><span>RECEIVE FEEDBACK on your performance with actionable insights</span></li>
            </ol>
          </section>

          <section aria-label="Resources">
            <h2 className="text-2xl font-bold mb-4">RESOURCES FOR PLACEMENTS</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link to="/gd-topics-for-placements" className="block">
                <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                  <h3 className="font-bold mb-1">📋 GD Topics for Placements 2025</h3>
                  <p className="text-sm text-muted-foreground">50+ curated topics across categories</p>
                </Card>
              </Link>
              <Link to="/how-to-crack-group-discussion" className="block">
                <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                  <h3 className="font-bold mb-1">🎯 How to Crack Group Discussion</h3>
                  <p className="text-sm text-muted-foreground">Proven tips and strategies</p>
                </Card>
              </Link>
              <Link to="/common-gd-mistakes" className="block">
                <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                  <h3 className="font-bold mb-1">⚠️ Common GD Mistakes</h3>
                  <p className="text-sm text-muted-foreground">10 mistakes that cost placements</p>
                </Card>
              </Link>
              <Link to="/communication-skills-for-gd" className="block">
                <Card className="p-5 border-2 border-border hover:shadow-md transition-shadow h-full">
                  <h3 className="font-bold mb-1">🗣️ Communication Skills for GD</h3>
                  <p className="text-sm text-muted-foreground">Verbal and non-verbal mastery</p>
                </Card>
              </Link>
            </div>
          </section>

          <Card className="p-6 border-4 border-primary/50 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6" aria-hidden="true" />
              <h2 className="text-xl font-bold">MULTIPLAYER MODE</h2>
            </div>
            <p className="text-muted-foreground">
              Practice with friends in real-time! Create a room, share the code, and discuss together with AI participants.
            </p>
          </Card>
        </div>
      </main>

      <SEOFooter />
    </div>
  );
};

export default Home;
