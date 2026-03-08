import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface Experiment {
  id: string;
  name: string;
  variants: string[];
  traffic_percent: number;
  is_active: boolean;
}

interface ExperimentState {
  experiments: Experiment[];
  assignments: Record<string, string>; // experimentName -> variant
  loaded: boolean;
  loadExperiments: (userId: string) => Promise<void>;
  getVariant: (experimentName: string) => string;
}

function hashToVariant(userId: string, experimentName: string, variants: string[]): string {
  // Simple deterministic hash for consistent assignment
  let hash = 0;
  const str = `${userId}-${experimentName}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return variants[Math.abs(hash) % variants.length];
}

export const useExperimentStore = create<ExperimentState>()((set, get) => ({
  experiments: [],
  assignments: {},
  loaded: false,

  loadExperiments: async (userId: string) => {
    if (get().loaded) return;

    try {
      // Fetch active experiments
      const { data: experiments } = await supabase
        .from('experiments')
        .select('*')
        .eq('is_active', true);

      if (!experiments || experiments.length === 0) {
        set({ loaded: true });
        return;
      }

      // Fetch existing assignments
      const { data: existingAssignments } = await supabase
        .from('experiment_assignments')
        .select('*')
        .eq('user_id', userId);

      const assignmentMap: Record<string, string> = {};
      const newAssignments: Array<{ user_id: string; experiment_id: string; variant: string }> = [];

      for (const exp of experiments) {
        const variants = (exp.variants as string[]) || ['control', 'variant'];
        const existing = existingAssignments?.find((a) => a.experiment_id === exp.id);

        if (existing) {
          assignmentMap[exp.name] = existing.variant;
        } else {
          // Check if user should be in this experiment based on traffic_percent
          const hashVal = Math.abs(hashToVariant(userId, exp.name, ['0','1','2','3','4','5','6','7','8','9']).charCodeAt(0)) % 100;
          if (hashVal < exp.traffic_percent) {
            const variant = hashToVariant(userId, exp.name, variants);
            assignmentMap[exp.name] = variant;
            newAssignments.push({ user_id: userId, experiment_id: exp.id, variant });
          }
        }
      }

      // Persist new assignments
      if (newAssignments.length > 0) {
        await supabase.from('experiment_assignments').insert(newAssignments);
      }

      set({
        experiments: experiments.map((e) => ({
          id: e.id,
          name: e.name,
          variants: (e.variants as string[]) || ['control', 'variant'],
          traffic_percent: e.traffic_percent,
          is_active: e.is_active,
        })),
        assignments: assignmentMap,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  getVariant: (experimentName: string) => {
    return get().assignments[experimentName] || 'control';
  },
}));

/**
 * Hook to get the variant for an experiment.
 * Returns 'control' if experiment doesn't exist or user isn't assigned.
 */
export function useExperiment(experimentName: string): string {
  const variant = useExperimentStore((s) => s.assignments[experimentName]);
  return variant || 'control';
}
