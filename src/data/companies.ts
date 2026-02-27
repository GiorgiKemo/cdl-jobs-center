export interface CompanyData {
  id: number;
  slug: string;
  name: string;
  state: string;
  phone: string;
  address: string;
  website?: string;
  rating: number;
  driverTypes: string[];
  freightTypes: string[];
  about: string;
}

export const COMPANIES: CompanyData[] = [
  {
    id: 1,
    slug: "gi-super-service",
    name: "GI Super Service",
    state: "Illinois",
    phone: "(847) 718-1330",
    address: "2256 Landmeier Rd Suite B, Elk Grove Village, IL 60007",
    rating: 5,
    driverTypes: ["Company Driver", "Owner Operator"],
    freightTypes: ["Dry Van", "Refrigerated"],
    about: "G I Super Service is a family-owned trucking company in Elk Grove Village, Illinois. We provide your company with the dependable shipments it needs to be successful. Focused on helping businesses like yours meet their goals by delivering fast, reliable logistic services and meeting all freight transportation needs. Most importantly, our smaller company is able to provide you with the level of personal service you deserve, treating you like family.",
  },
  {
    id: 2,
    slug: "united-global-carrier",
    name: "United Global Carrier",
    state: "Illinois",
    phone: "(773) 627-5960",
    address: "1338 South Loraine Rd Unit D, Wheaton, IL 60189",
    rating: 5,
    driverTypes: ["Company Driver", "Lease Purchase"],
    freightTypes: ["Flatbed", "Dry Van"],
    about: "United Global Carrier Inc. is a full-service flatbed and specialized carrier based in Wheaton, Illinois. We offer competitive pay, excellent benefits, and lease purchase opportunities for qualified drivers. Our team is committed to building long-term relationships with professional CDL drivers who share our dedication to safety and on-time delivery.",
  },
  {
    id: 3,
    slug: "pkd-express",
    name: "PKD Express",
    state: "California",
    phone: "(310) 555-0192",
    address: "4820 Pacific Coast Hwy, Long Beach, CA 90804",
    rating: 5,
    driverTypes: ["Company Driver", "Owner Operator"],
    freightTypes: ["Tanker"],
    about: "PKD Express is a premier tanker carrier based in Long Beach, California. We pride ourselves on an excellent safety record and a driver-first culture. We offer competitive compensation for experienced CDL-A tanker operators, with routes covering the western United States. Our drivers enjoy consistent miles, modern equipment, and a supportive dispatch team.",
  },
  {
    id: 4,
    slug: "an-enterprise",
    name: "AN Enterprise Inc",
    state: "Florida",
    phone: "(305) 555-0138",
    address: "8740 NW 36th St, Doral, FL 33166",
    rating: 5,
    driverTypes: ["Team Driver", "Company Driver"],
    freightTypes: ["Dry Van", "Dry Bulk"],
    about: "AN Enterprise Inc. is a growing carrier headquartered in Doral, Florida. We specialize in dry van and dry bulk freight, offering team and solo driving opportunities nationwide. Our strong home time policies and competitive pay packages make us a top choice for drivers looking for stability and career growth in the Southeast and beyond.",
  },
];
