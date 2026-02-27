import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useParams } from "react-router-dom";
import { User, MapPin, Award, Truck } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const LICENSE_CLASS_LABELS: Record<string, string> = {
  a: "Class A",
  b: "Class B",
  c: "Class C",
  permit: "Permit Only",
};

const YEARS_EXP_LABELS: Record<string, string> = {
  none: "None",
  "less-1": "Less than 1 year",
  "1-2": "1-2 years",
  "1-3": "1-3 years",
  "2-5": "2-5 years",
  "3-5": "3-5 years",
  "5-10": "5-10 years",
  "5+": "10+ years",
  "10+": "10+ years",
};

type DriverRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  license_class: string | null;
  years_exp: string | null;
  license_state: string | null;
  about: string | null;
};

const DriverProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: driver, isLoading, isError, error } = useQuery({
    queryKey: ["driver-profile-public", id],
    enabled: !!id && !!user && user.role === "company",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_profiles")
        .select("id, first_name, last_name, license_class, years_exp, license_state, about")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as DriverRow;
      const fullName = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();

      return {
        id: row.id,
        name: fullName || "Unnamed Driver",
        licenseClass: LICENSE_CLASS_LABELS[row.license_class ?? ""] ?? "Not specified",
        experience: YEARS_EXP_LABELS[row.years_exp ?? ""] ?? "Not specified",
        state: row.license_state ?? "Not specified",
        about: row.about ?? "",
      };
    },
  });

  if (!user || user.role !== "company") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-8 max-w-3xl text-center">
          <p className="text-muted-foreground">Company access required.</p>
          <Button className="mt-4" asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-8 max-w-3xl text-center">
          <p className="text-muted-foreground">Loading driver profile...</p>
          <Button className="mt-4" onClick={() => navigate("/drivers")}>
            Back to Drivers
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-8 max-w-3xl text-center">
          <p className="text-destructive">{(error as Error).message || "Failed to load driver profile."}</p>
          <Button className="mt-4" onClick={() => navigate("/drivers")}>
            Back to Drivers
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-8 max-w-3xl text-center">
          <p className="text-muted-foreground">Driver not found.</p>
          <Button className="mt-4" onClick={() => navigate("/drivers")}>
            Back to Drivers
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 max-w-3xl">
        <p className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="text-primary hover:underline">
            Main
          </Link>
          <span className="mx-1">&gt;</span>
          <Link to="/drivers" className="text-primary hover:underline">
            Drivers
          </Link>
          <span className="mx-1">&gt;</span>
          {driver.name}
        </p>

        <div className="border border-border bg-card mb-4">
          <div className="bg-foreground text-background dark:bg-muted dark:text-foreground px-6 py-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">{driver.name}</h1>
              <p className="text-sm opacity-70 mt-0.5">CDL Driver | {driver.licenseClass}</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">License State</p>
                  <p className="font-medium text-sm">{driver.state}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="font-medium text-sm">{driver.experience}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Award className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">License Class</p>
                  <p className="font-medium text-sm">{driver.licenseClass}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground mb-3 border-l-4 border-primary pl-3">About</p>
              <p className="text-sm text-muted-foreground">{driver.about || "No profile summary provided yet."}</p>
            </div>

            <div className="border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Direct messaging is not available. Company and driver communication is handled through application notes only.
            </div>

            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => navigate("/drivers")}>
                Back to Directory
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DriverProfile;
