export type {
  ComponentScore,
  ScoreBreakdown,
  MatchReason,
  MatchResult,
  DriverFeatures,
  JobFeatures,
  CandidateFeatures,
} from "./types.ts";

export {
  normalizeDriverType,
  normalizeRouteType,
  normalizeFreightType,
  normalizeTeamPref,
  normalizeLicenseClass,
  normalizeExperience,
  experienceOrdinal,
  extractState,
  areNeighboringStates,
} from "./normalize.ts";

export { computeDriverJobRulesScore } from "./driver-job-rules.ts";
export { computeCompanyDriverRulesScore } from "./company-driver-rules.ts";

export {
  type EmbeddingProvider,
  HuggingFaceProvider,
  cosineSimilarity,
  buildDriverText,
  buildJobText,
  buildLeadText,
  contentHash,
  createEmbeddingProvider,
} from "./embeddings.ts";
