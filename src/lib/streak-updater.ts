import { supabase } from "@/integrations/supabase/client";

/**
 * Update practice streak after completing a session or drill.
 * Handles streak increment, daily goal tracking, and longest streak.
 */
export async function updatePracticeStreak(
  userId: string,
  minutesSpent: number
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get or create streak record
    const { data: existing, error: fetchError } = await supabase
      .from('practice_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Streak] Error fetching streak:', fetchError);
      return;
    }

    if (!existing) {
      // Create new streak record
      await supabase.from('practice_streaks').insert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_practice_date: today,
        today_minutes: minutesSpent,
        total_practice_days: 1,
      });
      console.log('[Streak] Created new streak record');
      return;
    }

    const lastDate = existing.last_practice_date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = existing.current_streak;
    let newTotalDays = existing.total_practice_days;
    let newTodayMinutes = existing.today_minutes;

    if (lastDate === today) {
      // Same day — just add minutes
      newTodayMinutes += minutesSpent;
    } else if (lastDate === yesterdayStr) {
      // Consecutive day — increment streak
      newStreak += 1;
      newTotalDays += 1;
      newTodayMinutes = minutesSpent;
    } else {
      // Streak broken — reset to 1
      newStreak = 1;
      newTotalDays += 1;
      newTodayMinutes = minutesSpent;
    }

    const newLongest = Math.max(existing.longest_streak, newStreak);

    await supabase
      .from('practice_streaks')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_practice_date: today,
        today_minutes: newTodayMinutes,
        total_practice_days: newTotalDays,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    console.log(`[Streak] Updated: streak=${newStreak}, today=${newTodayMinutes}min`);
  } catch (err) {
    console.error('[Streak] Error updating streak:', err);
  }
}
