// ── Driver type normalization ───────────────────────────────
const DRIVER_TYPE_MAP: Record<string, string> = {
  company: "company",
  "company driver": "company",
  "company-driver": "company",
  "owner-operator": "owner-operator",
  "owner operator": "owner-operator",
  owneroperator: "owner-operator",
  lease: "lease",
  "lease operator": "lease",
  "lease-operator": "lease",
  student: "student",
  "student / trainee": "student",
  trainee: "student",
};

export function normalizeDriverType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return DRIVER_TYPE_MAP[raw.toLowerCase().trim()] ?? raw.toLowerCase().trim();
}

// ── License class normalization ────────────────────────────
const LICENSE_MAP: Record<string, string> = {
  a: "a", "class a": "a", "class-a": "a",
  b: "b", "class b": "b", "class-b": "b",
  c: "c", "class c": "c", "class-c": "c",
  permit: "permit", "permit only": "permit",
};

export function normalizeLicenseClass(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return LICENSE_MAP[raw.toLowerCase().trim()] ?? raw.toLowerCase().trim();
}

// ── Experience normalization → ordinal ─────────────────────
const EXP_ORDINAL: Record<string, number> = {
  none: 0,
  "less-1": 1,
  "< 1 year": 1,
  "1-3": 2,
  "1–3 years": 2,
  "3-5": 3,
  "3–5 years": 3,
  "5+": 4,
  "5+ years": 4,
};

export function experienceOrdinal(raw: string | null | undefined): number {
  if (!raw) return -1; // unknown
  return EXP_ORDINAL[raw.toLowerCase().trim()] ?? -1;
}

export function normalizeExperience(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  // Map verbose forms to short forms
  if (lower.includes("5+") || lower.includes("5 +")) return "5+";
  if (lower.includes("3-5") || lower.includes("3–5")) return "3-5";
  if (lower.includes("1-3") || lower.includes("1–3")) return "1-3";
  if (lower.includes("less") || lower.includes("< 1")) return "less-1";
  if (lower === "none") return "none";
  return raw.trim();
}

// ── Route type normalization ───────────────────────────────
const ROUTE_MAP: Record<string, string> = {
  otr: "otr", "over the road": "otr",
  local: "local",
  regional: "regional",
  dedicated: "dedicated",
  ltl: "ltl", "less than truckload": "ltl",
};

export function normalizeRouteType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return ROUTE_MAP[raw.toLowerCase().trim()] ?? raw.toLowerCase().trim();
}

// ── Freight / hauler type normalization ────────────────────
const FREIGHT_MAP: Record<string, string> = {
  box: "box",
  "car hauler": "carHaul", carhauler: "carHaul", "car haul": "carHaul", carhail: "carHaul",
  "drop and hook": "dropAndHook", "drop & hook": "dropAndHook",
  "dry bulk": "dryBulk", drybulk: "dryBulk",
  "dry van": "dryVan", dryvan: "dryVan",
  flatbed: "flatbed",
  "hopper bottom": "hopperBottom", hopperbottom: "hopperBottom",
  intermodal: "intermodal",
  "oil field": "oilField", oilfield: "oilField",
  "oversize load": "oversizeLoad", oversizeload: "oversizeLoad", "oversize": "oversizeLoad",
  refrigerated: "refrigerated", reefer: "refrigerated",
  tanker: "tanker",
};

export function normalizeFreightType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return FREIGHT_MAP[raw.toLowerCase().trim()] ?? raw.toLowerCase().trim();
}

// ── Team preference normalization ──────────────────────────
const TEAM_MAP: Record<string, string> = {
  solo: "solo",
  team: "team",
  both: "both",
  either: "both",
};

export function normalizeTeamPref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return TEAM_MAP[raw.toLowerCase().trim()] ?? raw.toLowerCase().trim();
}

// ── US state extraction from location string ───────────────
const US_STATES = new Set([
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
  "delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa",
  "kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan",
  "minnesota","mississippi","missouri","montana","nebraska","nevada",
  "new hampshire","new jersey","new mexico","new york","north carolina",
  "north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island",
  "south carolina","south dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west virginia","wisconsin","wyoming",
]);

const STATE_ABBREVS: Record<string, string> = {
  al:"alabama",ak:"alaska",az:"arizona",ar:"arkansas",ca:"california",
  co:"colorado",ct:"connecticut",de:"delaware",fl:"florida",ga:"georgia",
  hi:"hawaii",id:"idaho",il:"illinois",in:"indiana",ia:"iowa",ks:"kansas",
  ky:"kentucky",la:"louisiana",me:"maine",md:"maryland",ma:"massachusetts",
  mi:"michigan",mn:"minnesota",ms:"mississippi",mo:"missouri",mt:"montana",
  ne:"nebraska",nv:"nevada",nh:"new hampshire",nj:"new jersey",nm:"new mexico",
  ny:"new york",nc:"north carolina",nd:"north dakota",oh:"ohio",ok:"oklahoma",
  or:"oregon",pa:"pennsylvania",ri:"rhode island",sc:"south carolina",
  sd:"south dakota",tn:"tennessee",tx:"texas",ut:"utah",vt:"vermont",
  va:"virginia",wa:"washington",wv:"west virginia",wi:"wisconsin",wy:"wyoming",
};

/** Extract a canonical state name from a location/state string */
export function extractState(location: string | null | undefined): string | null {
  if (!location) return null;
  const lower = location.toLowerCase().trim();

  // Direct match
  if (US_STATES.has(lower)) return lower;

  // Abbreviation match
  if (STATE_ABBREVS[lower]) return STATE_ABBREVS[lower];

  // Search within comma-separated parts
  for (const part of lower.split(/[,\s]+/)) {
    const trimmed = part.trim();
    if (US_STATES.has(trimmed)) return trimmed;
    if (STATE_ABBREVS[trimmed]) return STATE_ABBREVS[trimmed];
  }

  // Check if any state name appears in the string
  for (const state of US_STATES) {
    if (lower.includes(state)) return state;
  }

  return null;
}

// ── Neighboring states map (simplified) ────────────────────
const NEIGHBORS: Record<string, string[]> = {
  alabama: ["florida","georgia","mississippi","tennessee"],
  alaska: [],
  arizona: ["california","colorado","nevada","new mexico","utah"],
  arkansas: ["louisiana","mississippi","missouri","oklahoma","tennessee","texas"],
  california: ["arizona","nevada","oregon"],
  colorado: ["arizona","kansas","nebraska","new mexico","oklahoma","utah","wyoming"],
  connecticut: ["massachusetts","new york","rhode island"],
  delaware: ["maryland","new jersey","pennsylvania"],
  florida: ["alabama","georgia"],
  georgia: ["alabama","florida","north carolina","south carolina","tennessee"],
  hawaii: [],
  idaho: ["montana","nevada","oregon","utah","washington","wyoming"],
  illinois: ["indiana","iowa","kentucky","missouri","wisconsin"],
  indiana: ["illinois","kentucky","michigan","ohio"],
  iowa: ["illinois","minnesota","missouri","nebraska","south dakota","wisconsin"],
  kansas: ["colorado","missouri","nebraska","oklahoma"],
  kentucky: ["illinois","indiana","missouri","ohio","tennessee","virginia","west virginia"],
  louisiana: ["arkansas","mississippi","texas"],
  maine: ["new hampshire"],
  maryland: ["delaware","pennsylvania","virginia","west virginia"],
  massachusetts: ["connecticut","new hampshire","new york","rhode island","vermont"],
  michigan: ["indiana","ohio","wisconsin"],
  minnesota: ["iowa","north dakota","south dakota","wisconsin"],
  mississippi: ["alabama","arkansas","louisiana","tennessee"],
  missouri: ["arkansas","illinois","iowa","kansas","kentucky","nebraska","oklahoma","tennessee"],
  montana: ["idaho","north dakota","south dakota","wyoming"],
  nebraska: ["colorado","iowa","kansas","missouri","south dakota","wyoming"],
  nevada: ["arizona","california","idaho","oregon","utah"],
  "new hampshire": ["maine","massachusetts","vermont"],
  "new jersey": ["delaware","new york","pennsylvania"],
  "new mexico": ["arizona","colorado","oklahoma","texas","utah"],
  "new york": ["connecticut","massachusetts","new jersey","pennsylvania","vermont"],
  "north carolina": ["georgia","south carolina","tennessee","virginia"],
  "north dakota": ["minnesota","montana","south dakota"],
  ohio: ["indiana","kentucky","michigan","pennsylvania","west virginia"],
  oklahoma: ["arkansas","colorado","kansas","missouri","new mexico","texas"],
  oregon: ["california","idaho","nevada","washington"],
  pennsylvania: ["delaware","maryland","new jersey","new york","ohio","west virginia"],
  "rhode island": ["connecticut","massachusetts"],
  "south carolina": ["georgia","north carolina"],
  "south dakota": ["iowa","minnesota","montana","nebraska","north dakota","wyoming"],
  tennessee: ["alabama","arkansas","georgia","kentucky","mississippi","missouri","north carolina","virginia"],
  texas: ["arkansas","louisiana","new mexico","oklahoma"],
  utah: ["arizona","colorado","idaho","nevada","new mexico","wyoming"],
  vermont: ["massachusetts","new hampshire","new york"],
  virginia: ["kentucky","maryland","north carolina","tennessee","west virginia"],
  washington: ["idaho","oregon"],
  "west virginia": ["kentucky","maryland","ohio","pennsylvania","virginia"],
  wisconsin: ["illinois","iowa","michigan","minnesota"],
  wyoming: ["colorado","idaho","montana","nebraska","south dakota","utah"],
};

export function areNeighboringStates(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return NEIGHBORS[na]?.includes(nb) ?? false;
}
