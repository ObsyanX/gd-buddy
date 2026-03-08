import { supabase } from '@/integrations/supabase/client';

export type JobType = 'aggregate_training_data' | 'generate_report';

interface EnqueueOptions {
  jobType: JobType;
  payload: Record<string, unknown>;
  scheduledAt?: Date;
}

/**
 * Enqueue a background job for async processing.
 */
export async function enqueueJob({ jobType, payload, scheduledAt }: EnqueueOptions) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.from('background_jobs').insert({
    job_type: jobType,
    payload: payload as any,
    created_by: user.id,
    scheduled_at: scheduledAt?.toISOString() || new Date().toISOString(),
  }).select('id').single();

  if (error) throw error;
  return data.id;
}

/**
 * Enqueue training data aggregation for a completed session.
 */
export async function enqueueTrainingDataAggregation(sessionId: string) {
  return enqueueJob({
    jobType: 'aggregate_training_data',
    payload: { session_id: sessionId },
  });
}

/**
 * Enqueue async report generation for a session.
 */
export async function enqueueReportGeneration(sessionId: string) {
  return enqueueJob({
    jobType: 'generate_report',
    payload: { session_id: sessionId },
  });
}
