/**
 * Company → Driver/Candidate rules-based scoring engine.
 * Scores a candidate (application or lead) against a specific job.
 * Produces a score 0-90 (semantic adds up to 10 externally).
 */

import type {
  CandidateFeatures,
  JobFeatures,
  ComponentScore,
  ScoreBreakdown,
  MatchReason,
  MatchResult,
} from "./types.ts";
import {
  normalizeDriverType,
  normalizeRouteType,
  normalizeFreightType,
  normalizeTeamPref,
  normalizeLicenseClass,
  experienceOrdinal,
  extractState,
  areNeighboringStates,
} from "./normalize.ts";

// ── Component scorers ──────────────────────────────────────

function scoreDriverTypeFit(
  candidate: CandidateFeatures,
  job: JobFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const c = normalizeDriverType(candidate.driverType);
  const j = normalizeDriverType(job.driverType);
  const reasons: MatchReason[] = [];

  if (!c) {
    return { cs: { score: 0, maxScore: 20, detail: "Driver type unknown" }, reasons };
  }
  if (!j) {
    return { cs: { score: 10, maxScore: 20, detail: "Job driver type not specified" }, reasons };
  }

  if (c === j) {
    reasons.push({ text: `Driver type matches (${c})`, positive: true });
    return { cs: { score: 20, maxScore: 20, detail: `Exact match: ${c}` }, reasons };
  }

  if ((c === "owner-operator" && j === "lease") || (c === "lease" && j === "owner-operator")) {
    reasons.push({ text: `Driver type compatible (${c} ↔ ${j})`, positive: true });
    return { cs: { score: 12, maxScore: 20, detail: `Compatible: ${c} ↔ ${j}` }, reasons };
  }

  reasons.push({ text: `Driver type mismatch (${c} vs ${j})`, positive: false });
  return { cs: { score: 0, maxScore: 20, detail: `Mismatch: ${c} vs ${j}` }, reasons };
}

function scoreLicenseClassFit(
  candidate: CandidateFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const lic = normalizeLicenseClass(candidate.licenseClass);
  const reasons: MatchReason[] = [];

  if (!lic) {
    return { cs: { score: 0, maxScore: 20, detail: "License class unknown" }, reasons };
  }

  if (lic === "a") {
    reasons.push({ text: "Class A CDL holder", positive: true });
    return { cs: { score: 20, maxScore: 20, detail: "Class A" }, reasons };
  }
  if (lic === "b") {
    reasons.push({ text: "Class B CDL holder", positive: true });
    return { cs: { score: 14, maxScore: 20, detail: "Class B" }, reasons };
  }
  if (lic === "c") {
    return { cs: { score: 8, maxScore: 20, detail: "Class C" }, reasons };
  }
  // permit
  return { cs: { score: 4, maxScore: 20, detail: "Permit only" }, reasons };
}

function scoreExperienceFit(
  candidate: CandidateFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const ord = experienceOrdinal(candidate.yearsExp);
  const reasons: MatchReason[] = [];

  if (ord < 0) {
    return { cs: { score: 0, maxScore: 15, detail: "Experience data unavailable" }, reasons };
  }

  // none=2, less-1=4, 1-3=7, 3-5=11, 5+=15
  const scoreMap = [2, 4, 7, 11, 15];
  const score = scoreMap[ord] ?? 0;

  if (ord >= 3) {
    reasons.push({ text: `${candidate.yearsExp} driving experience`, positive: true });
  }

  return { cs: { score, maxScore: 15, detail: `Experience: ${candidate.yearsExp}` }, reasons };
}

function scoreRouteFreightTeamFit(
  candidate: CandidateFeatures,
  job: JobFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const reasons: MatchReason[] = [];
  let score = 0;
  const maxScore = 20;

  // Route (7pts of 20)
  const jobRoute = normalizeRouteType(job.routeType);
  if (jobRoute) {
    const hasPrefs = Object.values(candidate.routePrefs).some(Boolean);
    if (!hasPrefs) {
      // no data — 0
    } else if (candidate.routePrefs[jobRoute]) {
      score += 7;
      reasons.push({ text: `Route preference aligns (${jobRoute})`, positive: true });
    } else if (
      (jobRoute === "otr" && candidate.routePrefs["regional"]) ||
      (jobRoute === "regional" && candidate.routePrefs["otr"])
    ) {
      score += 4;
    }
  } else {
    score += 4; // no job route specified
  }

  // Freight (7pts of 20)
  const jobFreight = normalizeFreightType(job.freightType);
  if (jobFreight) {
    const hasExp = Object.values(candidate.haulerExperience).some(Boolean);
    if (!hasExp) {
      // no data — 0
    } else if (candidate.haulerExperience[jobFreight]) {
      score += 7;
      reasons.push({ text: `Hauler experience matches (${jobFreight})`, positive: true });
    } else {
      const expCount = Object.values(candidate.haulerExperience).filter(Boolean).length;
      if (expCount >= 4) score += 4;
    }
  } else {
    score += 4;
  }

  // Team (6pts of 20)
  const cTeam = normalizeTeamPref(candidate.soloTeam);
  const jTeam = normalizeTeamPref(job.teamDriving);
  if (cTeam && jTeam) {
    if (cTeam === jTeam || jTeam === "both" || cTeam === "both") {
      score += 6;
    }
  } else {
    score += 3; // partial data
  }

  return { cs: { score: Math.min(score, maxScore), maxScore, detail: "Route/freight/team combined" }, reasons };
}

function scoreLocationFit(
  candidate: CandidateFeatures,
  job: JobFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const cState = extractState(candidate.state);
  const jState = extractState(job.location);
  const reasons: MatchReason[] = [];

  if (!cState || !jState) {
    return { cs: { score: 0, maxScore: 10, detail: "Location data unavailable" }, reasons };
  }

  if (cState === jState) {
    reasons.push({ text: `Located in same state (${cState})`, positive: true });
    return { cs: { score: 10, maxScore: 10, detail: `Same state: ${cState}` }, reasons };
  }

  if (areNeighboringStates(cState, jState)) {
    return { cs: { score: 6, maxScore: 10, detail: `Neighboring: ${cState} ↔ ${jState}` }, reasons };
  }

  return { cs: { score: 2, maxScore: 10, detail: `Different state: ${cState} vs ${jState}` }, reasons };
}

function scoreRecencyActivity(
  candidate: CandidateFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const reasons: MatchReason[] = [];

  if (!candidate.createdAt) {
    return { cs: { score: 2, maxScore: 5, detail: "No activity date" }, reasons };
  }

  const daysSince = Math.floor((Date.now() - new Date(candidate.createdAt).getTime()) / 86_400_000);

  if (daysSince <= 7) {
    reasons.push({ text: "Applied/submitted recently", positive: true });
    return { cs: { score: 5, maxScore: 5, detail: `${daysSince}d ago` }, reasons };
  }
  if (daysSince <= 30) {
    return { cs: { score: 3, maxScore: 5, detail: `${daysSince}d ago` }, reasons };
  }
  return { cs: { score: 1, maxScore: 5, detail: `${daysSince}d ago` }, reasons };
}

// ── Main scoring function ──────────────────────────────────

export function computeCompanyDriverRulesScore(
  candidate: CandidateFeatures,
  job: JobFeatures,
): MatchResult {
  const breakdown: ScoreBreakdown = {};
  const allReasons: MatchReason[] = [];
  const allCautions: MatchReason[] = [];

  // 1. Driver type (20pts)
  const dt = scoreDriverTypeFit(candidate, job);
  breakdown["driverType"] = dt.cs;
  allReasons.push(...dt.reasons.filter((r) => r.positive));
  allCautions.push(...dt.reasons.filter((r) => !r.positive));

  // 2. License class (20pts)
  const lic = scoreLicenseClassFit(candidate);
  breakdown["licenseClass"] = lic.cs;
  allReasons.push(...lic.reasons.filter((r) => r.positive));
  allCautions.push(...lic.reasons.filter((r) => !r.positive));

  // 3. Experience (15pts)
  const exp = scoreExperienceFit(candidate);
  breakdown["experience"] = exp.cs;
  allReasons.push(...exp.reasons.filter((r) => r.positive));
  allCautions.push(...exp.reasons.filter((r) => !r.positive));

  // 4. Route/freight/team combined (20pts)
  const rft = scoreRouteFreightTeamFit(candidate, job);
  breakdown["routeFreightTeam"] = rft.cs;
  allReasons.push(...rft.reasons.filter((r) => r.positive));
  allCautions.push(...rft.reasons.filter((r) => !r.positive));

  // 5. Location (10pts)
  const loc = scoreLocationFit(candidate, job);
  breakdown["location"] = loc.cs;
  allReasons.push(...loc.reasons.filter((r) => r.positive));
  allCautions.push(...loc.reasons.filter((r) => !r.positive));

  // 6. Recency/activity (5pts)
  const rec = scoreRecencyActivity(candidate);
  breakdown["recency"] = rec.cs;
  allReasons.push(...rec.reasons.filter((r) => r.positive));

  // Add missing-field cautions for leads
  for (const field of candidate.missingFields) {
    allCautions.push({ text: `Limited data — ${field} not available`, positive: false });
  }

  const rulesScore = Object.values(breakdown).reduce((sum, c) => sum + c.score, 0);

  return {
    overallScore: rulesScore,
    rulesScore,
    semanticScore: null,
    scoreBreakdown: breakdown,
    topReasons: allReasons.slice(0, 3),
    cautions: allCautions.slice(0, 2),
    degradedMode: false,
  };
}
