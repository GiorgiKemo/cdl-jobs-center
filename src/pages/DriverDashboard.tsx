import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Truck, Briefcase, Bookmark, User, BarChart3, ChevronDown, ChevronUp, MapPin, DollarSign, Bell, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChatPanel } from "@/components/ChatPanel";
import { useUnreadCount } from "@/hooks/useMessages";

type Tab = "overview" | "applications" | "saved" | "profile" | "analytics" | "messages";
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
  updatedAt: string;
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
    updatedAt: row.updated_at ?? row.submitted_at ?? "",
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
  const qc = useQueryClient();
  const { jobs: allActiveJobs } = useActiveJobs();
  const { savedIds, toggle: toggleSave } = useSavedJobs(user!.id);
  const { profile, isLoading: profileLoading, saveProfile } = useDriverProfile(user!.id);
  const { data: unreadMsgCount = 0 } = useUnreadCount(user!.id);

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return t === "messages" ? "messages" : "overview";
  });
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<PipelineStage | "All">("All");
  const [initialChatAppId, setInitialChatAppId] = useState<string | null>(null);
  const [dismissedApps, setDismissedApps] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`cdl-dismissed-apps-${user!.id}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  // Fetch driver's applications
  const { data: applications = [] } = useQuery({
    queryKey: ["driver-applications", user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("driver_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToApp);
    },
  });

  // Profile form state — initialized from DB once loaded
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [cdlNumber, setCdlNumber] = useState("");
  const [driverType, setDriverType] = useState("");
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
      setDriverType(profile.driverType);
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

  // Filtered applications for the applications tab
  const filteredApps = stageFilter === "All" ? applications : applications.filter((a) => a.pipeline_stage === stageFilter);

  // Saved jobs data — full job objects for the saved tab
  const savedJobs = allActiveJobs.filter((j) => savedIds.includes(j.id));

  const handleRemoveSaved = async (id: string) => {
    await toggleSave(id);
    toast.success("Removed from saved jobs");
  };

  const handleSaveProfile = async () => {
    try {
      await saveProfile({ firstName, lastName, phone, cdlNumber, driverType, licenseClass, yearsExp, licenseState, zipCode, dateOfBirth, about } as DriverProfile);
      toast.success("Profile saved. Your application form will pre-fill next time.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    }
  };

  // Unseen application updates
  // Red dots: driven purely by dismissedApps (per-app click dismiss)
  const isAppUnseen = (app: StoredApplication) =>
    app.pipeline_stage !== "New" && app.updatedAt !== app.submittedAt && !dismissedApps.has(app.id);
  const unseenUpdates = applications.filter(isAppUnseen).length;

  const dismissApp = (appId: string) => {
    setDismissedApps((prev) => {
      const next = new Set(prev);
      next.add(appId);
      localStorage.setItem(`cdl-dismissed-apps-${user!.id}`, JSON.stringify([...next]));
      return next;
    });
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "applications") {
      localStorage.setItem(`cdl-apps-seen-${user!.id}`, new Date().toISOString());
      qc.invalidateQueries({ queryKey: ["driver-update-count", user!.id] });
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview",      label: "Overview",        icon: <BarChart3 className="h-4 w-4" /> },
    { id: "applications",  label: `My Applications (${totalApps})`, icon: <Briefcase className="h-4 w-4" />, badge: unseenUpdates },
    { id: "saved",         label: `Saved Jobs (${savedCount})`,     icon: <Bookmark className="h-4 w-4" /> },
    { id: "messages",      label: "Messages",        icon: <MessageSquare className="h-4 w-4" />, badge: unreadMsgCount },
    { id: "profile",       label: "My Profile",      icon: <User className="h-4 w-4" /> },
    { id: "analytics",     label: "Analytics",       icon: <BarChart3 className="h-4 w-4" /> },
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
        {/* Update notification banner */}
        {unseenUpdates > 0 && (
          <button
            onClick={() => switchTab("applications")}
            className="w-full flex items-center gap-3 px-5 py-3 mb-6 bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-colors text-left"
          >
            <Bell className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {unseenUpdates} application{unseenUpdates > 1 ? "s" : ""} {unseenUpdates > 1 ? "have" : "has"} been updated
            </span>
            <span className="ml-auto text-xs text-primary font-medium">View &rarr;</span>
          </button>
        )}

        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && tab.badge > 0 ? (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                  {tab.badge}
                </span>
              ) : null}
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
                  {applications.slice(0, 3).map((app) => {
                    const unseen = isAppUnseen(app);
                    return (
                    <div
                      key={app.id}
                      className={`relative border bg-card px-4 py-3 flex items-center justify-between gap-3 ${unseen ? "cursor-pointer" : ""} ${unseen ? "border-primary/50" : "border-border"}`}
                      onClick={unseen ? () => dismissApp(app.id) : undefined}
                    >
                      {unseen && (
                        <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{app.jobTitle && app.jobTitle !== "General Application" ? app.jobTitle : app.companyName}</p>
                        <p className="text-xs text-muted-foreground">{app.companyName} &middot; {formatRelativeDate(app.submittedAt)}</p>
                      </div>
                      <StageBadge stage={app.pipeline_stage} />
                    </div>
                    );
                  })}
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

            {/* Stage filter */}
            {applications.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {(["All", "New", "Reviewing", "Interview", "Hired", "Rejected"] as const).map((stage) => {
                  const count = stage === "All" ? applications.length : applications.filter((a) => a.pipeline_stage === stage).length;
                  const isActive = stageFilter === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => setStageFilter(stage)}
                      className={`text-xs font-medium px-3 py-1.5 border transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      }`}
                    >
                      {stage === "Rejected" ? "Not Moving Forward" : stage} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {applications.length === 0 ? (
              <div className="border border-border bg-card p-12 text-center text-sm text-muted-foreground">
                <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="mb-4">You haven't submitted any applications yet.</p>
                <Button asChild><Link to="/jobs">Browse Jobs</Link></Button>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No applications with status "{stageFilter === "Rejected" ? "Not Moving Forward" : stageFilter}".
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApps.map((app) => {
                  const isExpanded = expandedApp === app.id;
                  const unseen = isAppUnseen(app);
                  const displayTitle = app.jobTitle && app.jobTitle !== "General Application"
                    ? app.jobTitle
                    : "General Application";
                  return (
                    <div key={app.id} className={`relative border bg-card ${unseen ? "border-primary/50" : "border-border"}`}>
                      {unseen && (
                        <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-red-500 border-2 border-background" />
                      )}
                      <div
                        className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => { if (unseen) dismissApp(app.id); setExpandedApp(isExpanded ? null : app.id); }}
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
                          <div className="pt-2 flex gap-2">
                            {app.jobId && (
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/jobs/${app.jobId}`}>View Job Posting</Link>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInitialChatAppId(app.id);
                                switchTab("messages");
                              }}
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                              Message Company
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES ── */}
        {activeTab === "messages" && (
          <ChatPanel userId={user!.id} userRole="driver" userName={user!.name} initialApplicationId={initialChatAppId} />
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
                  <Label className="text-xs text-muted-foreground">Driver Type</Label>
                  <Select value={driverType} onValueChange={setDriverType}>
                    <SelectTrigger><SelectValue placeholder="Select driver type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Company Driver</SelectItem>
                      <SelectItem value="owner-operator">Owner Operator</SelectItem>
                      <SelectItem value="lease">Lease Operator</SelectItem>
                      <SelectItem value="student">Student / Trainee</SelectItem>
                    </SelectContent>
                  </Select>
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
                <div className="space-y-1">
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

        {/* ── ANALYTICS ── */}
        {activeTab === "analytics" && (() => {
          const total = applications.length;
          const stageCounts = (["New", "Reviewing", "Interview", "Hired", "Rejected"] as PipelineStage[]).reduce<Record<string, number>>(
            (acc, s) => { acc[s] = applications.filter((a) => a.pipeline_stage === s).length; return acc; }, {}
          );

          const responded = total - (stageCounts["New"] ?? 0);
          const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
          const interviewPlus = (stageCounts["Interview"] ?? 0) + (stageCounts["Hired"] ?? 0);
          const interviewRate = total > 0 ? Math.round((interviewPlus / total) * 100) : 0;
          const hireRate = total > 0 ? Math.round(((stageCounts["Hired"] ?? 0) / total) * 100) : 0;

          // Average response time (days between submit and update for responded apps)
          const respondedApps = applications.filter((a) => a.updatedAt !== a.submittedAt && a.pipeline_stage !== "New");
          const avgDays = respondedApps.length > 0
            ? Math.round(respondedApps.reduce((sum, a) => sum + (new Date(a.updatedAt).getTime() - new Date(a.submittedAt).getTime()) / (1000 * 60 * 60 * 24), 0) / respondedApps.length)
            : null;

          // Application timeline — last 6 months
          const now = new Date();
          const monthlyData: { month: string; count: number }[] = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString("en-US", { month: "short" });
            const count = applications.filter((a) => a.submittedAt.startsWith(key)).length;
            monthlyData.push({ month: label, count });
          }

          // Top 5 companies
          const companyCounts: Record<string, number> = {};
          applications.forEach((a) => { companyCounts[a.companyName] = (companyCounts[a.companyName] ?? 0) + 1; });
          const topCompanies = Object.entries(companyCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
          const maxCompanyCount = topCompanies.length > 0 ? topCompanies[0][1] : 1;

          const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
            <div className="border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="font-display font-bold text-3xl text-foreground">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
          );

          return (
            <div className="space-y-6">
              <h2 className="font-display font-semibold text-base border-l-4 border-primary pl-3">Analytics Overview</h2>

              {total === 0 ? (
                <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No data yet. Analytics will appear here as you submit applications.
                </div>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Response Rate" value={`${responseRate}%`} sub={`${responded} of ${total} responded`} />
                    <StatCard label="Interview Rate" value={`${interviewRate}%`} sub={`${interviewPlus} interviews`} />
                    <StatCard label="Hire Rate" value={`${hireRate}%`} sub={`${stageCounts["Hired"]} hired`} />
                    <StatCard label="Avg. Response Time" value={avgDays !== null ? `${avgDays}d` : "—"} sub={avgDays !== null ? `${respondedApps.length} responded` : "no data yet"} />
                  </div>

                  {/* Pipeline stage breakdown */}
                  <div className="border border-border bg-card p-5">
                    <p className="font-semibold text-sm mb-4">Pipeline Stage Breakdown</p>
                    <div className="space-y-3">
                      {(["New", "Reviewing", "Interview", "Hired", "Rejected"] as PipelineStage[]).map((stage) => {
                        const count = stageCounts[stage] ?? 0;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const colors: Record<string, string> = {
                          New: "bg-slate-400",
                          Reviewing: "bg-blue-500",
                          Interview: "bg-yellow-500",
                          Hired: "bg-green-500",
                          Rejected: "bg-red-400",
                        };
                        return (
                          <div key={stage}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{stage === "Rejected" ? "Not Moving Forward" : stage}</span>
                              <span className="text-muted-foreground">{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${colors[stage]}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Application timeline */}
                  <div className="border border-border bg-card p-5">
                    <p className="font-semibold text-sm mb-4">Applications Over Time</p>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                            formatter={(value: number) => [value, "Applications"]}
                          />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top companies */}
                  {topCompanies.length > 0 && (
                    <div className="border border-border bg-card p-5">
                      <p className="font-semibold text-sm mb-4">Top Companies Applied To</p>
                      <div className="space-y-3">
                        {topCompanies.map(([name, count]) => {
                          const pct = Math.round((count / maxCompanyCount) * 100);
                          return (
                            <div key={name}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium truncate mr-3">{name}</span>
                                <span className="text-muted-foreground shrink-0">{count} app{count > 1 ? "s" : ""}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </main>
      <Footer />
    </div>
  );
};

export default DriverDashboard;
