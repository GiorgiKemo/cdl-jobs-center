/**
 * refresh-company-matches — On-demand match score computation for a company.
 *
 * Called from the browser when a company opens the AI Matches tab and has
 * no scores yet, or clicks "Refresh Matches". Scores all active leads against
 * the company's jobs (or a synthetic profile job if they have none), then
 * upserts results into company_driver_match_scores.
 *
 * Rules-only scoring (no embeddings) for speed — semantic enrichment
 * happens later via the nightly backfill.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeCompanyDriverRulesScore,
  buildLeadText,
  type JobFeatures,
  type CandidateFeatures,
} from "../_shared/scoring/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CHUNK = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJobFeatures(jobRow: Record<string, any>): JobFeatures {
  return {
    jobId: jobRow.id,
    companyId: jobRow.company_id,
    title: jobRow.title ?? "",
    description: jobRow.description ?? "",
    driverType: jobRow.driver_type ?? null,
    routeType: jobRow.route_type ?? null,
    freightType: jobRow.type ?? null,
    teamDriving: jobRow.team_driving ?? null,
    location: jobRow.location ?? null,
    pay: jobRow.pay ?? null,
    status: jobRow.status ?? "Active",
    textBlock: `${jobRow.title ?? ""} ${jobRow.description ?? ""} ${jobRow.location ?? ""}`.trim(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCandidateFromLead(lead: Record<string, any>): CandidateFeatures {
  const missing: string[] = [];
  if (!lead.years_exp) missing.push("experience");
  if (!lead.state) missing.push("state");
  if (!lead.is_owner_op && lead.is_owner_op !== false) missing.push("driver type");

  return {
    candidateId: lead.id,
    source: "lead",
    candidateDriverId: null,
    name: lead.full_name ?? "",
    driverType: lead.is_owner_op ? "owner-operator" : null,
    licenseClass: null,
    yearsExp: lead.years_exp ?? null,
    state: lead.state ?? null,
    soloTeam: null,
    endorsements: {},
    haulerExperience: {},
    routePrefs: {},
    createdAt: lead.created_at ?? "",
    textBlock: buildLeadText(lead),
    missingFields: missing,
  };
}

async function upsertChunked(
  supabase: ReturnType<typeof createClient>,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("company_driver_match_scores")
      .upsert(chunk, { onConflict });
    if (!error) total += chunk.length;
    else console.error("upsert chunk failed:", error.message);
  }
  return total;
}

async function insertChunked(
  supabase: ReturnType<typeof createClient>,
  rows: Record<string, unknown>[],
): Promise<number> {
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("company_driver_match_scores")
      .insert(chunk);
    if (!error) total += chunk.length;
    else console.error("insert chunk failed:", error.message);
  }
  return total;
}

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth: require company user JWT (or admin)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "company" && profile.role !== "admin")) {
      return new Response(JSON.stringify({ error: "Company access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admins can target a specific company; companies refresh themselves
    const body = await req.json().catch(() => ({}));
    const companyId: string = profile.role === "admin"
      ? (body.company_id ?? user.id)
      : user.id;

    // Fetch all active (non-deleted) leads — shared pool
    const { data: allLeads, error: leadsErr } = await supabase
      .from("leads")
      .select("*")
      .is("deleted_at", null);

    if (leadsErr) {
      console.error("Failed to fetch leads:", leadsErr.message);
      return new Response(JSON.stringify({ error: leadsErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allLeads || allLeads.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, computed: 0, message: "No active leads to match" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch company's active jobs
    const { data: activeJobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "Active");

    const now = new Date().toISOString();
    let totalComputed = 0;

    if (activeJobs && activeJobs.length > 0) {
      // Score all leads against each active job
      for (const jobRow of activeJobs) {
        const jobFeatures = extractJobFeatures(jobRow);
        const leadRows: Record<string, unknown>[] = allLeads.map((lead) => {
          const candidate = extractCandidateFromLead(lead);
          const result = computeCompanyDriverRulesScore(candidate, jobFeatures);
          return {
            company_id: companyId,
            job_id: jobRow.id,
            candidate_source: "lead",
            candidate_id: lead.id,
            candidate_driver_id: null,
            overall_score: Math.min(result.overallScore, 100),
            rules_score: result.rulesScore,
            semantic_score: null,
            score_breakdown: result.scoreBreakdown,
            top_reasons: result.topReasons,
            cautions: result.cautions,
            degraded_mode: result.degradedMode,
            provider: null,
            model: null,
            computed_at: now,
            version: 1,
          };
        });
        totalComputed += await upsertChunked(
          supabase,
          leadRows,
          "company_id,job_id,candidate_source,candidate_id",
        );
      }
    } else {
      // Jobless company — score leads against a synthetic profile job
      const { data: cp } = await supabase
        .from("company_profiles")
        .select("company_name, address, about, company_goal")
        .eq("id", companyId)
        .maybeSingle();

      const companyName = cp?.company_name ?? "Company";
      const profileJob: JobFeatures = {
        jobId: `profile-${companyId}`,
        companyId,
        title: `${companyName} — General Hiring`,
        description: [cp?.about, cp?.company_goal].filter(Boolean).join(" "),
        driverType: null,
        routeType: null,
        freightType: null,
        teamDriving: null,
        location: cp?.address ?? null,
        pay: null,
        status: "Active",
        textBlock: `${companyName} hiring CDL drivers. ${cp?.about ?? ""} ${cp?.company_goal ?? ""}`.trim(),
      };

      const leadRows: Record<string, unknown>[] = allLeads.map((lead) => {
        const candidate = extractCandidateFromLead(lead);
        const result = computeCompanyDriverRulesScore(candidate, profileJob);
        return {
          company_id: companyId,
          job_id: null,
          candidate_source: "lead",
          candidate_id: lead.id,
          candidate_driver_id: null,
          overall_score: Math.min(result.overallScore, 100),
          rules_score: result.rulesScore,
          semantic_score: null,
          score_breakdown: result.scoreBreakdown,
          top_reasons: result.topReasons,
          cautions: result.cautions,
          degraded_mode: result.degradedMode,
          provider: null,
          model: null,
          computed_at: now,
          version: 1,
        };
      });

      // Delete old jobless lead scores first (can't upsert with nullable job_id)
      await supabase
        .from("company_driver_match_scores")
        .delete()
        .eq("company_id", companyId)
        .eq("candidate_source", "lead")
        .is("job_id", null);

      totalComputed += await insertChunked(supabase, leadRows);
    }

    console.log(`refresh-company-matches: companyId=${companyId} computed=${totalComputed}`);

    return new Response(
      JSON.stringify({ ok: true, computed: totalComputed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("refresh-company-matches error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
