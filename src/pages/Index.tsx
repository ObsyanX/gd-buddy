import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, Users, BarChart3, Sparkles } from "lucide-react";
import TopicSelection from "@/components/TopicSelection";
import SessionSetup from "@/components/SessionSetup";
import DiscussionRoom from "@/components/DiscussionRoom";
import SessionReport from "@/components/SessionReport";

type AppState = 'home' | 'topic-selection' | 'setup' | 'discussion' | 'report';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('home');
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleTopicSelected = (topic: any) => {
    setSelectedTopic(topic);
    setAppState('setup');
  };

  const handleSessionCreated = (id: string) => {
    setSessionId(id);
    setAppState('discussion');
  };

  const handleSessionComplete = () => {
    setAppState('report');
  };

  const handleStartNew = () => {
    setAppState('topic-selection');
    setSelectedTopic(null);
    setSessionId(null);
  };

  if (appState === 'topic-selection') {
    return <TopicSelection onTopicSelected={handleTopicSelected} onBack={() => setAppState('home')} />;
  }

  if (appState === 'setup' && selectedTopic) {
    return <SessionSetup topic={selectedTopic} onSessionCreated={handleSessionCreated} onBack={() => setAppState('topic-selection')} />;
  }

  if (appState === 'discussion' && sessionId) {
    return <DiscussionRoom sessionId={sessionId} onComplete={handleSessionComplete} />;
  }

  if (appState === 'report' && sessionId) {
    return <SessionReport sessionId={sessionId} onStartNew={handleStartNew} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b-4 border-border p-6">
        <div className="container mx-auto flex items-center gap-4">
          <MessageSquare className="w-10 h-10" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight">GD CONDUCTOR</h1>
            <p className="text-sm font-mono text-muted-foreground">AI-POWERED GROUP DISCUSSION PRACTICE</p>
          </div>
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

          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="text-xl px-12 py-8 border-4 border-border shadow-md hover:shadow-lg"
              onClick={handleStartNew}
            >
              START PRACTICE SESSION
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
        </div>
      </main>

      <footer className="border-t-4 border-border p-6 text-center text-sm text-muted-foreground font-mono">
        <p>POWERED BY LOVABLE AI • BRUTALIST DESIGN BY GD CONDUCTOR</p>
      </footer>
    </div>
  );
};

export default Index;