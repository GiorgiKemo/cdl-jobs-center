const KEY = "cdl-driver-profile";
const APP_KEY = "cdl-application";

export interface DriverProfile {
  firstName: string;
  lastName: string;
  phone: string;
  cdlNumber: string;
  licenseClass: string;
  yearsExp: string;
  licenseState: string;
  about: string;
}

export function useDriverProfile() {
  const load = (): Partial<DriverProfile> => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      return {};
    }
  };

  const save = (data: DriverProfile) => {
    localStorage.setItem(KEY, JSON.stringify(data));
    // Also seed the application form so future apply forms pre-fill automatically
    try {
      const existing = JSON.parse(localStorage.getItem(APP_KEY) ?? "{}");
      const updated = {
        ...existing,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        cdlNumber: data.cdlNumber,
        licenseClass: data.licenseClass,
        yearsExp: data.yearsExp,
        licenseState: data.licenseState,
      };
      localStorage.setItem(APP_KEY, JSON.stringify(updated));
    } catch {}
  };

  return { load, save };
}
