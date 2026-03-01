export const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
] as const;

export const JOB_CATEGORIES = [
  { label: "Dry Van", path: "/jobs?type=dry-van" },
  { label: "Flatbed", path: "/jobs?type=flatbed" },
  { label: "Refrigerated", path: "/jobs?type=refrigerated" },
  { label: "Tanker", path: "/jobs?type=tanker" },
  { label: "Car Hauler", path: "/jobs?type=car-hauler" },
  { label: "Owner Operator", path: "/jobs?type=owner-operator" },
  { label: "Intermodal", path: "/jobs?type=intermodal" },
  { label: "LTL", path: "/jobs?type=ltl" },
] as const;
