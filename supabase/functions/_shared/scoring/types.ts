/** Score breakdown for a single component (e.g. "driverType", "route") */
export interface ComponentScore {
  score: number;
  maxScore: number;
  detail: string;
}

export type ScoreBreakdown = Record<string, ComponentScore>;

export interface MatchReason {
  text: string;
  positive: boolean; // true = green checkmark, false = amber caution
}

export interface MatchResult {
  overallScore: number;   // 0-100
  rulesScore: number;     // 0-90
  semanticScore: number | null; // 0-10 or null if unavailable
  scoreBreakdown: ScoreBreakdown;
  topReasons: MatchReason[];
  cautions: MatchReason[];
  degradedMode: boolean;  // true if embedding provider failed
}

/** Normalized driver attributes extracted from driver_profiles + optional application */
export interface DriverFeatures {
  driverId: string;
  driverType: string | null;       // canonical: "company" | "owner-operator" | "lease" | "student"
  licenseClass: string | null;     // canonical: "a" | "b" | "c" | "permit"
  yearsExp: string | null;         // canonical: "none" | "less-1" | "1-3" | "3-5" | "5+"
  licenseState: string | null;
  zipCode: string | null;
  about: string | null;
  // From application if available:
  soloTeam: string | null;         // "Solo" | "Team" | "Either"
  endorsements: Record<string, boolean>;  // hazmat, tankVehicles, etc.
  haulerExperience: Record<string, boolean>; // box, flatbed, tanker, etc.
  routePrefs: Record<string, boolean>;    // otr, local, regional, etc.
  textBlock: string;               // PII-free text for embedding
}

/** Normalized job attributes */
export interface JobFeatures {
  jobId: string;
  companyId: string;
  title: string;
  description: string;
  driverType: string | null;   // canonical
  routeType: string | null;    // canonical
  freightType: string | null;  // canonical
  teamDriving: string | null;  // "Solo" | "Team" | "Both"
  location: string | null;
  pay: string | null;
  status: string;
  textBlock: string;           // PII-free text for embedding
}

/** Normalized candidate attributes (from application or lead) */
export interface CandidateFeatures {
  candidateId: string;
  source: "application" | "lead";
  candidateDriverId: string | null;
  name: string;
  driverType: string | null;
  licenseClass: string | null;
  yearsExp: string | null;
  state: string | null;
  soloTeam: string | null;
  endorsements: Record<string, boolean>;
  haulerExperience: Record<string, boolean>;
  routePrefs: Record<string, boolean>;
  createdAt: string;
  textBlock: string;
  missingFields: string[];     // fields with no data (for cautions)
}
