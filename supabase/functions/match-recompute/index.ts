/**
 * match-recompute — Queue processor Edge Function.
 * Claims pending items from matching_recompute_queue and computes match scores.
 * Designed to be called every 5 minutes via pg_cron or external scheduler.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeDriverJobRulesScore,
  computeCompanyDriverRulesScore,
  createEmbeddingProvider,
  cosineSimilarity,
  contentHash,
  buildDriverText,
  buildJobText,
  buildLeadText,
  type DriverFeatures,
  type JobFeatures,
  type CandidateFeatures,
  type EmbeddingProvider,
} from "../_shared/scoring/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIMEOUT_MS = 50_000; // stop processing at 50s (function limit ~60s)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth: service-role key via Authorization header
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

    // Claim a batch of pending queue items
    const { data: batch, error: claimErr } = await supabase.rpc(
      "claim_recompute_batch",
      { batch_size: 20 },
    );

    if (claimErr) {
      return new Response(JSON.stringify({ error: claimErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!batch || batch.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "Queue empty" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embeddingProvider = createEmbeddingProvider();
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const item of batch) {
      // Timeout guard
      if (Date.now() - startTime > TIMEOUT_MS) {
        // Release unprocessed items back to pending
        await supabase
          .from("matching_recompute_queue")
          .update({ status: "pending", started_at: null })
          .eq("id", item.id)
          .eq("status", "processing");
        skipped++;
        continue;
      }

      try {
        switch (item.entity_type) {
          case "driver_profile":
            await processDriverProfile(supabase, item.entity_id, embeddingProvider);
            break;
          case "job":
            await processJob(supabase, item.entity_id, item.company_id, embeddingProvider);
            break;
          case "application":
            await processApplication(supabase, item.entity_id, item.company_id, embeddingProvider);
            break;
          case "lead":
            await processLead(supabase, item.entity_id, item.company_id, embeddingProvider);
            break;
        }

        // Mark done
        await supabase
          .from("matching_recompute_queue")
          .update({ status: "done", completed_at: new Date().toISOString() })
          .eq("id", item.id);
        succeeded++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        const newStatus = item.attempts >= item.max_attempts ? "error" : "pending";

        await supabase
          .from("matching_recompute_queue")
          .update({
            status: newStatus,
            last_error: errorMsg,
            // If going back to pending, schedule retry with backoff
            ...(newStatus === "pending"
              ? { scheduled_at: new Date(Date.now() + item.attempts * 60_000).toISOString() }
              : { completed_at: new Date().toISOString() }),
          })
          .eq("id", item.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: batch.length, succeeded, failed, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = ReturnType<typeof createClient>;

async function processDriverProfile(
  supabase: SupabaseClient,
  driverId: string,
  embeddingProvider: EmbeddingProvider | null,
) {
  // Fetch driver profile
  const { data: profile, error: profErr } = await supabase
    .from("driver_profiles")
    .select("*")
    .eq("id", driverId)
    .maybeSingle();
  if (profErr || !profile) return;

  // Fetch most recent application for enrichment
  const { data: latestApp } = await supabase
    .from("applications")
    .select("*")
    .eq("driver_id", driverId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const driverFeatures = extractDriverFeatures(profile, latestApp);

  // Fetch all active jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, company_profiles(logo_url)")
    .eq("status", "Active");
  if (!jobs || jobs.length === 0) return;

  // Get or compute driver embedding
  const driverEmbedding = await getOrComputeEmbedding(
    supabase,
    embeddingProvider,
    "driver",
    driverId,
    driverFeatures.textBlock,
  );

  // Score against each active job
  const upsertRows = [];
  for (const jobRow of jobs) {
    const jobFeatures = extractJobFeatures(jobRow);
    const result = computeDriverJobRulesScore(driverFeatures, jobFeatures);

    // Add semantic score if embeddings available
    if (driverEmbedding) {
      const jobEmbedding = await getOrComputeEmbedding(
        supabase,
        embeddingProvider,
        "job",
        jobRow.id,
        jobFeatures.textBlock,
      );
      if (jobEmbedding) {
        const sim = cosineSimilarity(driverEmbedding, jobEmbedding);
        result.semanticScore = Math.round(Math.max(0, sim) * 10);
        result.overallScore = result.rulesScore + result.semanticScore;
      }
    }

    upsertRows.push({
      driver_id: driverId,
      job_id: jobRow.id,
      overall_score: Math.min(result.overallScore, 100),
      rules_score: result.rulesScore,
      semantic_score: result.semanticScore,
      score_breakdown: result.scoreBreakdown,
      top_reasons: result.topReasons,
      cautions: result.cautions,
      degraded_mode: result.degradedMode,
      provider: embeddingProvider?.providerName ?? null,
      model: embeddingProvider?.modelName ?? null,
      computed_at: new Date().toISOString(),
      version: 1,
    });
  }

  if (upsertRows.length > 0) {
    await supabase
      .from("driver_job_match_scores")
      .upsert(upsertRows, { onConflict: "driver_id,job_id" });
  }
}

async function processJob(
  supabase: SupabaseClient,
  jobId: string,
  companyId: string | null,
  embeddingProvider: EmbeddingProvider | null,
) {
  // Fetch job
  const { data: jobRow, error: jobErr } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr || !jobRow) return;

  // Only score active jobs
  if (jobRow.status !== "Active") return;

  const jobFeatures = extractJobFeatures(jobRow);
  const jobEmbedding = await getOrComputeEmbedding(
    supabase,
    embeddingProvider,
    "job",
    jobId,
    jobFeatures.textBlock,
  );

  // Score against all driver profiles
  const { data: drivers } = await supabase
    .from("driver_profiles")
    .select("*");

  if (drivers && drivers.length > 0) {
    const driverRows = [];
    for (const profile of drivers) {
      const { data: latestApp } = await supabase
        .from("applications")
        .select("*")
        .eq("driver_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const driverFeatures = extractDriverFeatures(profile, latestApp);
      const result = computeDriverJobRulesScore(driverFeatures, jobFeatures);

      if (jobEmbedding) {
        const driverEmb = await getOrComputeEmbedding(
          supabase,
          embeddingProvider,
          "driver",
          profile.id,
          driverFeatures.textBlock,
        );
        if (driverEmb) {
          const sim = cosineSimilarity(driverEmb, jobEmbedding);
          result.semanticScore = Math.round(Math.max(0, sim) * 10);
          result.overallScore = result.rulesScore + result.semanticScore;
        }
      }

      driverRows.push({
        driver_id: profile.id,
        job_id: jobId,
        overall_score: Math.min(result.overallScore, 100),
        rules_score: result.rulesScore,
        semantic_score: result.semanticScore,
        score_breakdown: result.scoreBreakdown,
        top_reasons: result.topReasons,
        cautions: result.cautions,
        degraded_mode: result.degradedMode,
        provider: embeddingProvider?.providerName ?? null,
        model: embeddingProvider?.modelName ?? null,
        computed_at: new Date().toISOString(),
        version: 1,
      });
    }

    if (driverRows.length > 0) {
      await supabase
        .from("driver_job_match_scores")
        .upsert(driverRows, { onConflict: "driver_id,job_id" });
    }
  }

  // Also score company's candidates against this job
  if (companyId) {
    await scoreCompanyCandidatesForJob(supabase, companyId, jobId, jobFeatures, jobEmbedding, embeddingProvider);
  }
}

async function processApplication(
  supabase: SupabaseClient,
  applicationId: string,
  companyId: string | null,
  embeddingProvider: EmbeddingProvider | null,
) {
  if (!companyId) return;

  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) return;

  // Fetch company's active jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "Active");
  if (!jobs || jobs.length === 0) return;

  const candidate = extractCandidateFromApplication(app);

  for (const jobRow of jobs) {
    const jobFeatures = extractJobFeatures(jobRow);
    const result = computeCompanyDriverRulesScore(candidate, jobFeatures);

    // Semantic
    if (embeddingProvider) {
      const candEmb = await getOrComputeEmbedding(supabase, embeddingProvider, "application", applicationId, candidate.textBlock);
      const jobEmb = await getOrComputeEmbedding(supabase, embeddingProvider, "job", jobRow.id, jobFeatures.textBlock);
      if (candEmb && jobEmb) {
        const sim = cosineSimilarity(candEmb, jobEmb);
        result.semanticScore = Math.round(Math.max(0, sim) * 10);
        result.overallScore = result.rulesScore + result.semanticScore;
      }
    }

    await supabase.from("company_driver_match_scores").upsert(
      {
        company_id: companyId,
        job_id: jobRow.id,
        candidate_source: "application",
        candidate_id: applicationId,
        candidate_driver_id: app.driver_id ?? null,
        overall_score: Math.min(result.overallScore, 100),
        rules_score: result.rulesScore,
        semantic_score: result.semanticScore,
        score_breakdown: result.scoreBreakdown,
        top_reasons: result.topReasons,
        cautions: result.cautions,
        degraded_mode: result.degradedMode,
        provider: embeddingProvider?.providerName ?? null,
        model: embeddingProvider?.modelName ?? null,
        computed_at: new Date().toISOString(),
        version: 1,
      },
      { onConflict: "company_id,job_id,candidate_source,candidate_id" },
    );
  }
}

async function processLead(
  supabase: SupabaseClient,
  leadId: string,
  companyId: string | null,
  embeddingProvider: EmbeddingProvider | null,
) {
  if (!companyId) return;

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "Active");
  if (!jobs || jobs.length === 0) return;

  const candidate = extractCandidateFromLead(lead);

  for (const jobRow of jobs) {
    const jobFeatures = extractJobFeatures(jobRow);
    const result = computeCompanyDriverRulesScore(candidate, jobFeatures);

    if (embeddingProvider) {
      const candEmb = await getOrComputeEmbedding(supabase, embeddingProvider, "lead", leadId, candidate.textBlock);
      const jobEmb = await getOrComputeEmbedding(supabase, embeddingProvider, "job", jobRow.id, jobFeatures.textBlock);
      if (candEmb && jobEmb) {
        const sim = cosineSimilarity(candEmb, jobEmb);
        result.semanticScore = Math.round(Math.max(0, sim) * 10);
        result.overallScore = result.rulesScore + result.semanticScore;
      }
    }

    await supabase.from("company_driver_match_scores").upsert(
      {
        company_id: companyId,
        job_id: jobRow.id,
        candidate_source: "lead",
        candidate_id: leadId,
        candidate_driver_id: null,
        overall_score: Math.min(result.overallScore, 100),
        rules_score: result.rulesScore,
        semantic_score: result.semanticScore,
        score_breakdown: result.scoreBreakdown,
        top_reasons: result.topReasons,
        cautions: result.cautions,
        degraded_mode: result.degradedMode,
        provider: embeddingProvider?.providerName ?? null,
        model: embeddingProvider?.modelName ?? null,
        computed_at: new Date().toISOString(),
        version: 1,
      },
      { onConflict: "company_id,job_id,candidate_source,candidate_id" },
    );
  }
}

// ── Score company candidates for a specific job ────────────

async function scoreCompanyCandidatesForJob(
  supabase: SupabaseClient,
  companyId: string,
  jobId: string,
  jobFeatures: JobFeatures,
  jobEmbedding: number[] | null,
  embeddingProvider: EmbeddingProvider | null,
) {
  // Applications
  const { data: apps } = await supabase
    .from("applications")
    .select("*")
    .eq("company_id", companyId);

  if (apps) {
    for (const app of apps) {
      const candidate = extractCandidateFromApplication(app);
      const result = computeCompanyDriverRulesScore(candidate, jobFeatures);

      if (jobEmbedding && embeddingProvider) {
        const candEmb = await getOrComputeEmbedding(supabase, embeddingProvider, "application", app.id, candidate.textBlock);
        if (candEmb) {
          const sim = cosineSimilarity(candEmb, jobEmbedding);
          result.semanticScore = Math.round(Math.max(0, sim) * 10);
          result.overallScore = result.rulesScore + result.semanticScore;
        }
      }

      await supabase.from("company_driver_match_scores").upsert(
        {
          company_id: companyId,
          job_id: jobId,
          candidate_source: "application",
          candidate_id: app.id,
          candidate_driver_id: app.driver_id ?? null,
          overall_score: Math.min(result.overallScore, 100),
          rules_score: result.rulesScore,
          semantic_score: result.semanticScore,
          score_breakdown: result.scoreBreakdown,
          top_reasons: result.topReasons,
          cautions: result.cautions,
          degraded_mode: result.degradedMode,
          provider: embeddingProvider?.providerName ?? null,
          model: embeddingProvider?.modelName ?? null,
          computed_at: new Date().toISOString(),
          version: 1,
        },
        { onConflict: "company_id,job_id,candidate_source,candidate_id" },
      );
    }
  }

  // Leads
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("company_id", companyId);

  if (leads) {
    for (const lead of leads) {
      const candidate = extractCandidateFromLead(lead);
      const result = computeCompanyDriverRulesScore(candidate, jobFeatures);

      if (jobEmbedding && embeddingProvider) {
        const candEmb = await getOrComputeEmbedding(supabase, embeddingProvider, "lead", lead.id, candidate.textBlock);
        if (candEmb) {
          const sim = cosineSimilarity(candEmb, jobEmbedding);
          result.semanticScore = Math.round(Math.max(0, sim) * 10);
          result.overallScore = result.rulesScore + result.semanticScore;
        }
      }

      await supabase.from("company_driver_match_scores").upsert(
        {
          company_id: companyId,
          job_id: jobId,
          candidate_source: "lead",
          candidate_id: lead.id,
          candidate_driver_id: null,
          overall_score: Math.min(result.overallScore, 100),
          rules_score: result.rulesScore,
          semantic_score: result.semanticScore,
          score_breakdown: result.scoreBreakdown,
          top_reasons: result.topReasons,
          cautions: result.cautions,
          degraded_mode: result.degradedMode,
          provider: embeddingProvider?.providerName ?? null,
          model: embeddingProvider?.modelName ?? null,
          computed_at: new Date().toISOString(),
          version: 1,
        },
        { onConflict: "company_id,job_id,candidate_source,candidate_id" },
      );
    }
  }
}

// ── Feature extractors ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDriverFeatures(profile: Record<string, any>, application: Record<string, any> | null): DriverFeatures {
  return {
    driverId: profile.id,
    driverType: profile.driver_type ?? application?.driver_type ?? null,
    licenseClass: profile.license_class ?? application?.license_class ?? null,
    yearsExp: profile.years_exp ?? application?.years_exp ?? null,
    licenseState: profile.license_state ?? application?.license_state ?? null,
    zipCode: profile.zip_code ?? application?.zip_code ?? null,
    about: profile.about ?? null,
    soloTeam: application?.solo_team ?? null,
    endorsements: (application?.endorse as Record<string, boolean>) ?? {},
    haulerExperience: (application?.hauler as Record<string, boolean>) ?? {},
    routePrefs: (application?.route as Record<string, boolean>) ?? {},
    textBlock: buildDriverText(profile, application),
  };
}

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
    textBlock: buildJobText(jobRow),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCandidateFromApplication(app: Record<string, any>): CandidateFeatures {
  return {
    candidateId: app.id,
    source: "application",
    candidateDriverId: app.driver_id ?? null,
    name: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim(),
    driverType: app.driver_type ?? null,
    licenseClass: app.license_class ?? null,
    yearsExp: app.years_exp ?? null,
    state: app.license_state ?? null,
    soloTeam: app.solo_team ?? null,
    endorsements: (app.endorse as Record<string, boolean>) ?? {},
    haulerExperience: (app.hauler as Record<string, boolean>) ?? {},
    routePrefs: (app.route as Record<string, boolean>) ?? {},
    createdAt: app.submitted_at ?? app.created_at ?? "",
    textBlock: buildDriverText({
      driver_type: app.driver_type,
      license_class: app.license_class,
      years_exp: app.years_exp,
      license_state: app.license_state,
    }, app),
    missingFields: [],
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
    licenseClass: null, // leads don't have license info
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

// ── Embedding cache ────────────────────────────────────────

async function getOrComputeEmbedding(
  supabase: SupabaseClient,
  provider: EmbeddingProvider | null,
  entityType: string,
  entityId: string,
  text: string,
): Promise<number[] | null> {
  if (!provider || !text.trim()) return null;

  const hash = contentHash(text);

  // Check cache
  const { data: cached } = await supabase
    .from("matching_text_embeddings")
    .select("embedding, content_hash")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (cached && cached.content_hash === hash) {
    return cached.embedding as number[];
  }

  // Compute new embedding
  try {
    const [embedding] = await provider.embed([text]);

    // Cache it
    await supabase.from("matching_text_embeddings").upsert(
      {
        entity_type: entityType,
        entity_id: entityId,
        content_hash: hash,
        embedding,
        dimensions: provider.dimensions,
        provider: provider.providerName,
        model: provider.modelName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id" },
    );

    return embedding;
  } catch {
    // Embedding failed — non-blocking, return null
    return null;
  }
}
