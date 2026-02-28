/**
 * Driver → Job rules-based scoring engine.
 * Produces a score 0-90 (semantic adds up to 10 externally).
 */

import type {
  DriverFeatures,
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
  driver: DriverFeatures,
  job: JobFeatures,
): { cs: ComponentScore; reasons: MatchReason[]; hardBlock: boolean } {
  const d = normalizeDriverType(driver.driverType);
  const j = normalizeDriverType(job.driverType);
  const reasons: MatchReason[] = [];

  if (!d || !j) {
    return { cs: { score: 10, maxScore: 20, detail: "Driver type data unavailable" }, reasons, hardBlock: false };
  }

  if (d === j) {
    reasons.push({ text: `Your driver type (${d}) matches this position`, positive: true });
    return { cs: { score: 20, maxScore: 20, detail: `Exact match: ${d}` }, reasons, hardBlock: false };
  }

  // Compatible combos
  if ((d === "owner-operator" && j === "lease") || (d === "lease" && j === "owner-operator")) {
    reasons.push({ text: `${d} is compatible with ${j} position`, positive: true });
    return { cs: { score: 12, maxScore: 20, detail: `Compatible: ${d} ↔ ${j}` }, reasons, hardBlock: false };
  }

  reasons.push({ text: `Position requires ${j} but you are ${d}`, positive: false });
  return { cs: { score: 0, maxScore: 20, detail: `Mismatch: ${d} vs ${j}` }, reasons, hardBlock: true };
}

function scoreRouteFit(
  driver: DriverFeatures,
  job: JobFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const jobRoute = normalizeRouteType(job.routeType);
  const reasons: MatchReason[] = [];

  if (!jobRoute) {
    return { cs: { score: 8, maxScore: 15, detail: "Job route type not specified" }, reasons };
  }

  // Check if driver has route preferences
  const hasPrefs = Object.values(driver.routePrefs).some(Boolean);
  if (!hasPrefs) {
    return { cs: { score: 8, maxScore: 15, detail: "No route preferences set" }, reasons };
  }

  // Map job route to driver pref key
  const prefKey = jobRoute; // already normalized to otr/local/regional/dedicated/ltl
  if (driver.routePrefs[prefKey]) {
    reasons.push({ text: `Your ${jobRoute.toUpperCase()} route preference matches`, positive: true });
    return { cs: { score: 15, maxScore: 15, detail: `Route match: ${jobRoute}` }, reasons };
  }

  // Partial: OTR drivers often accept regional and vice versa
  if ((jobRoute === "otr" && driver.routePrefs["regional"]) ||
      (jobRoute === "regional" && driver.routePrefs["otr"])) {
    reasons.push({ text: `Your route preference partially aligns (${jobRoute})`, positive: true });
    return { cs: { score: 10, maxScore: 15, detail: `Partial route match` }, reasons };
  }

  reasons.push({ text: `This job is ${jobRoute.toUpperCase()} which doesn't match your route preferences`, positive: false });
  return { cs: { score: 3, maxScore: 15, detail: `Route mismatch: ${jobRoute}` }, reasons };
}

function scoreFreightFit(
  driver: DriverFeatures,
  job: JobFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const jobFreight = normalizeFreightType(job.freightType);
  const reasons: MatchReason[] = [];

  if (!jobFreight) {
    return { cs: { score: 8, maxScore: 15, detail: "Job freight type not specified" }, reasons };
  }

  const hasExp = Object.values(driver.haulerExperience).some(Boolean);
  if (!hasExp) {
    return { cs: { score: 5, maxScore: 15, detail: "No hauler experience data" }, reasons };
  }

  if (driver.haulerExperience[jobFreight]) {
    reasons.push({ text: `You have experience with ${jobFreight} freight`, positive: true });
    return { cs: { score: 15, maxScore: 15, detail: `Freight match: ${jobFreight}` }, reasons };
  }

  // Count how many hauler types the driver has (more = more versatile)
  const expCount = Object.values(driver.haulerExperience).filter(Boolean).length;
  if (expCount >= 4) {
    reasons.push({ text: "Your broad hauler experience may apply", positive: true });
    return { cs: { score: 10, maxScore: 15, detail: "Versatile hauler, no exact match" }, reasons };
  }

  return { cs: { score: 3, maxScore: 15, detail: `No ${jobFreight} experience` }, reasons };
}

function scoreTeamFit(
  driver: DriverFeatures,
  job: JobFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const d = normalizeTeamPref(driver.soloTeam);
  const j = normalizeTeamPref(job.teamDriving);
  const reasons: MatchReason[] = [];

  if (!d || !j) {
    return { cs: { score: 5, maxScore: 10, detail: "Team preference data unavailable" }, reasons };
  }

  if (d === j || j === "both" || d === "both") {
    reasons.push({ text: `Team driving preference aligns (${j})`, positive: true });
    return { cs: { score: 10, maxScore: 10, detail: `Team match: ${d} ↔ ${j}` }, reasons };
  }

  reasons.push({ text: `Job is ${j} but you prefer ${d}`, positive: false });
  return { cs: { score: 0, maxScore: 10, detail: `Team mismatch: ${d} vs ${j}` }, reasons };
}

function scoreLocationFit(
  driver: DriverFeatures,
  job: JobFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const driverState = extractState(driver.licenseState);
  const jobState = extractState(job.location);
  const reasons: MatchReason[] = [];

  if (!driverState || !jobState) {
    return { cs: { score: 5, maxScore: 10, detail: "Location data unavailable" }, reasons };
  }

  if (driverState === jobState) {
    reasons.push({ text: `Job is in your state (${driverState})`, positive: true });
    return { cs: { score: 10, maxScore: 10, detail: `Same state: ${driverState}` }, reasons };
  }

  if (areNeighboringStates(driverState, jobState)) {
    reasons.push({ text: `Job is in a neighboring state (${jobState})`, positive: true });
    return { cs: { score: 6, maxScore: 10, detail: `Neighboring: ${driverState} ↔ ${jobState}` }, reasons };
  }

  reasons.push({ text: `Job is in ${jobState} — relocation may apply`, positive: false });
  return { cs: { score: 2, maxScore: 10, detail: `Different state: ${driverState} vs ${jobState}` }, reasons };
}

function scoreExperienceFit(
  driver: DriverFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const ord = experienceOrdinal(driver.yearsExp);
  const reasons: MatchReason[] = [];

  if (ord < 0) {
    return { cs: { score: 5, maxScore: 10, detail: "Experience data unavailable" }, reasons };
  }

  const scoreMap = [2, 4, 6, 8, 10]; // none=2, less-1=4, 1-3=6, 3-5=8, 5+=10
  const score = scoreMap[ord] ?? 5;

  if (ord >= 3) {
    reasons.push({ text: `Your ${driver.yearsExp} experience is highly valued`, positive: true });
  } else if (ord >= 2) {
    reasons.push({ text: `Your experience level (${driver.yearsExp}) meets expectations`, positive: true });
  }

  return { cs: { score, maxScore: 10, detail: `Experience: ${driver.yearsExp} (ordinal ${ord})` }, reasons };
}

function scoreLicenseEndorseFit(
  driver: DriverFeatures,
  job: JobFeatures,
): { cs: ComponentScore; reasons: MatchReason[] } {
  const licClass = normalizeLicenseClass(driver.licenseClass);
  const reasons: MatchReason[] = [];
  let score = 0;

  // License class
  if (licClass === "a") {
    score += 6;
    reasons.push({ text: "Class A CDL qualifies for this position", positive: true });
  } else if (licClass === "b") {
    score += 4;
  } else if (licClass === "c") {
    score += 2;
  } else if (licClass === "permit") {
    score += 1;
  } else {
    score += 3; // unknown
  }

  // Endorsement bonus for relevant freight
  const jobFreight = normalizeFreightType(job.freightType);
  if (jobFreight === "tanker" && (driver.endorsements["tankVehicles"] || driver.endorsements["tankerHazmat"])) {
    score += 4;
    reasons.push({ text: "Your tanker endorsement matches this freight type", positive: true });
  } else if (jobFreight === "tanker" && !driver.endorsements["tankVehicles"]) {
    reasons.push({ text: "Tanker endorsement may be required for this position", positive: false });
  } else if (driver.endorsements["hazmat"]) {
    score += 2;
  } else {
    score += 1; // no endorsement penalty, just less bonus
  }

  return { cs: { score: Math.min(score, 10), maxScore: 10, detail: `License: ${licClass}, endorsements applied` }, reasons };
}

// ── Main scoring function ──────────────────────────────────

export function computeDriverJobRulesScore(
  driver: DriverFeatures,
  job: JobFeatures,
): MatchResult {
  const breakdown: ScoreBreakdown = {};
  const allReasons: MatchReason[] = [];
  const allCautions: MatchReason[] = [];
  let hardBlocked = false;

  // 1. Driver type (20pts)
  const dt = scoreDriverTypeFit(driver, job);
  breakdown["driverType"] = dt.cs;
  allReasons.push(...dt.reasons.filter((r) => r.positive));
  allCautions.push(...dt.reasons.filter((r) => !r.positive));
  if (dt.hardBlock) hardBlocked = true;

  // 2. Route (15pts)
  const rt = scoreRouteFit(driver, job);
  breakdown["route"] = rt.cs;
  allReasons.push(...rt.reasons.filter((r) => r.positive));
  allCautions.push(...rt.reasons.filter((r) => !r.positive));

  // 3. Freight (15pts)
  const fr = scoreFreightFit(driver, job);
  breakdown["freight"] = fr.cs;
  allReasons.push(...fr.reasons.filter((r) => r.positive));
  allCautions.push(...fr.reasons.filter((r) => !r.positive));

  // 4. Team (10pts)
  const tm = scoreTeamFit(driver, job);
  breakdown["team"] = tm.cs;
  allReasons.push(...tm.reasons.filter((r) => r.positive));
  allCautions.push(...tm.reasons.filter((r) => !r.positive));

  // 5. Location (10pts)
  const loc = scoreLocationFit(driver, job);
  breakdown["location"] = loc.cs;
  allReasons.push(...loc.reasons.filter((r) => r.positive));
  allCautions.push(...loc.reasons.filter((r) => !r.positive));

  // 6. Experience (10pts)
  const exp = scoreExperienceFit(driver);
  breakdown["experience"] = exp.cs;
  allReasons.push(...exp.reasons.filter((r) => r.positive));
  allCautions.push(...exp.reasons.filter((r) => !r.positive));

  // 7. License/endorsement (10pts)
  const lic = scoreLicenseEndorseFit(driver, job);
  breakdown["license"] = lic.cs;
  allReasons.push(...lic.reasons.filter((r) => r.positive));
  allCautions.push(...lic.reasons.filter((r) => !r.positive));

  // Sum rules score
  let rulesScore = Object.values(breakdown).reduce((sum, c) => sum + c.score, 0);

  // Hard gate: cap at 40 if critical mismatch
  if (hardBlocked) {
    rulesScore = Math.min(rulesScore, 40);
  }

  // Top 3 reasons + up to 2 cautions
  const topReasons = allReasons.slice(0, 3);
  const cautions = allCautions.slice(0, 2);

  return {
    overallScore: rulesScore, // semantic added externally
    rulesScore,
    semanticScore: null,
    scoreBreakdown: breakdown,
    topReasons,
    cautions,
    degradedMode: false,
  };
}
