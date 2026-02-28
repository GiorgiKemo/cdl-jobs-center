import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────

export interface ScoreBreakdown {
  [component: string]: { score: number; maxScore: number; detail: string };
}

export interface MatchReason {
  text: string;
  positive: boolean;
}

export interface DriverJobMatch {
  jobId: string;
  overallScore: number;
  rulesScore: number;
  semanticScore: number | null;
  topReasons: MatchReason[];
  cautions: MatchReason[];
  scoreBreakdown: ScoreBreakdown;
  degradedMode: boolean;
  computedAt: string;
  // Joined job data
  jobTitle: string;
  jobCompany: string;
  jobLocation: string;
  jobPay: string;
  jobType: string;
  jobRouteType: string;
  jobDriverType: string;
  jobTeamDriving: string;
  jobLogoUrl: string | null;
}

export interface CompanyDriverMatch {
  candidateId: string;
  candidateSource: "application" | "lead";
  candidateDriverId: string | null;
  overallScore: number;
  rulesScore: number;
  semanticScore: number | null;
  topReasons: MatchReason[];
  cautions: MatchReason[];
  scoreBreakdown: ScoreBreakdown;
  degradedMode: boolean;
  computedAt: string;
  // Joined candidate data
  candidateName: string;
  candidatePhone: string | null;
  candidateEmail: string | null;
  candidateState: string | null;
  candidateYearsExp: string | null;
  candidateDriverType: string | null;
  candidateLicenseClass: string | null;
}

export interface RolloutConfig {
  shadowMode: boolean;
  driverUiEnabled: boolean;
  companyUiEnabled: boolean;
  companyBetaIds: string[];
}

// ── Row mappers ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToDriverJobMatch(row: Record<string, any>): DriverJobMatch {
  const job = row.jobs ?? {};
  return {
    jobId: row.job_id,
    overallScore: row.overall_score,
    rulesScore: row.rules_score,
    semanticScore: row.semantic_score ?? null,
    topReasons: (row.top_reasons ?? []) as MatchReason[],
    cautions: (row.cautions ?? []) as MatchReason[],
    scoreBreakdown: (row.score_breakdown ?? {}) as ScoreBreakdown,
    degradedMode: row.degraded_mode ?? false,
    computedAt: row.computed_at,
    jobTitle: job.title ?? "",
    jobCompany: job.company_name ?? "",
    jobLocation: job.location ?? "",
    jobPay: job.pay ?? "",
    jobType: job.type ?? "",
    jobRouteType: job.route_type ?? "",
    jobDriverType: job.driver_type ?? "",
    jobTeamDriving: job.team_driving ?? "",
    jobLogoUrl: job.company_profiles?.logo_url ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCompanyDriverMatch(row: Record<string, any>, candidateData?: Record<string, any>): CompanyDriverMatch {
  let name = "";
  let phone: string | null = null;
  let email: string | null = null;
  let state: string | null = null;
  let yearsExp: string | null = null;
  let driverType: string | null = null;
  let licenseClass: string | null = null;

  if (candidateData) {
    if (row.candidate_source === "application") {
      name = `${candidateData.first_name ?? ""} ${candidateData.last_name ?? ""}`.trim();
      phone = candidateData.phone ?? null;
      email = candidateData.email ?? null;
      state = candidateData.license_state ?? null;
      yearsExp = candidateData.years_exp ?? null;
      driverType = candidateData.driver_type ?? null;
      licenseClass = candidateData.license_class ?? null;
    } else if (row.candidate_source === "lead") {
      name = candidateData.full_name ?? "";
      phone = candidateData.phone ?? null;
      email = candidateData.email ?? null;
      state = candidateData.state ?? null;
      yearsExp = candidateData.years_exp ?? null;
      driverType = candidateData.is_owner_op ? "owner-operator" : null;
    }
  }

  return {
    candidateId: row.candidate_id,
    candidateSource: row.candidate_source,
    candidateDriverId: row.candidate_driver_id ?? null,
    overallScore: row.overall_score,
    rulesScore: row.rules_score,
    semanticScore: row.semantic_score ?? null,
    topReasons: (row.top_reasons ?? []) as MatchReason[],
    cautions: (row.cautions ?? []) as MatchReason[],
    scoreBreakdown: (row.score_breakdown ?? {}) as ScoreBreakdown,
    degradedMode: row.degraded_mode ?? false,
    computedAt: row.computed_at,
    candidateName: name,
    candidatePhone: phone,
    candidateEmail: email,
    candidateState: state,
    candidateYearsExp: yearsExp,
    candidateDriverType: driverType,
    candidateLicenseClass: licenseClass,
  };
}

// ── Hooks ──────────────────────────────────────────────────

/** Rollout configuration (singleton) */
export function useMatchingRollout() {
  return useQuery({
    queryKey: ["matching-rollout"],
    queryFn: async (): Promise<RolloutConfig> => {
      const { data, error } = await supabase
        .from("matching_rollout_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error || !data) {
        // Default: everything off
        return {
          shadowMode: true,
          driverUiEnabled: false,
          companyUiEnabled: false,
          companyBetaIds: [],
        };
      }

      return {
        shadowMode: data.shadow_mode ?? true,
        driverUiEnabled: data.driver_ui_enabled ?? false,
        companyUiEnabled: data.company_ui_enabled ?? false,
        companyBetaIds: (data.company_beta_ids ?? []) as string[],
      };
    },
    staleTime: 60_000, // cache for 1 minute
  });
}

/** Top N job matches for a driver (with joined job data) */
export function useDriverJobMatches(driverId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ["driver-matches", driverId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_job_match_scores")
        .select("*, jobs(title, company_name, location, pay, type, route_type, driver_type, team_driving, status, company_profiles(logo_url))")
        .eq("driver_id", driverId!)
        .order("overall_score", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Filter out non-active jobs on the client side
      return ((data ?? []) as Record<string, unknown>[])
        .filter((row) => {
          const job = row.jobs as Record<string, unknown> | null;
          return job && job.status === "Active";
        })
        .map(rowToDriverJobMatch);
    },
    enabled: !!driverId,
  });
}

/** All driver→job match scores (for sort-by-match on Jobs page) */
export function useDriverAllJobMatches(driverId: string | undefined) {
  return useQuery({
    queryKey: ["driver-all-matches", driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_job_match_scores")
        .select("job_id, overall_score")
        .eq("driver_id", driverId!);

      if (error) throw error;

      // Return as a Map for O(1) lookup
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        map.set(row.job_id, row.overall_score);
      }
      return map;
    },
    enabled: !!driverId,
  });
}

/** Single driver→job match score (for job detail page) */
export function useDriverJobMatchScore(driverId: string | undefined, jobId: string | undefined) {
  return useQuery({
    queryKey: ["driver-match-score", driverId, jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_job_match_scores")
        .select("*")
        .eq("driver_id", driverId!)
        .eq("job_id", jobId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        overallScore: data.overall_score as number,
        rulesScore: data.rules_score as number,
        semanticScore: data.semantic_score as number | null,
        topReasons: (data.top_reasons ?? []) as MatchReason[],
        cautions: (data.cautions ?? []) as MatchReason[],
        scoreBreakdown: (data.score_breakdown ?? {}) as ScoreBreakdown,
        degradedMode: data.degraded_mode as boolean,
        computedAt: data.computed_at as string,
      };
    },
    enabled: !!driverId && !!jobId,
  });
}

/** Company→Driver match scores with filters */
export function useCompanyDriverMatches(
  companyId: string | undefined,
  opts: {
    jobId?: string;
    source?: "application" | "lead";
    limit?: number;
  } = {},
) {
  return useQuery({
    queryKey: ["company-matches", companyId, opts.jobId, opts.source, opts.limit],
    queryFn: async () => {
      // 1. Fetch match scores (no joins — candidate_id has no FK)
      let query = supabase
        .from("company_driver_match_scores")
        .select("*")
        .eq("company_id", companyId!)
        .order("overall_score", { ascending: false });

      if (opts.jobId) {
        query = query.eq("job_id", opts.jobId);
      }
      if (opts.source) {
        query = query.eq("candidate_source", opts.source);
      }
      if (opts.limit) {
        query = query.limit(opts.limit);
      }

      const { data: scores, error } = await query;
      if (error) throw error;
      if (!scores || scores.length === 0) return [];

      // 2. Collect candidate IDs by source for batch lookups
      const appIds = scores.filter((s) => s.candidate_source === "application").map((s) => s.candidate_id);
      const leadIds = scores.filter((s) => s.candidate_source === "lead").map((s) => s.candidate_id);

      // 3. Batch fetch applications and leads in parallel
      const candidateMap = new Map<string, Record<string, unknown>>();

      const [appsResult, leadsResult] = await Promise.all([
        appIds.length > 0
          ? supabase
              .from("applications")
              .select("id, first_name, last_name, phone, email, license_state, years_exp, driver_type, license_class")
              .in("id", appIds)
          : Promise.resolve({ data: [] }),
        leadIds.length > 0
          ? supabase
              .from("leads")
              .select("id, full_name, phone, email, state, years_exp, is_owner_op")
              .in("id", leadIds)
          : Promise.resolve({ data: [] }),
      ]);

      for (const row of appsResult.data ?? []) {
        candidateMap.set(row.id, row as Record<string, unknown>);
      }
      for (const row of leadsResult.data ?? []) {
        candidateMap.set(row.id, row as Record<string, unknown>);
      }

      // 4. Map scores with enriched candidate data
      return (scores as Record<string, unknown>[]).map((row) =>
        rowToCompanyDriverMatch(row, candidateMap.get(row.candidate_id as string) as Record<string, unknown> | undefined),
      );
    },
    enabled: !!companyId,
  });
}
