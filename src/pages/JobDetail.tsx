import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, ExternalLink, Truck } from "lucide-react";
import { SEED_JOBS } from "@/data/jobs";
import { useJobs } from "@/hooks/useJobs";
import { COMPANIES } from "@/data/companies";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { ApplyModal } from "@/components/ApplyModal";
import { SignInModal } from "@/components/SignInModal";
import { toast } from "sonner";

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadAll } = useJobs();
  const [applyOpen, setApplyOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const allJobs = [...SEED_JOBS, ...loadAll()];
  const job = allJobs.find((j) => j.id === id);

  if (!job) {
    toast.error("Job not found.");
    navigate("/jobs");
    return null;
  }

  const company = COMPANIES.find(
    (c) => c.name.toLowerCase() === job.company.toLowerCase()
  );

  // Load company logo from the shared logos map saved via dashboard
  const logos: Record<string, string> = (() => {
    try { return JSON.parse(localStorage.getItem("cdl-company-logos") ?? "{}"); }
    catch { return {}; }
  })();
  const companyLogo = logos[job.company];

  const handleApplyClick = () => {
    if (!user) {
      setSignInOpen(true);
    } else if (user.role === "company") {
      toast.info("Company accounts cannot submit driver applications.");
    } else {
      setApplyOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8 max-w-4xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          <Link to="/jobs" className="text-primary hover:underline">jobs</Link>
          <span className="mx-1">»</span>
          {job.title}
        </p>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4 border-l-4 border-primary pl-3">
          <h1 className="font-display text-2xl font-bold">{job.title}</h1>
        </div>

        {/* Header card */}
        <div className="border border-border bg-card p-5 mb-4">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Logo */}
            <div className="shrink-0 h-20 w-20 bg-muted flex items-center justify-center font-display text-3xl font-bold text-primary border border-border overflow-hidden">
              {companyLogo ? (
                <img src={companyLogo} alt={job.company} className="h-full w-full object-contain p-1" />
              ) : company ? (
                <span>{company.name.charAt(0)}</span>
              ) : (
                <Truck className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {/* Company info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-primary text-lg mb-2">
                {job.company}
              </h2>
              {company?.phone && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  {company.phone}
                </p>
              )}
              {company?.address && (
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
                  {company.address}
                </p>
              )}
              {company?.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Visit Company Website
                </a>
              )}
            </div>

            {/* Apply button */}
            <div className="shrink-0">
              <Button onClick={handleApplyClick} size="lg">
                Submit an Application
              </Button>
            </div>
          </div>
        </div>

        {/* Job details bar */}
        <div className="border border-border bg-card p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Driver Type</span>
            <span className="font-medium text-primary">{job.driverType || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Freight Type</span>
            <span className="font-medium text-primary">{job.type || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Route Type</span>
            <span className="font-medium text-primary">{job.routeType || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Team Driving</span>
            <span className="font-medium text-primary">{job.teamDriving || "—"}</span>
          </div>
        </div>

        {/* Pay + location bar */}
        <div className="border border-border bg-card p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Location</span>
            <span className="font-medium">{job.location || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Pay</span>
            <span className="font-medium text-green-600 dark:text-green-400">{job.pay || "—"}</span>
          </div>
        </div>

        {/* Description */}
        <div className="border border-border bg-card p-5 mb-4">
          <h3 className="font-display font-semibold text-base mb-3">Job Description</h3>
          <hr className="border-primary/20 mb-4" />
          <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>
        </div>

        {/* Info panel for guests / company users */}
        {(!user || user.role !== "driver") && (
          <div className="border border-border bg-blue-50/50 dark:bg-blue-950/20 p-5">
            <h3 className="font-semibold text-sm mb-2">Information</h3>
            {!user ? (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  <strong className="text-foreground">Guests</strong> are not allowed to submit applications.
                </p>
                <Button size="sm" onClick={() => setSignInOpen(true)}>Sign in</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Company accounts cannot submit driver applications.</p>
            )}
          </div>
        )}
      </main>
      <Footer />

      {applyOpen && (
        <ApplyModal companyName={job.company} onClose={() => setApplyOpen(false)} />
      )}
      {signInOpen && (
        <SignInModal onClose={() => setSignInOpen(false)} />
      )}
    </div>
  );
};

export default JobDetail;
