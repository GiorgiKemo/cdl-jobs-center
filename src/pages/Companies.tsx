import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MapPin, CheckCircle, Building2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface CompanyRow {
  id: string;
  company_name: string;
  phone: string;
  address: string;
  email: string;
  website: string | null;
  about: string | null;
  logo_url: string | null;
}

const COMPANY_STATES = [
  "All",
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const Companies = () => {
  const [stateFilter, setStateFilter] = useState("All");

  const {
    data: companies = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["companies-directory-v2"],
    networkMode: "always",
    retry: 2,
    refetchOnMount: "always",
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutMs = 12000;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          supabase
            .from("company_profiles")
            .select("id, company_name, phone, address, email, website, about, logo_url")
            .abortSignal(controller.signal)
            .order("company_name"),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              controller.abort();
              reject(new Error("Loading companies timed out. Please try again."));
            }, timeoutMs);
          }),
        ]);

        const { data, error } = result;

        if (error) throw error;
        return (data ?? []) as CompanyRow[];
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    },
  });

  const handleClear = () => {
    setStateFilter("All");
  };

  // Simple address-based state filter
  const filtered = companies.filter((c) => {
    if (stateFilter !== "All" && !c.address?.includes(stateFilter)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">
            Main
          </Link>
          <span className="mx-1">»</span>
          Companies
        </p>

        {/* Filter box */}
        <div className="bg-foreground text-background dark:bg-muted dark:text-foreground border border-border mb-6">
          <div className="px-5 py-3 border-b border-white/10 dark:border-border">
            <h1 className="font-display font-bold text-base">
              Filter Companies
            </h1>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide opacity-70 block mb-1.5">
                  Company State:
                </label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="bg-background/10 border-white/20 dark:bg-background dark:border-border text-inherit">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_STATES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o === "All" ? "Choose an option..." : o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClear}
                className="border-cdl-amber text-cdl-amber hover:bg-cdl-amber/10 dark:border-cdl-amber dark:text-cdl-amber"
              >
                Clear filter
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="border border-border bg-card">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="w-1 h-5 bg-primary shrink-0" />
            <h2 className="font-display font-bold text-base">
              Companies{" "}
              <span className="text-muted-foreground font-normal text-sm ml-1">
                ({filtered.length} found)
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="px-5 py-12 text-center text-muted-foreground text-sm">
              Loading companies...
            </div>
          ) : isError ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-destructive mb-3">
                {error instanceof Error ? error.message : "Failed to load companies."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-muted-foreground text-sm">
              No companies match the selected filters.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-5 px-5 py-5 border-l-2 border-l-primary hover:bg-muted/20 transition-colors"
                >
                  {/* Logo */}
                  <div className="shrink-0 flex flex-col items-center gap-2 w-24">
                    {c.logo_url ? (
                      <img
                        src={c.logo_url}
                        alt={c.company_name}
                        className="h-20 w-20 object-contain border border-border bg-white"
                      />
                    ) : (
                      <div className="h-20 w-20 bg-muted flex items-center justify-center font-display text-3xl font-bold text-primary border border-border">
                        {c.company_name?.charAt(0) || <Building2 className="h-8 w-8" />}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/companies/${c.id}`}
                      className="font-display font-semibold text-primary hover:underline text-left mb-1.5 block"
                    >
                      {c.company_name}
                    </Link>
                    {c.phone && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                        <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {c.phone}
                      </p>
                    )}
                    {c.address && (
                      <p className="flex items-start gap-1.5 text-sm text-muted-foreground mb-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                        {c.address}
                      </p>
                    )}
                    {c.website && (
                      <a
                        href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {c.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 text-xs font-medium">
                      <CheckCircle className="h-3 w-3" aria-hidden="true" />{" "}
                      VERIFIED COMPANY
                    </span>
                  </div>

                  {/* Action */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    asChild
                  >
                    <Link to={`/companies/${c.id}`}>View Profile</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Companies;
