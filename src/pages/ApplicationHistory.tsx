import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth";

interface Application {
  id: string;
  companyName: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driverType: string;
  licenseClass: string;
  yearsExp: string;
  licenseState: string;
  notes?: string;
}

const ApplicationHistory = () => {
  const { user } = useAuth();
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["driver-applications-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("driver_id", user!.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row): Application => ({
        id: row.id as string,
        companyName: (row.company_name ?? "") as string,
        submittedAt: (row.submitted_at ?? "") as string,
        firstName: (row.first_name ?? "") as string,
        lastName: (row.last_name ?? "") as string,
        email: (row.email ?? "") as string,
        phone: (row.phone ?? "") as string,
        driverType: (row.driver_type ?? "") as string,
        licenseClass: (row.license_class ?? "") as string,
        yearsExp: (row.years_exp ?? "") as string,
        licenseState: (row.license_state ?? "") as string,
        notes: row.notes as string | undefined,
      }));
    },
    enabled: !!user?.id,
  });

  const [expanded, setExpanded] = useState<string | null>(null);

  const driverTypeLabel: Record<string, string> = {
    company: "Company Driver",
    "owner-operator": "Owner Operator",
    lease: "Lease Operator",
    student: "Student / Trainee",
  };
  const licenseLabel: Record<string, string> = {
    a: "Class A", b: "Class B", c: "Class C", permit: "Permit Only",
  };
  const expLabel: Record<string, string> = {
    none: "None", "less-1": "< 1 year", "1-3": "1–3 years", "3-5": "3–5 years", "5+": "5+ years",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 max-w-4xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          My Applications
        </p>

        <div className="flex items-center gap-3 mb-6 border-l-4 border-primary pl-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">My Applications</h1>
          <span className="text-sm text-muted-foreground">({applications.length})</span>
        </div>

        {isLoading ? (
          <div className="border border-border bg-card p-12 text-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : applications.length === 0 ? (
          <div className="border border-border bg-card p-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No applications yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Submit your first application to get matched with top carriers.
            </p>
            <Button asChild>
              <Link to="/apply">Apply Now</Link>
            </Button>
          </div>
        ) : (
          <div className="border border-border bg-card divide-y divide-border">
            {applications.map((app) => {
              const isOpen = expanded === app.id;
              return (
                <div key={app.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{app.companyName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submitted {new Date(app.submittedAt).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1.5">
                        {app.driverType && <span>{driverTypeLabel[app.driverType] ?? app.driverType}</span>}
                        {app.licenseClass && <span>{licenseLabel[app.licenseClass] ?? app.licenseClass}</span>}
                        {app.yearsExp && <span>{expLabel[app.yearsExp] ?? app.yearsExp} exp</span>}
                        {app.licenseState && <span>{app.licenseState}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpanded(isOpen ? null : app.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:opacity-80 shrink-0"
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isOpen ? "Hide" : "Details"}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        <span className="font-medium">{app.firstName} {app.lastName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email: </span>
                        <span className="font-medium">{app.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone: </span>
                        <span className="font-medium">{app.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">License State: </span>
                        <span className="font-medium">{app.licenseState}</span>
                      </div>
                      {app.notes && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground">Notes: </span>
                          <span className="font-medium">{app.notes}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ApplicationHistory;
