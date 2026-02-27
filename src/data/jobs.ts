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

export const SEED_JOBS: Job[] = [
  {
    id: "seed-1",
    company: "GI Super Service",
    title: "OTR Dry Van Driver",
    description: "What would it feel like to drive for a company that puts drivers first and loads second? At GI Super Service we offer top pay, consistent miles, and a supportive team.",
    type: "Dry Van",
    driverType: "Company Driver",
    routeType: "OTR",
    teamDriving: "Solo",
    location: "Illinois",
    pay: "$0.60-0.70/mile",
  },
  {
    id: "seed-2",
    company: "United Global Carrier",
    title: "Regional Flatbed Driver",
    description: "What would it feel like to drive for a company that puts drivers first and loads second? United Global Carrier offers regional routes with great home time.",
    type: "Flatbed",
    driverType: "Company Driver",
    routeType: "Regional",
    teamDriving: "Solo",
    location: "Texas",
    pay: "$1,400-1,800/week",
  },
  {
    id: "seed-3",
    company: "PKD Express",
    title: "Local Tanker Driver",
    description: "How would you rate your current trucking company? What would it feel like to drive for a company that puts drivers first and loads second? PKD Express is hiring.",
    type: "Tanker",
    driverType: "Company Driver",
    routeType: "Local",
    teamDriving: "Solo",
    location: "California",
    pay: "$75,000-90,000/year",
  },
  {
    id: "seed-4",
    company: "AN Enterprise Inc",
    title: "Refrigerated Solo Driver",
    description: "AN Enterprise Inc offers excellent pay and benefits for refrigerated drivers. Join a company that values your time at home and on the road.",
    type: "Refrigerated",
    driverType: "Company Driver",
    routeType: "OTR",
    teamDriving: "Solo",
    location: "Florida",
    pay: "$0.65-0.75/mile",
  },
  {
    id: "seed-5",
    company: "GI Super Service",
    title: "Owner Operator - Dry Van",
    description: "GI Super Service is looking for owner operators who want to maximize earnings. Earn 85% of load with no forced dispatch and great support.",
    type: "Owner Operator",
    driverType: "Owner Operator",
    routeType: "OTR",
    teamDriving: "Solo",
    location: "Nationwide",
    pay: "85% of load",
  },
  {
    id: "seed-6",
    company: "United Global Carrier",
    title: "Student Driver Program",
    description: "No experience? No problem. United Global Carrier's student driver program provides paid training and job placement upon graduation.",
    type: "Students",
    driverType: "Student",
    routeType: "OTR",
    teamDriving: "Solo",
    location: "Multiple States",
    pay: "$600-800/week training",
  },
  {
    id: "seed-7",
    company: "PKD Express",
    title: "Dry Bulk Hauler",
    description: "PKD Express is seeking experienced dry bulk drivers for steady regional runs. Competitive weekly pay, home weekends, full benefits package.",
    type: "Dry Bulk",
    driverType: "Company Driver",
    routeType: "Regional",
    teamDriving: "Solo",
    location: "Texas",
    pay: "$1,200-1,600/week",
  },
  {
    id: "seed-8",
    company: "AN Enterprise Inc",
    title: "Team Driver - Long Haul",
    description: "AN Enterprise Inc is looking for team drivers for long-haul OTR runs. Split pay, consistent miles, and top equipment available immediately.",
    type: "Teams",
    driverType: "Company Driver",
    routeType: "OTR",
    teamDriving: "Team",
    location: "Nationwide",
    pay: "$0.70-0.80/mile split",
  },
];
