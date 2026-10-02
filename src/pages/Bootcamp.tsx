import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Compass, CheckCircle2, Lock, Play, Award, Sparkles,
  Target, Clock, ShieldCheck, ChevronRight, BookOpen, Flame
} from "lucide-react";
import { BOOTCAMP_DAYS, BOOTCAMP_PHASES, BootcampDay } from "@/data/bootcamp-curriculum";

const STORAGE_KEY = "gd_bootcamp_progress_v1";

interface BootcampProgress {
  completedDays: number[];
  currentDay: number;
  lastCompletedAt?: string;
  streak: number;
}

const Bootcamp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [progress, setProgress] = useState<BootcampProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { completedDays: [], currentDay: 1, streak: 0 };
  });

  const [selectedDay, setSelectedDay] = useState<BootcampDay>(() => {
    const cur = BOOTCAMP_DAYS.find(d => d.day === (progress.currentDay || 1));
    return cur || BOOTCAMP_DAYS[0];
  });

  const [activePhaseTab, setActivePhaseTab] = useState<string>("1");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const isDayCompleted = (day: number) => progress.completedDays.includes(day);
  const isDayUnlocked = (day: number) => day === 1 || progress.completedDays.includes(day - 1) || progress.completedDays.includes(day);

  const handleStartDay = (dayItem: BootcampDay) => {
    // Save chosen topic and track into localStorage so SessionSetup / Discussion picks it up
    localStorage.setItem("gd-bootcamp-active-day", JSON.stringify(dayItem));
    localStorage.setItem("gd-prefilled-topic", dayItem.suggestedTopic);
    localStorage.setItem("gd-prefilled-track", dayItem.targetTrack);

    toast({
      title: `Starting Day ${dayItem.day}: ${dayItem.title}`,
      description: `Target Track: ${dayItem.targetTrack.toUpperCase()} | Framework: ${dayItem.framework}`
    });

    navigate(`/home/practice/setup?topic=${encodeURIComponent(dayItem.suggestedTopic)}&track=${dayItem.targetTrack}`);
  };

  const handleMarkCompleted = (dayNumber: number) => {
    setProgress(prev => {
      const already = prev.completedDays.includes(dayNumber);
      const newCompleted = already ? prev.completedDays : [...prev.completedDays, dayNumber].sort((a, b) => a - b);
      const nextDay = Math.min(14, Math.max(prev.currentDay, dayNumber + 1));
      return {
        ...prev,
        completedDays: newCompleted,
        currentDay: nextDay,
        lastCompletedAt: new Date().toISOString(),
        streak: prev.streak + (already ? 0 : 1)
      };
    });

    toast({
      title: `Day ${dayNumber} Marked Complete! 🎉`,
      description: "Great consistency! Your placement readiness index has increased."
    });
  };

  const completionPercentage = Math.round((progress.completedDays.length / 14) * 100);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      {/* Header Banner */}
      <div className="border border-border rounded-xl p-6 sm:p-8 bg-card/60 backdrop-blur-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-primary border-primary font-mono text-xs uppercase px-2.5 py-0.5">
                Placement Pedagogy Track
              </Badge>
              <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                <Flame className="w-3.5 h-3.5 fill-amber-500" />
                {progress.streak} Day Streak
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              14-Day Placement GD Bootcamp
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
              A structured daily curriculum built for top Indian engineering colleges & B-Schools.
              Move from opening frameworks to handling aggressive fish-markets and consulting case GDs.
            </p>
          </div>

          {/* Progress Card */}
          <div className="bg-background/80 border border-border rounded-lg p-4 min-w-[240px] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground uppercase font-mono">Curriculum Completion</span>
              <span className="font-bold text-primary">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2.5" />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{progress.completedDays.length} of 14 Days</span>
              <span>{14 - progress.completedDays.length} Left</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Days List vs Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Phases & Days (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Tabs value={activePhaseTab} onValueChange={setActivePhaseTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/60">
              {BOOTCAMP_PHASES.map((p) => (
                <TabsTrigger
                  key={p.id}
                  value={String(p.id)}
                  className="text-xs py-2 px-1 text-center font-medium data-[state=active]:bg-background"
                >
                  Phase {p.id}
                </TabsTrigger>
              ))}
            </TabsList>

            {BOOTCAMP_PHASES.map((phase) => (
              <TabsContent key={phase.id} value={String(phase.id)} className="space-y-4 pt-4">
                <div className="p-4 rounded-lg bg-muted/20 border border-border/60">
                  <h3 className="font-semibold text-sm">{phase.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{phase.description}</p>
                </div>

                <div className="space-y-2.5">
                  {BOOTCAMP_DAYS.filter(d => d.phaseId === phase.id).map((item) => {
                    const completed = isDayCompleted(item.day);
                    const unlocked = isDayUnlocked(item.day);
                    const isSelected = selectedDay.day === item.day;

                    return (
                      <div
                        key={item.day}
                        onClick={() => unlocked && setSelectedDay(item)}
                        className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : unlocked
                            ? "border-border hover:border-primary/50 bg-card/40"
                            : "border-border/40 opacity-60 cursor-not-allowed bg-muted/10"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="flex-shrink-0">
                            {completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : unlocked ? (
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                                isSelected ? "border-primary text-primary" : "border-muted-foreground/60 text-muted-foreground"
                              }`}>
                                {item.day}
                              </div>
                            ) : (
                              <Lock className="w-4 h-4 text-muted-foreground/60" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">Day {item.day}: {item.title}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 uppercase">
                                {item.targetTrack}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.tagline}</p>
                          </div>
                        </div>

                        <ChevronRight className={`w-4 h-4 text-muted-foreground ${isSelected ? "text-primary translate-x-0.5" : ""}`} />
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Right Column: Selected Day Mission Dossier (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="p-6 border border-border bg-card/80 sticky top-20 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="border-primary text-primary font-mono text-xs">
                  MISSION BRIEFING · DAY {selectedDay.day}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  ~{selectedDay.estimatedMinutes} mins
                </span>
              </div>
              <h2 className="text-2xl font-bold leading-tight">{selectedDay.title}</h2>
              <p className="text-xs text-primary/90 font-medium italic">{selectedDay.tagline}</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-muted/40 rounded-md border border-border/60 space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Core Objective</span>
                <p className="text-foreground leading-relaxed">{selectedDay.objective}</p>
              </div>

              <div className="p-3 bg-primary/5 rounded-md border border-primary/20 space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-primary">Framework to Practice</span>
                <p className="font-semibold text-foreground">{selectedDay.framework}</p>
              </div>

              <div className="p-3 bg-muted/40 rounded-md border border-border/60 space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground">Suggested Topic</span>
                <p className="text-foreground font-medium italic">"{selectedDay.suggestedTopic}"</p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-amber-500 bg-amber-500/10 p-2.5 rounded-md border border-amber-500/20">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Passing Benchmark: Score &ge; {selectedDay.minScoreToPass}%</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Button
                size="lg"
                className="w-full font-bold shadow-md gap-2"
                onClick={() => handleStartDay(selectedDay)}
              >
                <Play className="w-4 h-4 fill-current" />
                Launch Day {selectedDay.day} Practice Round
              </Button>

              <Button
                variant={isDayCompleted(selectedDay.day) ? "secondary" : "outline"}
                size="sm"
                className="w-full text-xs"
                onClick={() => handleMarkCompleted(selectedDay.day)}
              >
                {isDayCompleted(selectedDay.day) ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                    Completed (Click to Re-verify)
                  </>
                ) : (
                  "Mark Day Complete Manually"
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Bootcamp;
