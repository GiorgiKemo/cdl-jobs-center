import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, DollarSign, Truck, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

const jobListings = [
  { id: 1, title: "OTR Dry Van Driver", company: "GI Super Service", location: "Illinois", pay: "$0.60-0.70/mile", type: "Dry Van", experience: "1+ years" },
  { id: 2, title: "Regional Flatbed Driver", company: "United Global Carrier", location: "Texas", pay: "$1,400-1,800/week", type: "Flatbed", experience: "2+ years" },
  { id: 3, title: "Local Tanker Driver", company: "PKD Express", location: "California", pay: "$75,000-90,000/year", type: "Tanker", experience: "3+ years" },
  { id: 4, title: "Refrigerated Solo Driver", company: "AN Enterprise Inc", location: "Florida", pay: "$0.65-0.75/mile", type: "Refrigerated", experience: "1+ years" },
  { id: 5, title: "Owner Operator - Dry Van", company: "GI Super Service", location: "Nationwide", pay: "85% of load", type: "Owner Operator", experience: "2+ years" },
  { id: 6, title: "Student Driver Program", company: "United Global Carrier", location: "Multiple States", pay: "$600-800/week training", type: "Students", experience: "No experience" },
  { id: 7, title: "Dry Bulk Hauler", company: "PKD Express", location: "Texas", pay: "$1,200-1,600/week", type: "Dry Bulk", experience: "1+ years" },
  { id: 8, title: "Team Driver - Long Haul", company: "AN Enterprise Inc", location: "Nationwide", pay: "$0.70-0.80/mile split", type: "Teams", experience: "1+ years" },
];

// Maps URL ?type= param values → job type strings in jobListings
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
  const [search, setSearch] = useState("");
  const [freightType, setFreightType] = useState("all");
  const [state, setState] = useState("all");

  // Sync freight type filter whenever the URL ?type= param changes
  useEffect(() => {
    const typeParam = searchParams.get("type");
    setFreightType(typeParam && urlTypeMap[typeParam] ? urlTypeMap[typeParam] : "all");
  }, [searchParams]);

  const filtered = jobListings.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase());
    const matchesType = freightType === "all" || j.type === freightType;
    const matchesState =
      state === "all" || j.location.toLowerCase().includes(state.toLowerCase());
    return matchesSearch && matchesType && matchesState;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-20 bg-secondary">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto">
            <span className="text-primary font-medium text-sm uppercase tracking-widest">Opportunities</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-secondary-foreground mt-3 mb-4">
              Browse <span className="text-gradient">CDL Jobs</span>
            </h1>
            <p className="text-muted-foreground text-lg">Find the perfect driving position for your career.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto">
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 mb-8 flex flex-col md:flex-row gap-4"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs or companies..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={freightType} onValueChange={setFreightType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Freight Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Dry Van">Dry Van</SelectItem>
                <SelectItem value="Flatbed">Flatbed</SelectItem>
                <SelectItem value="Dry Bulk">Dry Bulk</SelectItem>
                <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                <SelectItem value="Tanker">Tanker</SelectItem>
                <SelectItem value="Teams">Teams driving</SelectItem>
                <SelectItem value="Owner Operator">Owner Operator</SelectItem>
                <SelectItem value="Students">Students</SelectItem>
              </SelectContent>
            </Select>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="Illinois">Illinois</SelectItem>
                <SelectItem value="Texas">Texas</SelectItem>
                <SelectItem value="California">California</SelectItem>
                <SelectItem value="Florida">Florida</SelectItem>
                <SelectItem value="Nationwide">Nationwide</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Job Cards */}
          {filtered.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {filtered.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="glass rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">{job.title}</h3>
                      <p className="text-muted-foreground">{job.company}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{job.type}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{job.pay}</span>
                    <span className="flex items-center gap-1"><Truck className="h-4 w-4" />{job.experience}</span>
                  </div>
                  <Button size="sm" className="group/btn" asChild>
                    <Link to="/apply">
                      Apply Now
                      <ArrowRight className="ml-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg font-medium">No jobs match your filters.</p>
              <button
                onClick={() => { setSearch(""); setFreightType("all"); setState("all"); }}
                className="mt-4 text-primary text-sm underline hover:opacity-80 transition-opacity"
              >
                Clear all filters
              </button>
            </motion.div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Jobs;
