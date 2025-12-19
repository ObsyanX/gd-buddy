import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, LogOut, User, TrendingUp, Target, 
  Clock, Award, Play, ChevronRight, BarChart3 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SessionHistoryComparison from "@/components/SessionHistoryComparison";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [drills, setDrills] = useState<any[]>([]);
  const [stats, setStats] = useState({ avgScore: 0, totalSessions: 0, totalDrills: 0, hoursSpent: 0 });

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      setProfile(profileData);

      // Load recent sessions
      const { data: sessionsData } = await supabase
        .from('gd_sessions')
        .select('*, gd_metrics(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setSessions(sessionsData || []);

      // Load recent drills
      const { data: drillsData } = await supabase
        .from('skill_drills')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setDrills(drillsData || []);

      // Calculate stats
      const totalSessions = sessionsData?.length || 0;
      const totalDrills = drillsData?.length || 0;
      
      const allScores = [
        ...((sessionsData || []).flatMap((s: any) => {
          const metrics = s.gd_metrics?.[0];
          return metrics ? [metrics.fluency_score, metrics.content_score, metrics.structure_score, metrics.voice_score].filter(Boolean) : [];
        })),
        ...((drillsData || []).map((d: any) => d.score).filter(Boolean))
      ];
      
      const avgScore = allScores.length > 0 
        ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) 
        : 0;

      const hoursSpent = Math.round((totalSessions * 15 + totalDrills * 3) / 60 * 10) / 10;

      setStats({ avgScore, totalSessions, totalDrills, hoursSpent });
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b-4 border-border p-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MessageSquare className="w-10 h-10" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight">DASHBOARD</h1>
              <p className="text-sm font-mono text-muted-foreground">
                Welcome back, {profile?.display_name || 'User'}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="border-2"
          >
            <LogOut className="w-4 h-4 mr-2" />
            SIGN OUT
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-6 space-y-8">
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 border-4 border-border space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Award className="w-5 h-5" />
              <span className="text-sm font-bold">AVG SCORE</span>
            </div>
            <p className="text-4xl font-bold">{stats.avgScore}%</p>
            <Progress value={stats.avgScore} className="h-2" />
          </Card>

          <Card className="p-6 border-4 border-border space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-bold">SESSIONS</span>
            </div>
            <p className="text-4xl font-bold">{stats.totalSessions}</p>
            <p className="text-xs text-muted-foreground font-mono">Group Discussions</p>
          </Card>

          <Card className="p-6 border-4 border-border space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-5 h-5" />
              <span className="text-sm font-bold">DRILLS</span>
            </div>
            <p className="text-4xl font-bold">{stats.totalDrills}</p>
            <p className="text-xs text-muted-foreground font-mono">Skill Exercises</p>
          </Card>

          <Card className="p-6 border-4 border-border space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-bold">TIME SPENT</span>
            </div>
            <p className="text-4xl font-bold">{stats.hoursSpent}h</p>
            <p className="text-xs text-muted-foreground font-mono">Practice Time</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 border-4 border-border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate("/")}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">GROUP DISCUSSION</h3>
                <Play className="w-6 h-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                Practice with AI participants in realistic group discussion scenarios
              </p>
              <Button className="w-full border-4 border-border shadow-sm">
                START SESSION
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-4 border-border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate("/drills")}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">SKILL DRILLS</h3>
                <Target className="w-6 h-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                Focused exercises for specific skills like STAR, rebuttals, and timing
              </p>
              <Button className="w-full border-4 border-border shadow-sm">
                PRACTICE DRILLS
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-4 border-border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate("/profile")}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">PROFILE</h3>
                <User className="w-6 h-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                Update your display name, avatar, and track your progress over time
              </p>
              <Button variant="outline" className="w-full border-2">
                VIEW PROFILE
              </Button>
            </div>
          </Card>
        </div>

        {/* Tabbed Content - Recent Activity & History Comparison */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="border-2 mb-6">
            <TabsTrigger value="recent" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Recent Activity
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Performance History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-4 border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">RECENT SESSIONS</h3>
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                </div>
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-mono py-4 text-center">
                    No sessions yet. Start practicing!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session: any) => {
                      const metrics = session.gd_metrics?.[0];
                      const scores = metrics ? [
                        metrics.fluency_score, 
                        metrics.content_score, 
                        metrics.structure_score, 
                        metrics.voice_score
                      ].filter((s): s is number => s !== null && s !== undefined) : [];
                      const avgScore = scores.length > 0 
                        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        : 0;
                      
                      return (
                        <div key={session.id} className="p-4 border-2 border-border hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-sm line-clamp-1">{session.topic}</h4>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">{session.topic_category}</Badge>
                                <Badge variant="outline" className="text-xs">{session.status}</Badge>
                              </div>
                            </div>
                            {avgScore > 0 && (
                              <div className="text-right">
                                <p className="text-2xl font-bold">{avgScore}%</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card className="p-6 border-4 border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">RECENT DRILLS</h3>
                  <Target className="w-5 h-5 text-muted-foreground" />
                </div>
                {drills.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-mono py-4 text-center">
                    No drills completed yet. Try skill drills!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {drills.map((drill: any) => (
                      <div key={drill.id} className="p-4 border-2 border-border hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-sm line-clamp-1">{drill.topic}</h4>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {drill.drill_type.replace('_', ' ')}
                              </Badge>
                              {drill.time_limit_seconds && (
                                <Badge variant="outline" className="text-xs">
                                  {drill.time_limit_seconds}s
                                </Badge>
                              )}
                            </div>
                          </div>
                          {drill.score && (
                            <div className="text-right">
                              <p className="text-2xl font-bold">{drill.score}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <SessionHistoryComparison />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;