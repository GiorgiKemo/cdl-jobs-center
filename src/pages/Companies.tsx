import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MapPin, Star, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const DRIVER_TYPES = ["All", "Owner Operator", "Company Driver", "Student"];
const FREIGHT_TYPES = [
  "All", "Dry Van", "Flatbed", "Refrigerated", "Tanker", "Dry Bulk",
  "LTL", "Intermodal", "Hazmat", "Oversized/Heavy Haul", "Auto Transport",
  "Livestock", "Logging", "Dump Truck", "Pneumatic Tanker",
];
const COMPANY_STATES = [
  "All",
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

interface Company {
  id: number;
  name: string;
  state: string;
  phone: string;
  address: string;
  rating: number;
  driverTypes: string[];
  freightTypes: string[];
}

const companies: Company[] = [
  {
    id: 1, name: "GI Super Service", state: "Illinois",
    phone: "(847) 718-1330", address: "2256 Landmeier Rd Suite B, Elk Grove Village, IL 60007",
    rating: 5, driverTypes: ["Company Driver", "Owner Operator"], freightTypes: ["Dry Van", "Refrigerated"],
  },
  {
    id: 2, name: "United Global Carrier", state: "Illinois",
    phone: "(773) 627-5960", address: "1338 South Loraine Rd Unit D, Wheaton, IL 60189",
    rating: 5, driverTypes: ["Company Driver", "Lease Purchase"], freightTypes: ["Flatbed", "Dry Van"],
  },
  {
    id: 3, name: "PKD Express", state: "California",
    phone: "(310) 555-0192", address: "4820 Pacific Coast Hwy, Long Beach, CA 90804",
    rating: 5, driverTypes: ["Company Driver", "Owner Operator"], freightTypes: ["Tanker"],
  },
  {
    id: 4, name: "AN Enterprise Inc", state: "Florida",
    phone: "(305) 555-0138", address: "8740 NW 36th St, Doral, FL 33166",
    rating: 5, driverTypes: ["Team Driver", "Company Driver"], freightTypes: ["Dry Van", "Dry Bulk"],
  },
];

const Companies = () => {
  const [driverTypeFilter, setDriverTypeFilter] = useState("All");
  const [freightTypeFilter, setFreightTypeFilter] = useState("All");
  const [stateFilter, setStateFilter] = useState("All");

  const handleClear = () => {
    setDriverTypeFilter("All");
    setFreightTypeFilter("All");
    setStateFilter("All");
  };

  const filtered = companies.filter((c) => {
    if (driverTypeFilter !== "All" && !c.driverTypes.includes(driverTypeFilter)) return false;
    if (freightTypeFilter !== "All" && !c.freightTypes.includes(freightTypeFilter)) return false;
    if (stateFilter !== "All" && c.state !== stateFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          Companies
        </p>

        {/* Filter box */}
        <div className="bg-foreground text-background dark:bg-muted dark:text-foreground border border-border mb-6">
          <div className="px-5 py-3 border-b border-white/10 dark:border-border">
            <h1 className="font-display font-bold text-base">Filter Companies</h1>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide opacity-70 block mb-1.5">Driver Type:</label>
                <Select value={driverTypeFilter} onValueChange={setDriverTypeFilter}>
                  <SelectTrigger className="bg-background/10 border-white/20 dark:bg-background dark:border-border text-inherit">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DRIVER_TYPES.map((o) => <SelectItem key={o} value={o}>{o === "All" ? "Choose an option..." : o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide opacity-70 block mb-1.5">Freight Type:</label>
                <Select value={freightTypeFilter} onValueChange={setFreightTypeFilter}>
                  <SelectTrigger className="bg-background/10 border-white/20 dark:bg-background dark:border-border text-inherit">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FREIGHT_TYPES.map((o) => <SelectItem key={o} value={o}>{o === "All" ? "Choose an option..." : o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide opacity-70 block mb-1.5">Company State:</label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="bg-background/10 border-white/20 dark:bg-background dark:border-border text-inherit">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_STATES.map((o) => <SelectItem key={o} value={o}>{o === "All" ? "Choose an option..." : o}</SelectItem>)}
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
              Companies <span className="text-muted-foreground font-normal text-sm ml-1">({filtered.length} found)</span>
            </h2>
          </div>

          {filtered.length === 0 ? (
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
                  {/* Logo + stars */}
                  <div className="shrink-0 flex flex-col items-center gap-2 w-24">
                    <div className="h-20 w-20 bg-muted flex items-center justify-center font-display text-3xl font-bold text-primary border border-border">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: c.rating }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-cdl-amber text-cdl-amber" />
                      ))}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <button
                      className="font-display font-semibold text-primary hover:underline text-left mb-1.5"
                      onClick={() => toast.info("Company profile coming soon.")}
                    >
                      {c.name}
                    </button>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {c.phone}
                    </p>
                    <p className="flex items-start gap-1.5 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                      {c.address}
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 text-xs font-medium">
                      <CheckCircle className="h-3 w-3" aria-hidden="true" /> VERIFIED COMPANY
                    </span>
                  </div>

                  {/* Action */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => toast.info("Company profile coming soon.")}
                  >
                    View Profile
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
