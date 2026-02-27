const KEY = "cdl-saved-jobs";

export function useSavedJobs() {
  const load = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  };

  const toggle = (id: string): boolean => {
    const current = load();
    const exists = current.includes(id);
    const updated = exists ? current.filter((i) => i !== id) : [...current, id];
    localStorage.setItem(KEY, JSON.stringify(updated));
    return !exists; // returns true if now saved
  };

  const isSaved = (id: string): boolean => load().includes(id);

  return { load, toggle, isSaved };
}
