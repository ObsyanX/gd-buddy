import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Settings2, Lock } from "lucide-react";
import { BOOTCAMP_DAYS, getBootcampLesson, toPracticeTopic, BootcampTopic } from "@/data/bootcamp-curriculum";
import { useStickyRouteValue } from "@/hooks/useStickyRouteValue";

const STORAGE_KEY = "gd_bootcamp_progress_v1";

const readProgress = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s) as { completedDays: number[]; currentDay: number; streak: number; lastCompletedAt?: string };
  } catch {}
  return { completedDays: [] as number[], currentDay: 1, streak: 0 };
};

const BootcampDayPage = () => {
  const { dayNumber } = useParams();
  const navigate = useNavigate();
  const n = Number(dayNumber);
  // Sticky: while the next lazy route resolves, this page stays mounted for one
  // commit with params already pointing at the NEW url — a naive guard would
  // bounce the user back to /home/bootcamp mid-navigation.
  const day = useStickyRouteValue(BOOTCAMP_DAYS.find((d) => d.day === n));
  const lesson = useStickyRouteValue(getBootcampLesson(n));
  if (!day || !lesson) return <Navigate to="/home/bootcamp" replace />;
  const dayNum = day.day;

  const progress = readProgress();
  const unlocked = n === 1 || progress.completedDays.includes(n - 1) || progress.completedDays.includes(n);
  const completed = progress.completedDays.includes(n);
  const preset = lesson.simulationPreset;

  const launch = (topic: BootcampTopic) => {
    localStorage.setItem("gd-bootcamp-active-day", JSON.stringify(day));
    navigate("/home/practice/setup", { state: { topic: toPracticeTopic(day, topic), bootcampPreset: preset } });
  };

  const markComplete = () => {
    const p = readProgress();
    if (!p.completedDays.includes(n)) {
      p.completedDays = [...p.completedDays, n].sort((a, b) => a - b);
      p.streak = (p.streak || 0) + 1;
    }
    p.currentDay = Math.min(14, Math.max(p.currentDay || 1, n + 1));
    p.lastCompletedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    navigate(n < 14 ? `/home/bootcamp/day/${n + 1}` : "/home/bootcamp");
  };

  if (!unlocked) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Day {n} is locked</h1>
        <p className="text-muted-foreground">Finish Day {n - 1} first to open this lesson.</p>
        <Button className="min-h-11" onClick={() => navigate(`/home/bootcamp/day/${n - 1}`)}>Go to Day {n - 1}</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      <Button variant="ghost" className="min-h-11 gap-2" onClick={() => navigate("/home/bootcamp")}>
        <ArrowLeft className="h-4 w-4" /> All days
      </Button>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary text-primary font-mono">DAY {day.day} · PHASE {day.phaseId}</Badge>
          <Badge variant="secondary" className="uppercase">{day.targetTrack}</Badge>
          {completed && <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{day.title}</h1>
        <p className="text-muted-foreground">{day.objective}</p>
        <p className="text-sm text-primary font-medium">Key rule: {day.keyRule}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Method: {day.framework}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {lesson.frameworkSteps.map((s, i) => (
            <Card key={i} className="p-4 space-y-2">
              <p className="font-semibold">{i + 1}. {s.label}</p>
              <p className="text-sm text-muted-foreground">{s.explanation}</p>
              <p className="text-sm italic border-l-2 border-primary pl-3">"{s.samplePhrase}"</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold">Sample answer</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{lesson.exemplarScript}</p>
        </Card>
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Common mistakes</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {lesson.commonPitfalls.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Pick today's practice topic</h2>
        <div className="grid gap-3">
          {lesson.curatedTopics.map((t, i) => (
            <Card key={i} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="space-y-1">
                <p className="font-medium">{t.title}</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="capitalize">{t.category}</Badge>
                  <Badge variant="outline" className="capitalize">{t.difficulty}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.whyThisTopic}</p>
              </div>
              <Button className="min-h-11 gap-2 shrink-0" onClick={() => launch(t)}>
                <Play className="h-4 w-4" /> Practise this
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <Card className="p-4 space-y-2">
        <h2 className="font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4" /> Practice room settings</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><p className="text-muted-foreground text-xs">AI participants</p><p className="font-medium">{preset.aiParticipants}</p></div>
          <div><p className="text-muted-foreground text-xs">AI style</p><p className="font-medium capitalize">{preset.aiAggressiveness}</p></div>
          <div><p className="text-muted-foreground text-xs">Length</p><p className="font-medium">{preset.durationMinutes} min</p></div>
          <div><p className="text-muted-foreground text-xs">Pass score</p><p className="font-medium">{preset.passScore}%</p></div>
        </div>
        <p className="text-xs text-muted-foreground">Focus: {preset.focusSkills.join(", ")}</p>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Button variant="outline" className="min-h-11" disabled={n === 1} onClick={() => navigate(`/home/bootcamp/day/${n - 1}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Previous day
        </Button>
        <Button variant="secondary" className="min-h-11" onClick={markComplete}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> {completed ? "Completed — next" : "Mark day complete"}
        </Button>
        <Button variant="outline" className="min-h-11" disabled={n === 14 || !(completed || progress.completedDays.includes(n))} onClick={() => navigate(`/home/bootcamp/day/${n + 1}`)}>
          Next day <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default BootcampDayPage;
