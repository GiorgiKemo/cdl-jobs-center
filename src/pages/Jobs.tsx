import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useSearchParams } from "react-router-dom";
import { Truck } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { SEED_JOBS } from "@/data/jobs";
import { useJobs } from "@/hooks/useJobs";

const urlTypeMap: Record<string, string> = {
  "dry-van": "Dry Van",
  "flatbed": "Flatbed",
  "dry-bulk": "Dry Bulk",
  "refrigerated": "Refrigerated",
  "tanker": "Tanker",
  "teams": "Teams",
  "owner-operator": "Owner Operator",
  "students": "Students",
};

const Jobs = () => {
  const [searchParams] = useSearchParams();
  const { loadAll } = useJobs();
  const allJobs = useMemo(() => [
    ...SEED_JOBS,
    ...loadAll().filter((j) => !j.status || j.status === "Active"),
  ], []);

  // Pending filter values (before Search is clicked)
  const [pendingFreight, setPendingFreight] = useState("all");
  const [pendingDriver, setPendingDriver] = useState("all");
  const [pendingRoute, setPendingRoute] = useState("all");
  const [pendingTeam, setPendingTeam] = useState("all");

  // Applied filter values (after Search is clicked)
  const [freightType, setFreightType] = useState("all");
  const [driverType, setDriverType] = useState("all");
  const [routeType, setRouteType] = useState("all");
  const [teamDriving, setTeamDriving] = useState("all");

  // Sync freight type from URL param on load/navigation
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const mapped = typeParam && urlTypeMap[typeParam] ? urlTypeMap[typeParam] : "all";
    setPendingFreight(mapped);
    setFreightType(mapped);
  }, [searchParams]);

  const applyFilters = () => {
    setFreightType(pendingFreight);
    setDriverType(pendingDriver);
    setRouteType(pendingRoute);
    setTeamDriving(pendingTeam);
  };

  const clearFilters = () => {
    setPendingFreight("all");
    setPendingDriver("all");
    setPendingRoute("all");
    setPendingTeam("all");
    setFreightType("all");
    setDriverType("all");
    setRouteType("all");
    setTeamDriving("all");
  };

  const filtered = allJobs.filter((j) => {
    const matchesFreight = freightType === "all" || j.type === freightType;
    const matchesDriver = driverType === "all" || j.driverType === driverType;
    const matchesRoute = routeType === "all" || j.routeType === routeType;
    const matchesTeam = teamDriving === "all" || j.teamDriving === teamDriving;
    return matchesFreight && matchesDriver && matchesRoute && matchesTeam;
  });

  const pageTitle = freightType !== "all" ? freightType : "All Jobs";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto py-6">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          <Link to="/jobs" className="text-primary hover:underline">jobs</Link>
          {freightType !== "all" && (
            <>
              <span className="mx-1">»</span>
              <span>{freightType}</span>
            </>
          )}
        </p>

        {/* Page title */}
        <div className="flex items-center gap-3 mb-6 border-l-4 border-primary pl-3">
          <h1 className="font-display text-2xl font-bold">{pageTitle}</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar filter */}
          <div className="w-full lg:w-72 shrink-0 border border-border">
            <div className="bg-foreground text-background dark:bg-muted dark:text-foreground px-4 py-3 border-l-4 border-primary">
              <p className="font-semibold text-sm">Filter jobs</p>
            </div>
            <div className="p-4 space-y-4">
              {/* Driver Type */}
              <div>
                <label className="text-sm text-primary font-medium block mb-1">Driver Type:</label>
                <Select value={pendingDriver} onValueChange={setPendingDriver}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Choose an option...</SelectItem>
                    <SelectItem value="Owner Operator">Owner Operator</SelectItem>
                    <SelectItem value="Company Driver">Company Driver</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Freight Type */}
              <div>
                <label className="text-sm text-primary font-medium block mb-1">Freight Type:</label>
                <Select value={pendingFreight} onValueChange={setPendingFreight}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Choose an option...</SelectItem>
                    <SelectItem value="Box">Box</SelectItem>
                    <SelectItem value="Car Hauler">Car Hauler</SelectItem>
                    <SelectItem value="Drop and Hook">Drop and Hook</SelectItem>
                    <SelectItem value="Dry Bulk">Dry Bulk</SelectItem>
                    <SelectItem value="Dry Van">Dry Van</SelectItem>
                    <SelectItem value="Flatbed">Flatbed</SelectItem>
                    <SelectItem value="Hopper Bottom">Hopper Bottom</SelectItem>
                    <SelectItem value="Intermodal">Intermodal</SelectItem>
                    <SelectItem value="Oil Field">Oil Field</SelectItem>
                    <SelectItem value="Oversize Load">Oversize Load</SelectItem>
                    <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                    <SelectItem value="Tanker">Tanker</SelectItem>
                    <SelectItem value="Yard Spotter">Yard Spotter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Route Type */}
              <div>
                <label className="text-sm text-primary font-medium block mb-1">Route Type:</label>
                <Select value={pendingRoute} onValueChange={setPendingRoute}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Choose an option...</SelectItem>
                    <SelectItem value="Dedicated">Dedicated</SelectItem>
                    <SelectItem value="Local">Local</SelectItem>
                    <SelectItem value="LTL">LTL</SelectItem>
                    <SelectItem value="OTR">OTR</SelectItem>
                    <SelectItem value="Regional">Regional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Team Driving */}
              <div>
                <label className="text-sm text-primary font-medium block mb-1">Team Driving:</label>
                <Select value={pendingTeam} onValueChange={setPendingTeam}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Choose an option...</SelectItem>
                    <SelectItem value="Solo">Solo</SelectItem>
                    <SelectItem value="Team">Team</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <Button onClick={applyFilters} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  Search
                </Button>
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="flex-1 bg-amber-400 hover:bg-amber-500 text-black border-amber-400 hover:border-amber-500"
                >
                  Clear filter
                </Button>
              </div>
            </div>
          </div>

          {/* Job listings */}
          <div className="flex-1 space-y-4">
            {filtered.length > 0 ? (
              filtered.map((job) => (
                <div key={job.id} className="border border-border bg-card p-5 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display font-semibold text-lg text-primary mb-1">{job.company}</h2>
                    <hr className="border-border mb-3" />
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{job.description}</p>
                  </div>
                  <div className="flex flex-col items-stretch gap-3 shrink-0 w-36">
                    <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                      <Link to={`/jobs/${job.id}`}>View Job</Link>
                    </Button>
                    <div className="h-14 w-full border border-border flex items-center justify-center bg-muted/30">
                      <Truck className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="border border-border bg-card p-12 text-center">
                <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No jobs match your filters.</p>
                <button onClick={clearFilters} className="mt-3 text-primary text-sm underline hover:opacity-80">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Jobs;
