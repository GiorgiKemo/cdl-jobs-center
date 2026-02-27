const KEY = "cdl-application";

export interface ApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cdlNumber: string;
  zipCode: string;
  date: string;
  driverType: string;
  licenseClass: string;
  yearsExp: string;
  licenseState: string;
  soloTeam: string;
  notes: string;
  prefs: Record<string, boolean>;
  endorse: Record<string, boolean>;
  hauler: Record<string, boolean>;
  route: Record<string, boolean>;
  extra: Record<string, boolean>;
}

export function useApplication() {
  const load = (): Partial<ApplicationData> => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const save = (data: ApplicationData) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  };

  return { load, save };
}
