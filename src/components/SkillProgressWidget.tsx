import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, MessageSquare, Ear, Shield, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SkillData {
  skill_name: string;
  current_score: number;
  level: string;
  total_practice_minutes: number;
}

const SKILL_CONFIG: Record<string, { label: string; icon: any; description: string }> = {
  clarity: { label: 'Clarity', icon: Brain, description: 'Speaking clearly and concisely' },
  argument_strength: { label: 'Argument Strength', icon: MessageSquare, description: 'Quality of reasoning' },
  listening: { label: 'Listening', icon: Ear, description: 'Responding to others\' points' },
  rebuttal: { label: 'Rebuttal', icon: Shield, description: 'Counter-argument quality' },
  confidence: { label: 'Confidence', icon: Sparkles, description: 'Presence and delivery' },
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'text-muted-foreground',
  intermediate: 'text-yellow-500',
  advanced: 'text-blue-500',
  expert: 'text-green-500',
};

export function getLevel(score: number): string {
  if (score >= 86) return 'expert';
  if (score >= 66) return 'advanced';
  if (score >= 41) return 'intermediate';
  return 'beginner';
}

export async function updateSkillProgress(
  userId: string,
  skillUpdates: { skill_name: string; score: number; minutes: number }[]
) {
  for (const update of skillUpdates) {
    // Try to get existing record
    const { data: existing } = await supabase
      .from('skill_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_name', update.skill_name)
      .maybeSingle();

    if (existing) {
      // Rolling average: 70% old + 30% new
      const newScore = Math.round(existing.current_score * 0.7 + update.score * 0.3);
      const newLevel = getLevel(newScore);
      await supabase
        .from('skill_progress')
        .update({
          current_score: newScore,
          level: newLevel,
          total_practice_minutes: (existing.total_practice_minutes || 0) + update.minutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      const level = getLevel(update.score);
      await supabase
        .from('skill_progress')
        .insert({
          user_id: userId,
          skill_name: update.skill_name,
          current_score: update.score,
          level,
          total_practice_minutes: update.minutes,
        });
    }
  }
}

export default function SkillProgressWidget() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('skill_progress')
        .select('*')
        .eq('user_id', user.id);
      setSkills((data as SkillData[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return null;
  if (skills.length === 0) {
    return (
      <Card className="p-6 border-4 border-border space-y-3">
        <h3 className="text-xl font-bold">SKILL PROGRESS</h3>
        <p className="text-sm text-muted-foreground font-mono text-center py-4">
          Complete sessions and drills to start tracking your skills!
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-4 border-border space-y-4">
      <h3 className="text-xl font-bold">SKILL PROGRESS</h3>
      <div className="space-y-3">
        {Object.entries(SKILL_CONFIG).map(([key, config]) => {
          const skill = skills.find(s => s.skill_name === key);
          const score = skill?.current_score || 0;
          const level = skill?.level || 'beginner';
          const Icon = config.icon;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-bold">
                  <Icon className="w-4 h-4" />
                  {config.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{Math.round(score)}%</span>
                  <Badge variant="outline" className={`text-[10px] capitalize ${LEVEL_COLORS[level]}`}>
                    {level}
                  </Badge>
                </div>
              </div>
              <Progress value={score} className="h-2" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
