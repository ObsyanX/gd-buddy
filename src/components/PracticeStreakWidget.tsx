import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Target, Calendar, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  daily_goal_minutes: number;
  today_minutes: number;
  total_practice_days: number;
}

const PracticeStreakWidget = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    if (user) loadStreak();
  }, [user]);

  const loadStreak = async () => {
    const { data } = await supabase
      .from('practice_streaks')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (data) {
      setStreak(data as StreakData);
    } else {
      // Create default streak record
      const defaultStreak: StreakData = {
        current_streak: 0,
        longest_streak: 0,
        last_practice_date: null,
        daily_goal_minutes: 15,
        today_minutes: 0,
        total_practice_days: 0,
      };
      await supabase.from('practice_streaks').insert({
        user_id: user!.id,
        ...defaultStreak,
      });
      setStreak(defaultStreak);
    }
  };

  if (!streak) return null;

  const goalProgress = Math.min((streak.today_minutes / streak.daily_goal_minutes) * 100, 100);
  const goalMet = streak.today_minutes >= streak.daily_goal_minutes;

  return (
    <Card className="p-6 border-4 border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">PRACTICE STREAK</h3>
        <Flame className={`w-6 h-6 ${streak.current_streak > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Flame className="w-4 h-4" />
            <span className="text-xs font-bold">CURRENT</span>
          </div>
          <p className="text-3xl font-bold">{streak.current_streak}</p>
          <p className="text-[10px] text-muted-foreground font-mono">days</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-bold">BEST</span>
          </div>
          <p className="text-3xl font-bold">{streak.longest_streak}</p>
          <p className="text-[10px] text-muted-foreground font-mono">days</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground">DAILY GOAL</span>
          </div>
          {goalMet && (
            <Badge variant="secondary" className="text-[10px]">✓ Complete</Badge>
          )}
        </div>
        <Progress value={goalProgress} className="h-3" />
        <p className="text-[10px] text-muted-foreground font-mono text-right">
          {streak.today_minutes} / {streak.daily_goal_minutes} min
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground pt-1 border-t border-border">
        <Calendar className="w-3.5 h-3.5" />
        <span className="text-[10px] font-mono">
          {streak.total_practice_days} total practice days
        </span>
      </div>
    </Card>
  );
};

export default PracticeStreakWidget;
