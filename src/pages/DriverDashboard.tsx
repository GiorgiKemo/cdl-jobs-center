import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { useActiveJobs } from "@/hooks/useJobs";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useDriverProfile, DriverProfile } from "@/hooks/useDriverProfile";
import { Truck, Briefcase, Bookmark, User, BarChart3, ChevronDown, ChevronUp, MapPin, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

type Tab = "overview" | "applications" | "saved" | "profile";
type PipelineStage = "New" | "Reviewing" | "Interview" | "Hired" | "Rejected";

interface StoredApplication {
  id: string;
  companyName: string;
  jobTitle?: string | null;
  jobId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driverType: string;
  licenseClass: string;
  yearsExp: string;
  licenseState: string;
  notes?: string;
  submittedAt: string;
  pipeline_stage: PipelineStage;
}

// Map Supabase row → StoredApplication
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToApp(row: Record<string, any>): StoredApplication {
  return {
    id: row.id,
    companyName: row.company_name ?? "",
    jobTitle: row.job_title ?? null,
    jobId: row.job_id ?? null,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    driverType: row.driver_type ?? "",
    licenseClass: row.license_class ?? "",
    yearsExp: row.years_exp ?? "",
    licenseState: row.license_state ?? "",
    notes: row.notes ?? "",
    submittedAt: row.submitted_at ?? "",
    pipeline_stage: (row.pipeline_stage ?? "New") as PipelineStage,
  };
}

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const LICENSE_CLASS_LABELS: Record<string, string> = { a: "Class A", b: "Class B", c: "Class C", permit: "Permit Only" };
const YEARS_EXP_LABELS: Record<string, string> = { none: "None", "less-1": "< 1 year", "1-3": "1–3 years", "3-5": "3–5 years", "5+": "5+ years" };
const DRIVER_TYPE_LABELS: Record<string, string> = { company: "Company Driver", "owner-operator": "Owner Operator", lease: "Lease Operator", student: "Student / Trainee" };

const STAGE_CONFIG: Record<PipelineStage, { label: string; className: string }> = {
  New:       { label: "New",        className: "bg-muted text-muted-foreground" },
  Reviewing: { label: "Reviewing",  className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  Interview: { label: "Interview",  className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  Hired:     { label: "Hired",      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  Rejected:  { label: "Not Moving Forward", className: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
};

function formatRelativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
  return new Date(isoString).toLocaleDateString();
}

const StageBadge = ({ stage }: { stage?: PipelineStage }) => {
  const cfg = STAGE_CONFIG[stage ?? "New"];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>{cfg.label}</span>;
};

const DriverDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "driver")) {
      toast.error("Driver accounts only.");
      navigate("/");
    }
  }, [loading, user, navigate]);

  if (loading || !user || user.role !== "driver") return null;

  return <DriverDashboardInner />;
};

// Inner component — only renders when auth is confirmed as driver
const DriverDashboardInner = () => {
  const { user } = useAuth();
  const { jobs: allActiveJobs } = useActiveJobs();
  const { savedIds, toggle: toggleSave } = useSavedJobs(user!.id);
  const { profile, isLoading: profileLoading, saveProfile } = useDriverProfile(user!.id);

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  // Fetch driver's applications
  const { data: applications = [] } = useQuery({
    queryKey: ["driver-applications", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("driver_id", user!.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToApp);
    },
  });

  // Profile form state — initialized from DB once loaded
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [cdlNumber, setCdlNumber] = useState("");
  const [licenseClass, setLicenseClass] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [about, setAbout] = useState("");
  const [profileInit, setProfileInit] = useState(false);

  // Populate form once profile loads
  useEffect(() => {
    if (!profileLoading && profile && !profileInit) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setPhone(profile.phone);
      setCdlNumber(profile.cdlNumber);
      setLicenseClass(profile.licenseClass);
      setYearsExp(profile.yearsExp);
      setLicenseState(profile.licenseState);
      setZipCode(profile.zipCode);
      setDateOfBirth(profile.dateOfBirth);
      setAbout(profile.about);
      setProfileInit(true);
    }
  }, [profile, profileLoading, profileInit]);

  // Stats
  const totalApps = applications.length;
  const activeApps = applications.filter((a) => a.pipeline_stage !== "Hired" && a.pipeline_stage !== "Rejected").length;
  const interviews = applications.filter((a) => a.pipeline_stage === "Interview").length;
  const savedCount = savedIds.length;

  // Saved jobs data — full job objects for the saved tab
  const savedJobs = allActiveJobs.filter((j) => savedIds.includes(j.id));

  const handleRemoveSaved = async (id: string) => {
    await toggleSave(id);
    toast.success("Removed from saved jobs");
  };

  const handleSaveProfile = async () => {
    try {
      await saveProfile({ firstName, lastName, phone, cdlNumber, licenseClass, yearsExp, licenseState, zipCode, dateOfBirth, about } as DriverProfile);
      toast.success("Profile saved. Your application form will pre-fill next time.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview",      label: "Overview",        icon: <BarChart3 className="h-4 w-4" /> },
    { id: "applications",  label: `My Applications (${totalApps})`, icon: <Briefcase className="h-4 w-4" /> },
    { id: "saved",         label: `Saved Jobs (${savedCount})`,     icon: <Bookmark className="h-4 w-4" /> },
    { id: "profile",       label: "My Profile",      icon: <User className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8 max-w-5xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          My Dashboard
        </p>

        {/* Welcome header */}
        <div className="bg-foreground text-background dark:bg-muted dark:text-foreground border-l-4 border-primary px-5 py-4 mb-6">
          <p className="font-display font-bold text-lg">Welcome back, {user!.name}</p>
          <p className="text-sm opacity-70 mt-0.5">Driver Dashboard</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Applications Sent", value: totalApps, icon: <Briefcase className="h-5 w-5 text-primary" /> },
                { label: "Active Pipeline", value: activeApps, icon: <BarChart3 className="h-5 w-5 text-blue-500" /> },
                { label: "Interviews", value: interviews, icon: <User className="h-5 w-5 text-amber-500" /> },
                { label: "Saved Jobs", value: savedCount, icon: <Bookmark className="h-5 w-5 text-green-500" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    {icon}
                    <span className="text-2xl font-bold font-display">{value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Recent applications */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-base border-l-4 border-primary pl-3">Recent Applications</h2>
                {totalApps > 3 && (
                  <button onClick={() => setActiveTab("applications")} className="text-sm text-primary hover:underline">
                    View all
                  </button>
                )}
              </div>
              {applications.length === 0 ? (
                <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p>No applications yet.</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link to="/jobs">Browse Jobs</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {applications.slice(0, 3).map((app) => (
                    <div key={app.id} className="border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{app.jobTitle && app.jobTitle !== "General Application" ? app.jobTitle : app.companyName}</p>
                        <p className="text-xs text-muted-foreground">{app.companyName} &middot; {formatRelativeDate(app.submittedAt)}</p>
                      </div>
                      <StageBadge stage={app.pipeline_stage} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div>
              <h2 className="font-display font-semibold text-base border-l-4 border-primary pl-3 mb-3">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Button asChild><Link to="/jobs">Browse Jobs</Link></Button>
                <Button asChild variant="outline"><Link to="/apply">General Application</Link></Button>
                <Button variant="outline" onClick={() => setActiveTab("profile")}>Edit My Profile</Button>
              </div>
            </div>
          </div>
        )}

        {/* ── MY APPLICATIONS ── */}
        {activeTab === "applications" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base border-l-4 border-primary pl-3">
                My Applications ({totalApps})
              </h2>
            </div>
            {applications.length === 0 ? (
              <div className="border border-border bg-card p-12 text-center text-sm text-muted-foreground">
                <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="mb-4">You haven't submitted any applications yet.</p>
                <Button asChild><Link to="/jobs">Browse Jobs</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const isExpanded = expandedApp === app.id;
                  const displayTitle = app.jobTitle && app.jobTitle !== "General Application"
                    ? app.jobTitle
                    : "General Application";
                  return (
                    <div key={app.id} className="border border-border bg-card">
                      <div
                        className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{displayTitle}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {app.companyName} &middot; {formatRelativeDate(app.submittedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <StageBadge stage={app.pipeline_stage} />
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-border px-4 py-4 text-sm space-y-2 bg-muted/10">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Name</p>
                              <p>{app.firstName} {app.lastName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                              <p className="truncate">{app.email}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                              <p>{app.phone}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Driver Type</p>
                              <p>{DRIVER_TYPE_LABELS[app.driverType] ?? app.driverType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">License Class</p>
                              <p>{LICENSE_CLASS_LABELS[app.licenseClass] ?? app.licenseClass}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Experience</p>
                              <p>{YEARS_EXP_LABELS[app.yearsExp] ?? app.yearsExp}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">License State</p>
                              <p>{app.licenseState}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                              <StageBadge stage={app.pipeline_stage} />
                            </div>
                          </div>
                          {app.notes && (
                            <div className="pt-2 border-t border-border">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Message</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{app.notes}</p>
                            </div>
                          )}
                          {app.jobId && (
                            <div className="pt-2">
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/jobs/${app.jobId}`}>View Job Posting</Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SAVED JOBS ── */}
        {activeTab === "saved" && (
          <div>
            <h2 className="font-display font-semibold text-base border-l-4 border-primary pl-3 mb-4">
              Saved Jobs ({savedCount})
            </h2>
            {savedJobs.length === 0 ? (
              <div className="border border-border bg-card p-12 text-center text-sm text-muted-foreground">
                <Bookmark className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="mb-4">You haven't saved any jobs yet.</p>
                <Button asChild><Link to="/jobs">Browse Jobs</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedJobs.map((job) => (
                  <div key={job.id} className="border border-border bg-card p-4 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-primary mb-0.5">{job.company}</h3>
                      <p className="text-sm font-medium text-foreground mb-1">{job.title}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{job.location}
                          </span>
                        )}
                        {job.pay && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />{job.pay}
                          </span>
                        )}
                        {job.routeType && <span>{job.routeType}</span>}
                        {job.driverType && <span>{job.driverType}</span>}
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button asChild size="sm" className="flex-1 sm:flex-none">
                        <Link to={`/jobs/${job.id}`}>View Job</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        onClick={() => handleRemoveSaved(job.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MY PROFILE ── */}
        {activeTab === "profile" && (
          <div>
            <h2 className="font-display font-semibold text-base border-l-4 border-primary pl-3 mb-4">My Profile</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Keep your profile up to date. This information will pre-fill your application forms automatically.
            </p>
            <div className="border border-border bg-card p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" type="tel" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CDL Number</Label>
                  <Input value={cdlNumber} onChange={(e) => setCdlNumber(e.target.value)} placeholder="CDL-XX-000000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Zip Code</Label>
                  <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="00000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <Input value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} type="date" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">License Class</Label>
                  <Select value={licenseClass} onValueChange={setLicenseClass}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Class A</SelectItem>
                      <SelectItem value="b">Class B</SelectItem>
                      <SelectItem value="c">Class C</SelectItem>
                      <SelectItem value="permit">Permit Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Years of Experience</Label>
                  <Select value={yearsExp} onValueChange={setYearsExp}>
                    <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="less-1">Less than 1 year</SelectItem>
                      <SelectItem value="1-3">1–3 years</SelectItem>
                      <SelectItem value="3-5">3–5 years</SelectItem>
                      <SelectItem value="5+">5+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">License State</Label>
                  <Select value={licenseState} onValueChange={setLicenseState}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">About Me (optional)</Label>
                <Textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Tell companies a bit about yourself, your experience, what you're looking for..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              <Button onClick={handleSaveProfile} className="px-6">Save Profile</Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DriverDashboard;
