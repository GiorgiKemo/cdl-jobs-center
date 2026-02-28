import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DriverFeedback = "helpful" | "not_relevant" | "hide";

const isValidFeedback = (value: unknown): value is DriverFeedback =>
  value === "helpful" || value === "not_relevant" || value === "hide";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile || profile.role !== "driver") {
      return new Response(JSON.stringify({ error: "Driver access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId, feedback } = await req.json();
    if (!jobId || typeof jobId !== "string") {
      return new Response(JSON.stringify({ error: "jobId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidFeedback(feedback)) {
      return new Response(
        JSON.stringify({ error: "feedback must be helpful, not_relevant, or hide" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, status")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      return new Response(JSON.stringify({ error: jobError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!job || job.status !== "Active") {
      return new Response(JSON.stringify({ error: "Job not found or not active" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: feedbackError } = await supabase
      .from("driver_match_feedback")
      .upsert(
        {
          driver_id: user.id,
          job_id: jobId,
          feedback,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "driver_id,job_id" },
      );

    if (feedbackError) {
      return new Response(JSON.stringify({ error: feedbackError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Best-effort queue nudge for faster visibility (trigger handles most cases).
    const { data: pendingRow } = await supabase
      .from("matching_recompute_queue")
      .select("id")
      .eq("entity_type", "driver_profile")
      .eq("entity_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (!pendingRow) {
      await supabase.from("matching_recompute_queue").insert({
        entity_type: "driver_profile",
        entity_id: user.id,
        reason: "feedback_updated",
        status: "pending",
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
