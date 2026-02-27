import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useSavedJobs(driverId: string) {
  const qc = useQueryClient();
  const key = ["saved_jobs", driverId];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("driver_id", driverId);
      if (error) throw error;
      return (data ?? []).map((r) => r.job_id as string);
    },
    enabled: !!driverId,
  });

  const savedIds = data ?? [];

  const toggleMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const alreadySaved = savedIds.includes(jobId);
      if (alreadySaved) {
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("driver_id", driverId)
          .eq("job_id", jobId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_jobs")
          .insert({ driver_id: driverId, job_id: jobId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    savedIds,
    isLoading,
    isSaved: (id: string) => savedIds.includes(id),
    toggle: (jobId: string) => toggleMutation.mutateAsync(jobId),
  };
}
