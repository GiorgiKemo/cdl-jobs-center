import { useAuth } from "@/context/auth";

const BASE_KEY = "cdl-application";

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
  const { user } = useAuth();

  // Scope storage key by user ID to prevent data leaking between accounts
  const key = user?.id ? `${BASE_KEY}-${user.id}` : BASE_KEY;

  const load = (): Partial<ApplicationData> => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const save = (data: ApplicationData) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  };

  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return { load, save, clear };
}

/** Remove all application draft keys from localStorage (call on sign-out) */
export function clearAllApplicationDrafts() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(BASE_KEY)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
