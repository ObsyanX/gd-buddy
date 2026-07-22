import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service role for job processing
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action } = await req.json();

    if (action === "process") {
      // Fetch pending jobs (up to 5 at a time)
      const { data: jobs } = await adminClient
        .from("background_jobs")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .lt("attempts", 3)
        .order("scheduled_at", { ascending: true })
        .limit(5);

      if (!jobs || jobs.length === 0) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let processed = 0;

      for (const job of jobs) {
        // Mark as processing
        await adminClient
          .from("background_jobs")
          .update({ status: "processing", started_at: new Date().toISOString(), attempts: job.attempts + 1 })
          .eq("id", job.id);

        try {
          let result: Record<string, unknown> = {};

          switch (job.job_type) {
            case "aggregate_training_data": {
              result = await aggregateTrainingData(adminClient, job.payload);
              break;
            }
            case "generate_report": {
              result = await generateReport(adminClient, job.payload);
              break;
            }
            default:
              result = { error: `Unknown job type: ${job.job_type}` };
          }

          await adminClient
            .from("background_jobs")
            .update({
              status: "completed",
              result,
              completed_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          processed++;
        } catch (err) {
          await adminClient
            .from("background_jobs")
            .update({
              status: job.attempts + 1 >= job.max_attempts ? "failed" : "pending",
              error_message: err.message,
            })
            .eq("id", job.id);
        }
      }

      return new Response(JSON.stringify({ processed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enqueue") {
      const { job_type, payload, scheduled_at } = await req.json().catch(() => ({}));

      // Already parsed above, re-parse body
      const body = { action, ...(await req.json().catch(() => ({}))) };

      return new Response(JSON.stringify({ error: "Use client-side enqueue" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Job handlers

async function aggregateTrainingData(client: any, payload: any) {
  const { session_id } = payload;

  // Get session info
  const { data: session } = await client
    .from("gd_sessions")
    .select("*, gd_participants(*), gd_messages(*), gd_metrics(*)")
    .eq("id", session_id)
    .single();

  if (!session) return { error: "Session not found" };

  const userParticipant = session.gd_participants?.find((p: any) => p.is_user);
  const userMessages = session.gd_messages?.filter(
    (m: any) => m.participant_id === userParticipant?.id
  ) || [];
  const aiMessages = session.gd_messages?.filter(
    (m: any) => m.participant_id !== userParticipant?.id
  ) || [];

  const userWordCount = userMessages.reduce(
    (sum: number, m: any) => sum + (m.text?.split(/\s+/).length || 0), 0
  );
  const aiWordCount = aiMessages.reduce(
    (sum: number, m: any) => sum + (m.text?.split(/\s+/).length || 0), 0
  );

  const metrics = session.gd_metrics?.[0] || session.gd_metrics;
  const startTime = session.start_time ? new Date(session.start_time) : null;
  const endTime = session.end_time ? new Date(session.end_time) : null;
  const durationS = startTime && endTime
    ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
    : null;

  const trainingRow = {
    session_id,
    user_id: session.user_id,
    topic: session.topic,
    user_word_count: userWordCount,
    ai_word_count: aiWordCount,
    session_duration_s: durationS,
    content_score: metrics?.content_score || null,
    fluency_score: metrics?.fluency_score || null,
    structure_score: metrics?.structure_score || null,
    filler_count: metrics?.filler_count || 0,
    key_arguments: [],
    improvement_areas: [],
  };

  await client.from("training_data").upsert(trainingRow, { onConflict: "session_id" });

  return { aggregated: true, session_id };
}

async function generateReport(client: any, payload: any) {
  // Placeholder for async report generation
  const { session_id } = payload;
  // In a full implementation, this would call the AI to generate a detailed report
  // and store it. For now, we just aggregate the data.
  return await aggregateTrainingData(client, payload);
}
