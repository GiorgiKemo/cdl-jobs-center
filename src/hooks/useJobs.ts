import { Job } from "@/data/jobs";

const KEY = "cdl-company-jobs";

export function useJobs() {
  const loadAll = (): Job[] => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveAll = (jobs: Job[]) => {
    localStorage.setItem(KEY, JSON.stringify(jobs));
  };

  const add = (job: Omit<Job, "id" | "postedAt">) => {
    const jobs = loadAll();
    const newJob: Job = {
      ...job,
      id: Date.now().toString(),
      postedAt: new Date().toISOString(),
    };
    saveAll([...jobs, newJob]);
  };

  const update = (id: string, data: Partial<Job>) => {
    const jobs = loadAll();
    saveAll(jobs.map((j) => (j.id === id ? { ...j, ...data } : j)));
  };

  const remove = (id: string) => {
    const jobs = loadAll();
    saveAll(jobs.filter((j) => j.id !== id));
  };

  return { loadAll, add, update, remove };
}
