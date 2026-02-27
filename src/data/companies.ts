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

// Companies are loaded from the database — no seed data
export const COMPANIES: CompanyData[] = [];
