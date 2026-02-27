import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Heart, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const DRIVER_TYPES = ["All", "Company Driver", "Owner Operator", "Lease Purchase", "Team Driver"];
const LICENSE_CLASSES = ["All", "Class A", "Class B", "Class C"];
const EXPERIENCE_OPTIONS = ["All", "Less than 1 year", "1-2 years", "2-5 years", "5-10 years", "10+ years"];
const LICENSE_STATES = [
  "All", "Alabama", "Arizona", "California", "Colorado", "Delaware",
  "Florida", "Georgia", "Illinois", "Indiana", "Michigan", "New Jersey",
  "New York", "Ohio", "Pennsylvania", "Tennessee", "Texas", "Virginia",
];

interface Driver {
  id: number;
  name: string;
  type: string;
  licenseClass: string;
  experience: string;
  state: string;
  doubles: string;
  hazmat: string;
  tank: string;
  tankerHazmat: string;
}

const mockDrivers: Driver[] = [
  { id: 1, name: "Vladislav Vitalievich", type: "Owner Operator", licenseClass: "Class A", experience: "2-5 years", state: "Delaware", doubles: "Yes", hazmat: "Yes", tank: "Yes", tankerHazmat: "No" },
  { id: 2, name: "James R. Mitchell", type: "Company Driver", licenseClass: "Class A", experience: "5-10 years", state: "Texas", doubles: "Yes", hazmat: "No", tank: "No", tankerHazmat: "No" },
  { id: 3, name: "Carlos Mendez", type: "Lease Purchase", licenseClass: "Class A", experience: "2-5 years", state: "Florida", doubles: "No", hazmat: "Yes", tank: "Yes", tankerHazmat: "Yes" },
  { id: 4, name: "David L. Patterson", type: "Team Driver", licenseClass: "Class A", experience: "10+ years", state: "Illinois", doubles: "Yes", hazmat: "Yes", tank: "No", tankerHazmat: "No" },
  { id: 5, name: "Michael T. Brown", type: "Company Driver", licenseClass: "Class B", experience: "1-2 years", state: "Georgia", doubles: "No", hazmat: "No", tank: "No", tankerHazmat: "No" },
  { id: 6, name: "Kevin S. Thompson", type: "Owner Operator", licenseClass: "Class A", experience: "10+ years", state: "California", doubles: "Yes", hazmat: "Yes", tank: "Yes", tankerHazmat: "Yes" },
  { id: 7, name: "Robert A. Garcia", type: "Company Driver", licenseClass: "Class A", experience: "2-5 years", state: "Ohio", doubles: "No", hazmat: "No", tank: "Yes", tankerHazmat: "No" },
  { id: 8, name: "Anthony J. Williams", type: "Lease Purchase", licenseClass: "Class A", experience: "Less than 1 year", state: "Pennsylvania", doubles: "No", hazmat: "No", tank: "No", tankerHazmat: "No" },
];

const Drivers = () => {
  const { user } = useAuth();

  const [typeFilter, setTypeFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [expFilter, setExpFilter] = useState("All");
  const [stateFilter, setStateFilter] = useState("All");
  const [favorites, setFavorites] = useState<number[]>([]);

  const handleClear = () => {
    setTypeFilter("All");
    setClassFilter("All");
    setExpFilter("All");
    setStateFilter("All");
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const filtered = mockDrivers.filter((d) => {
    if (typeFilter !== "All" && d.type !== typeFilter) return false;
    if (classFilter !== "All" && d.licenseClass !== classFilter) return false;
    if (expFilter !== "All" && d.experience !== expFilter) return false;
    if (stateFilter !== "All" && d.state !== stateFilter) return false;
    return true;
  });

  // Access gate — company accounts only
  if (!user || user.role !== "company") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-8 max-w-3xl">
          <p className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="text-primary hover:underline">Main</Link>
            <span className="mx-1">»</span>
            Drivers
          </p>
          <div className="border border-border bg-card">
            <div className="border-l-4 border-l-primary border-b border-b-border px-5 py-4">
              <h1 className="font-display font-bold text-xl">Driver Directory</h1>
              <p className="text-sm text-muted-foreground mt-1">Browse CDL driver profiles</p>
            </div>
            <div className="px-5 py-12 flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-display font-semibold text-lg">Company Access Only</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  The driver directory is available exclusively to verified company accounts.
                  Sign in or register as a company to browse driver profiles.
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <Button asChild>
                  <Link to="/">Sign In as Company</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/apply">Apply as Driver</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          Drivers
        </p>

        {/* Filter box */}
        <div className="bg-foreground text-background dark:bg-muted dark:text-foreground border border-border mb-6">
          <div className="px-5 py-3 border-b border-white/10 dark:border-border">
            <h1 className="font-display font-bold text-base">Filter drivers</h1>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide opacity-70 block mb-1.5">Driver Type:</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-background/10 border-white/20 dark:bg-background dark:border-border text-inherit">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DRIVER_TYPES.map((o) => <SelectItem key={o} value={o}>{o === "All" ? "Choose an option..." : o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide opacity-70 block mb-1.5">License Class:</label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="bg-background/10 border-white/20 dark:bg-background dark:border-border text-inherit">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSE_CLASSES.map((o) => <SelectItem key={o} value={o}>{o === "All" ? "Choose an option..." : o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide opacity-70 block mb-1.5">Years Experience:</label>
                <Select value={expFilter} onValueChange={setExpFilter}>
                  <SelectTrigger className="bg-background/10 border-white/20 dark:bg-background dark:border-border text-inherit">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o === "All" ? "Choose an option..." : o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide opacity-70 block mb-1.5">License State:</label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="bg-background/10 border-white/20 dark:bg-background dark:border-border text-inherit">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSE_STATES.map((o) => <SelectItem key={o} value={o}>{o === "All" ? "Choose an option..." : o}</SelectItem>)}
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
              Drivers <span className="text-muted-foreground font-normal text-sm ml-1">({filtered.length} found)</span>
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-muted-foreground text-sm">
              No drivers match the selected filters.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((driver) => (
                <div key={driver.id} className="px-5 py-5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <button
                      className="font-display font-semibold text-primary hover:underline text-left"
                      onClick={() => toast.info("Driver profile coming soon.")}
                    >
                      {driver.name}
                    </button>
                    <button
                      onClick={() => toggleFavorite(driver.id)}
                      aria-label={favorites.includes(driver.id) ? "Remove from favorites" : "Add to favorites"}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Heart
                        className="h-5 w-5"
                        fill={favorites.includes(driver.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-sm mb-4">
                    <p className="text-muted-foreground">
                      Driver Type: <span className="text-primary font-medium">{driver.type}</span>
                    </p>
                    <p className="text-muted-foreground">
                      License Class: <span className="text-primary font-medium">{driver.licenseClass}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Years Experience: <span className="text-primary font-medium">{driver.experience}</span>
                    </p>
                    <p className="text-muted-foreground">
                      License State: <span className="text-primary font-medium">{driver.state}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Doubles/Triples (T): <span className="text-primary font-medium">{driver.doubles}</span>
                    </p>
                    <p className="text-muted-foreground">
                      HAZMAT (H): <span className="text-primary font-medium">{driver.hazmat}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Tank Vehicles (N): <span className="text-primary font-medium">{driver.tank}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Tanker + HAZMAT (X): <span className="text-primary font-medium">{driver.tankerHazmat}</span>
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 text-xs"
                    onClick={() => toast.info("Driver profile coming soon.")}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    More information...
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

export default Drivers;
