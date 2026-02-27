export interface Job {
  id: string;
  company: string;
  title: string;
  description: string;
  type: string;        // freight type
  driverType: string;  // "Owner Operator" | "Company Driver" | "Student"
  routeType: string;   // "OTR" | "Local" | "Regional" | "Dedicated" | "LTL"
  teamDriving: string; // "Solo" | "Team" | "Both"
  location: string;
  pay: string;
  postedAt?: string;
  status?: "Draft" | "Active" | "Paused" | "Closed";
}

// Jobs are loaded from the database — no seed data
export const SEED_JOBS: Job[] = [];
