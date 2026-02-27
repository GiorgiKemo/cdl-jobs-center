import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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

export function useDriverProfile(driverId: string) {
  const qc = useQueryClient();
  const key = ["driver_profile", driverId];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_profiles")
        .select("*")
        .eq("id", driverId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
        phone: data.phone ?? "",
        cdlNumber: data.cdl_number ?? "",
        licenseClass: data.license_class ?? "",
        yearsExp: data.years_exp ?? "",
        licenseState: data.license_state ?? "",
        about: data.about ?? "",
      } as DriverProfile;
    },
    enabled: !!driverId,
  });

  const saveMutation = useMutation({
    mutationFn: async (profile: DriverProfile) => {
      const { error } = await supabase.from("driver_profiles").upsert({
        id: driverId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        cdl_number: profile.cdlNumber,
        license_class: profile.licenseClass,
        years_exp: profile.yearsExp,
        license_state: profile.licenseState,
        about: profile.about,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    profile: data ?? null,
    isLoading,
    saveProfile: (p: DriverProfile) => saveMutation.mutateAsync(p),
  };
}
