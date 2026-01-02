import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MessageSquare, Users, BarChart3, Sparkles, LogOut, LayoutDashboard, Dumbbell, User, Settings as SettingsIcon, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
      <header className="border-b-4 border-border p-4 md:p-6">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-4">
            <MessageSquare className="w-8 h-8 md:w-10 md:h-10" />
            <div>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight">GD CONDUCTOR</h1>
              <p className="text-xs md:text-sm font-mono text-muted-foreground hidden sm:block">AI-POWERED GROUP DISCUSSION PRACTICE</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex gap-2">
            {navItems.slice(0, 4).map((item) => (
              <Button 
                key={item.path}
                variant="outline" 
                onClick={() => navigate(item.path)}
                className="border-2"
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            ))}
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="border-2"
            >
              <LogOut className="w-4 h-4 mr-2" />
              SIGN OUT
            </Button>
          </div>

          {/* Mobile Hamburger Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="outline" size="icon" className="border-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-l-4 border-border">
              <div className="flex flex-col gap-3 mt-8">
                {navItems.map((item) => (
                  <Button 
                    key={item.path}
                    variant="outline" 
                    onClick={() => handleNavigation(item.path)}
                    className="border-2 justify-start w-full"
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="border-2 justify-start w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  SIGN OUT
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-12 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-bold">MASTER GROUP DISCUSSIONS</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Practice with AI participants. Get real-time feedback. Ace your interviews.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
              <Users className="w-12 h-12" />
              <h3 className="text-xl font-bold">MULTI-PERSONA AI</h3>
              <p className="text-muted-foreground">
                Discuss with 2-6 AI participants, each with unique personalities and speaking styles
              </p>
            </Card>

            <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
              <Sparkles className="w-12 h-12" />
              <h3 className="text-xl font-bold">LIVE FEEDBACK</h3>
              <p className="text-muted-foreground">
                Real-time invigilator coaching on fluency, fillers, pace, and structure
              </p>
            </Card>

            <Card className="p-6 border-4 border-border space-y-3 hover:shadow-md transition-shadow">
              <BarChart3 className="w-12 h-12" />
              <h3 className="text-xl font-bold">DETAILED ANALYSIS</h3>
              <p className="text-muted-foreground">
                Post-session reports with scores, STAR analysis, and improvement drills
              </p>
            </Card>
          </div>

          <div className="flex justify-center gap-4 flex-wrap">
            <Button 
              size="lg" 
              className="text-xl px-12 py-8 border-4 border-border shadow-md hover:shadow-lg"
              onClick={() => navigate('/practice')}
            >
              START SOLO SESSION
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-xl px-12 py-8 border-4 border-border shadow-md hover:shadow-lg"
              onClick={() => navigate('/multiplayer')}
            >
              <Users className="w-6 h-6 mr-2" />
              MULTIPLAYER MODE
            </Button>
          </div>

          <div className="border-4 border-border p-8 space-y-4">
            <h3 className="text-2xl font-bold">HOW IT WORKS</h3>
            <ol className="space-y-3 text-muted-foreground font-mono">
              <li className="flex gap-3">
                <span className="font-bold">01.</span>
                <span>CHOOSE A TOPIC or let AI generate one for you</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">02.</span>
                <span>SELECT AI PARTICIPANTS with different personas and styles</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">03.</span>
                <span>ENGAGE IN DISCUSSION with realistic turn-taking and interruptions</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">04.</span>
                <span>RECEIVE FEEDBACK on your performance with actionable insights</span>
              </li>
            </ol>
          </div>

          <Card className="p-6 border-4 border-primary/50 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              <h3 className="text-xl font-bold">NEW: MULTIPLAYER MODE</h3>
            </div>
            <p className="text-muted-foreground">
              Practice with friends in real-time! Create a room, share the code, and discuss together with AI participants. 
              Perfect for group interview preparation or collaborative practice sessions.
            </p>
          </Card>
        </div>
      </main>

      <footer className="border-t-4 border-border p-6 text-center text-sm text-muted-foreground font-mono">
        <p>POWERED BY LOVABLE AI • BRUTALIST DESIGN BY GD CONDUCTOR</p>
      </footer>
    </div>
  );
};

export default Home;
