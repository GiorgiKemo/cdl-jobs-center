import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth";
import { useJobs } from "@/hooks/useJobs";
import { Job } from "@/data/jobs";
import { toast } from "sonner";
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, X, Upload, Bell, MessageSquare, Users, Phone as PhoneIcon, Mail as MailIcon, MapPin, Truck as TruckIcon, Lock, RefreshCw, CreditCard, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { ChatPanel } from "@/components/ChatPanel";
import { useUnreadCount } from "@/hooks/useMessages";
import { useLeads, useUpdateLeadStatus, useSyncLeads } from "@/hooks/useLeads";
import { useSubscription, PLANS } from "@/hooks/useSubscription";

const FREIGHT_TYPES = [
  "Box", "Car Hauler", "Drop and Hook", "Dry Bulk", "Dry Van", "Flatbed",
  "Hopper Bottom", "Intermodal", "Oil Field", "Oversize Load",
  "Refrigerated", "Tanker", "Yard Spotter", "Owner Operator", "Students", "Teams",
];

const DRIVER_TYPES = ["Owner Operator", "Company Driver", "Student"];
const ROUTE_TYPES = ["OTR", "Local", "Regional", "Dedicated", "LTL"];
const TEAM_OPTIONS = ["Solo", "Team", "Both"];
const JOB_STATUSES = ["Draft", "Active", "Paused", "Closed"] as const;

type PipelineStage = "New" | "Reviewing" | "Interview" | "Hired" | "Rejected";

const PIPELINE_STAGES: Array<{ label: PipelineStage; headerClass: string }> = [
  { label: "New",       headerClass: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600" },
  { label: "Reviewing", headerClass: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" },
  { label: "Interview", headerClass: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" },
  { label: "Hired",     headerClass: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" },
  { label: "Rejected",  headerClass: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" },
];

const JOB_STATUS_BADGE: Record<string, string> = {
  Draft:  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Paused: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  Closed: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
};

interface ReceivedApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driverType: string;
  yearsExp: string;
  licenseClass: string;
  licenseState: string;
  cdlNumber: string;
  soloTeam: string;
  notes: string;
  prefs: Record<string, boolean>;
  endorse: Record<string, boolean>;
  hauler: Record<string, boolean>;
  route: Record<string, boolean>;
  extra: Record<string, boolean>;
  companyName: string;
  submittedAt: string;
  pipeline_stage: PipelineStage;
}

// Map Supabase row → ReceivedApplication
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToApp(row: Record<string, any>): ReceivedApplication {
  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    driverType: row.driver_type ?? "",
    yearsExp: row.years_exp ?? "",
    licenseClass: row.license_class ?? "",
    licenseState: row.license_state ?? "",
    cdlNumber: row.cdl_number ?? "",
    soloTeam: row.solo_team ?? "Solo",
    notes: row.notes ?? "",
    prefs: row.prefs ?? {},
    endorse: row.endorse ?? {},
    hauler: row.hauler ?? {},
    route: row.route ?? {},
    extra: row.extra ?? {},
    companyName: row.company_name ?? "",
    submittedAt: row.submitted_at ?? "",
    pipeline_stage: (row.pipeline_stage ?? "New") as PipelineStage,
  };
}

const EMPTY_FORM = {
  title: "",
  driverType: "",
  type: "",
  routeType: "",
  teamDriving: "Solo",
  location: "",
  pay: "",
  description: "",
  status: "Active",
};

type Tab = "jobs" | "applications" | "pipeline" | "profile" | "analytics" | "messages" | "leads" | "hired" | "subscription";

// ── Application card with expand/collapse ────────────────────────────────────
const AppCard = ({ app }: { app: ReceivedApplication }) => {
  const [open, setOpen] = useState(false);

  const flaggedToggles = (map: Record<string, boolean>) =>
    Object.entries(map)
      .filter(([, v]) => v)
      .map(([k]) => k.replace(/([A-Z])/g, " $1").trim())
      .join(", ") || "None";

  return (
    <div className="border border-border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">
            {app.firstName} {app.lastName}
          </p>
          <p className="text-sm text-muted-foreground">
            {app.email} · {app.phone}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Driver Type: {app.driverType || "—"} · Experience: {app.yearsExp || "—"} · License: {app.licenseClass || "—"} ({app.licenseState || "—"})
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground">
            {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}
          </span>
          <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="flex items-center gap-1.5">
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {open ? "Collapse" : "View Details"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-3 text-sm">
          <div className="grid sm:grid-cols-2 gap-2">
            <p><span className="text-muted-foreground">Solo/Team:</span> {app.soloTeam}</p>
            <p><span className="text-muted-foreground">CDL #:</span> {app.cdlNumber || "—"}</p>
          </div>
          <p><span className="text-muted-foreground">Job Preferences:</span> {flaggedToggles(app.prefs ?? {})}</p>
          <p><span className="text-muted-foreground">Endorsements:</span> {flaggedToggles(app.endorse ?? {})}</p>
          <p><span className="text-muted-foreground">Hauler Experience:</span> {flaggedToggles(app.hauler ?? {})}</p>
          <p><span className="text-muted-foreground">Route Preference:</span> {flaggedToggles(app.route ?? {})}</p>
          {app.notes && (
            <p><span className="text-muted-foreground">Notes:</span> {app.notes}</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Pipeline draggable card ───────────────────────────────────────────────────
const PipelineCard = ({
  app,
  stage,
  onStageChange,
  isDragOverlay = false,
}: {
  app: ReceivedApplication;
  stage: PipelineStage;
  onStageChange: (s: PipelineStage) => void;
  isDragOverlay?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id });
  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(!isDragOverlay ? listeners : {})}
      {...(!isDragOverlay ? attributes : {})}
      className={`border border-border bg-card p-3 space-y-2 select-none transition-opacity touch-none ${
        isDragging ? "opacity-30" : "opacity-100"
      } ${isDragOverlay ? "shadow-2xl -rotate-1 opacity-95 cursor-grabbing" : "cursor-grab active:cursor-grabbing"}`}
    >
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-tight">
            {app.firstName} {app.lastName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {app.driverType || "Driver"}{app.yearsExp ? ` · ${app.yearsExp} exp` : ""}
          </p>
          {app.submittedAt && (
            <p className="text-xs text-muted-foreground">
              Applied {new Date(app.submittedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      {!isDragOverlay && (
        <Select value={stage} onValueChange={(v) => onStageChange(v as PipelineStage)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["New", "Reviewing", "Interview", "Hired", "Rejected"] as PipelineStage[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

// ── Pipeline droppable column ─────────────────────────────────────────────────
const PipelineColumn = ({
  label,
  headerClass,
  apps,
  onStageChange,
}: {
  label: PipelineStage;
  headerClass: string;
  apps: ReceivedApplication[];
  onStageChange: (appId: string, s: PipelineStage) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: label });
  return (
    <div className="flex-1" style={{ minWidth: "200px" }}>
      <div className={`border ${headerClass} px-3 py-2 flex items-center justify-between mb-2`}>
        <span className="font-semibold text-sm">{label}</span>
        <span className="text-xs bg-foreground/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full font-medium">
          {apps.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`scrollbar-thin space-y-2 min-h-[120px] max-h-[540px] overflow-y-auto p-1 rounded-sm transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-primary/30" : ""
        }`}
      >
        {apps.length === 0 ? (
          <div className={`border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors ${
            isOver ? "border-primary/50 text-primary" : "border-border"
          }`}>
            {isOver ? "Drop here" : "Empty"}
          </div>
        ) : (
          apps.map((app) => (
            <PipelineCard
              key={app.id}
              app={app}
              stage={app.pipeline_stage}
              onStageChange={(s) => onStageChange(app.id, s)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "company")) {
      toast.error("Dashboard is available for company accounts only.");
      navigate("/");
    }
  }, [loading, user, navigate]);

  if (loading || !user || user.role !== "company") return null;

  return <DashboardInner />;
};

// Inner component (only renders after auth is resolved and user is a company)
const DashboardInner = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { jobs, addJob, updateJob, removeJob } = useJobs(user!.id);
  const { data: unreadMsgCount = 0 } = useUnreadCount(user!.id);
  const {
    data: leads = [],
    isLoading: leadsLoading,
    isError: leadsIsError,
    error: leadsError,
    refetch: refetchLeads,
  } = useLeads(user!.id);
  const updateLeadStatus = useUpdateLeadStatus();
  const syncLeads = useSyncLeads();
  const { data: subscription } = useSubscription(user!.id);
  const [portalLoading, setPortalLoading] = useState(false);
  const leadLimit = subscription ? PLANS[subscription.plan].leads : 3;

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    if (t === "messages" || t === "leads" || t === "subscription") return t;
    return "jobs";
  });
  const [initialChatAppId, setInitialChatAppId] = useState<string | null>(() => searchParams.get("app"));
  const [appPage, setAppPage] = useState(0);
  const [leadPage, setLeadPage] = useState(0);
  const [leadStateFilter, setLeadStateFilter] = useState("all");
  const [leadTypeFilter, setLeadTypeFilter] = useState<"all" | "owner-op" | "company">("all");
  const [contactLeadId, setContactLeadId] = useState<string | null>(null);
  const [sendApplyLeadId, setSendApplyLeadId] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [dismissedSearch, setDismissedSearch] = useState("");
  const [dismissedPage, setDismissedPage] = useState(0);
  const APP_PAGE_SIZE = 10;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [savingJob, setSavingJob] = useState(false);

  // Company profile state
  const [profileName, setProfileName] = useState(user!.name);
  const [profileEmail, setProfileEmail] = useState(user!.email ?? "");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileAbout, setProfileAbout] = useState("");
  const [profileWebsite, setProfileWebsite] = useState("");
  const [profileLogo, setProfileLogo] = useState("");

  // Fetch applications for this company
  const appsKey = ["company-applications", user!.id];
  const { data: applications = [], refetch: refetchApps } = useQuery({
    queryKey: appsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("company_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToApp);
    },
  });

  // Load company profile on mount
  useEffect(() => {
    supabase
      .from("company_profiles")
      .select("*")
      .eq("id", user!.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfileName(data.company_name ?? user!.name);
          setProfileEmail(data.email ?? user!.email ?? "");
          setProfilePhone(data.phone ?? "");
          setProfileAddress(data.address ?? "");
          setProfileAbout(data.about ?? "");
          setProfileWebsite(data.website ?? "");
          setProfileLogo(data.logo_url ?? "");
        }
      });
  }, [user]);

  // Post-checkout success handling
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      toast.success("Payment successful! Your subscription is now active.");
      const next = new URLSearchParams(searchParams);
      next.delete("session_id");
      setSearchParams(next, { replace: true });
      qc.invalidateQueries({ queryKey: ["subscription"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const openNewForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (job: Job) => {
    setForm({
      title: job.title,
      driverType: job.driverType,
      type: job.type,
      routeType: job.routeType,
      teamDriving: job.teamDriving,
      location: job.location,
      pay: job.pay,
      description: job.description,
      status: job.status ?? "Active",
    });
    setEditingId(job.id);
    setShowForm(true);
  };

  const handleSaveJob = async () => {
    if (!form.title.trim()) { toast.error("Job title is required."); return; }
    setSavingJob(true);
    try {
      if (editingId) {
        await updateJob(editingId, { ...form });
        toast.success("Job updated.");
      } else {
        await addJob({ ...form, company: user!.name, companyName: user!.name });
        toast.success("Job posted successfully.");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? "Failed to save job.";
      console.error("Save job error:", err);
      toast.error(msg);
    } finally {
      setSavingJob(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await removeJob(id);
      toast.success("Job removed.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete job.");
    }
  };

  const handleQuickStatus = async (jobId: string, status: string) => {
    await updateJob(jobId, { status: status as Job["status"] });
  };

  const updateAppStage = async (appId: string, stage: PipelineStage) => {
    // Optimistic local update
    qc.setQueryData<ReceivedApplication[]>(appsKey, (prev) =>
      (prev ?? []).map((a) => a.id === appId ? { ...a, pipeline_stage: stage } : a)
    );
    // Persist to DB
    const { error } = await supabase
      .from("applications")
      .update({ pipeline_stage: stage, updated_at: new Date().toISOString() })
      .eq("id", appId);
    if (error) {
      toast.error("Failed to update stage.");
      refetchApps();
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB."); return; }
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user!.id}/logo.${ext}`;
    const { error } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed: " + error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("company-logos").getPublicUrl(path);
    setProfileLogo(publicUrl);
    e.target.value = "";
  };

  const [savingProfile, setSavingProfile] = useState(false);
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = {
        id: user!.id,
        company_name: profileName,
        email: profileEmail,
        phone: profilePhone,
        address: profileAddress,
        about: profileAbout,
        website: profileWebsite,
        logo_url: profileLogo || "",
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("company_profiles").upsert(payload);
      if (error) {
        console.error("Save profile error:", error, "payload:", payload);
        throw error;
      }
      toast.success("Profile saved.");
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? "Failed to save profile.";
      console.error("Save profile catch:", err);
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "applications" || tab === "pipeline") {
      setAppPage(0);
      // Mark all current applications as "seen" so the navbar badge clears
      localStorage.setItem(`cdl-apps-seen-${user!.id}`, new Date().toISOString());
      qc.invalidateQueries({ queryKey: ["new-app-count", user!.id] });
    }
  };

  const tabClass = (tab: Tab) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === tab
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
    }`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8 max-w-[1400px]">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          Dashboard
        </p>

        {/* Welcome header */}
        <div className="bg-foreground text-background dark:bg-muted dark:text-foreground border border-border px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-lg">Welcome, {user!.name}</h1>
            <p className="text-sm opacity-70 mt-0.5">Company Dashboard</p>
          </div>
          {subscription && (
            <div className="text-right">
              <span className={`text-xs px-2 py-1 font-semibold rounded-full ${
                subscription.plan === "unlimited"
                  ? "bg-purple-500/20 text-purple-200"
                  : subscription.plan === "growth"
                  ? "bg-blue-500/20 text-blue-200"
                  : subscription.plan === "starter"
                  ? "bg-green-500/20 text-green-200"
                  : "bg-white/10 text-white/70 dark:bg-white/10 dark:text-white/70"
              }`}>
                {PLANS[subscription.plan].label} Plan
              </span>
              <p className="text-xs opacity-60 mt-1">
                {PLANS[subscription.plan].leads === 9999
                  ? "Unlimited leads"
                  : `${PLANS[subscription.plan].leads - subscription.leadsUsed}/${PLANS[subscription.plan].leads} leads remaining`}
              </p>
            </div>
          )}
        </div>

        {/* New applications banner */}
        {(() => {
          const lastSeen = localStorage.getItem(`cdl-apps-seen-${user!.id}`) ?? "1970-01-01T00:00:00Z";
          const unseenCount = applications.filter((a) => a.submittedAt > lastSeen).length;
          if (unseenCount === 0) return null;
          return (
            <button
              onClick={() => switchTab("applications")}
              className="w-full flex items-center gap-3 px-5 py-3 mb-6 bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-colors text-left"
            >
              <Bell className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">
                You have {unseenCount} new application{unseenCount > 1 ? "s" : ""} waiting for review
              </span>
              <span className="ml-auto text-xs text-primary font-medium">View &rarr;</span>
            </button>
          );
        })()}

        {/* Tab bar */}
        <div className="border-b border-border mb-6 flex overflow-x-auto">
          <button className={tabClass("jobs")} onClick={() => switchTab("jobs")}>
            My Jobs ({jobs.length})
          </button>
          <button className={tabClass("applications")} onClick={() => switchTab("applications")}>
            Applications ({applications.length})
            {(() => {
              const lastSeen = localStorage.getItem(`cdl-apps-seen-${user!.id}`) ?? "1970-01-01T00:00:00Z";
              const unseen = applications.filter((a) => a.submittedAt > lastSeen).length;
              if (unseen === 0) return null;
              return (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                  {unseen}
                </span>
              );
            })()}
          </button>
          <button className={tabClass("pipeline")} onClick={() => switchTab("pipeline")}>
            Pipeline ({applications.length})
          </button>
          <button className={tabClass("messages")} onClick={() => switchTab("messages")}>
            Messages
            {unreadMsgCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                {unreadMsgCount}
              </span>
            )}
          </button>
          <button className={tabClass("leads")} onClick={() => switchTab("leads")}>
            Leads ({leads.filter((l) => l.status !== "dismissed" && l.status !== "hired").length})
            {(() => {
              const newCount = leads.filter((l) => l.status === "new").length;
              if (newCount === 0) return null;
              return (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white px-1">
                  {newCount}
                </span>
              );
            })()}
          </button>
          <button className={tabClass("hired")} onClick={() => switchTab("hired")}>
            Hired ({leads.filter((l) => l.status === "hired").length})
          </button>
          <button className={tabClass("profile")} onClick={() => switchTab("profile")}>
            Company Profile
          </button>
          <button className={tabClass("analytics")} onClick={() => switchTab("analytics")}>
            Analytics
          </button>
          <button className={tabClass("subscription")} onClick={() => switchTab("subscription")}>
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Subscription
            </span>
          </button>
        </div>

        {/* ── Tab: My Jobs ─────────────────────────────────────────────────── */}
        {activeTab === "jobs" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base">
                My Job Postings
                <span className="text-muted-foreground font-normal text-sm ml-2">({jobs.length})</span>
              </h2>
              <Button size="sm" onClick={openNewForm} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                Post New Job
              </Button>
            </div>

            {/* Inline form */}
            {showForm && (
              <div className="border border-border bg-card p-5 mb-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">{editingId ? "Edit Job" : "New Job Posting"}</h3>
                  <button onClick={() => setShowForm(false)} className="p-1 hover:text-primary transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Job Title *</Label>
                    <Input placeholder="e.g. OTR Dry Van Driver" value={form.title}
                      onChange={(e) => handleFormChange("title", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Driver Type</Label>
                    <Select value={form.driverType} onValueChange={(v) => handleFormChange("driverType", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{DRIVER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Freight Type</Label>
                    <Select value={form.type} onValueChange={(v) => handleFormChange("type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{FREIGHT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Route Type</Label>
                    <Select value={form.routeType} onValueChange={(v) => handleFormChange("routeType", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{ROUTE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Team Driving</Label>
                    <Select value={form.teamDriving} onValueChange={(v) => handleFormChange("teamDriving", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TEAM_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <Input placeholder="e.g. Illinois or Nationwide" value={form.location}
                      onChange={(e) => handleFormChange("location", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Pay</Label>
                    <Input placeholder="e.g. $0.65/mile or $1,500/week" value={form.pay}
                      onChange={(e) => handleFormChange("pay", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={(v) => handleFormChange("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea placeholder="Describe the position, requirements, and benefits..."
                      value={form.description} onChange={(e) => handleFormChange("description", e.target.value)}
                      rows={3} className="resize-none" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSaveJob} size="sm" className="px-6" disabled={savingJob}>
                    {savingJob ? "Saving…" : editingId ? "Update Job" : "Save Job"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Job list */}
            {jobs.length === 0 ? (
              <div className="border border-border bg-card px-5 py-12 text-center text-muted-foreground text-sm">
                No job postings yet. Click "Post New Job" to get started.
              </div>
            ) : (
              <div className="border border-border bg-card divide-y divide-border">
                {jobs.map((job) => (
                  <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-semibold text-foreground">{job.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 font-medium ${JOB_STATUS_BADGE[job.status ?? "Active"]}`}>
                          {job.status ?? "Active"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {job.driverType || "—"} · {job.routeType || "—"} · {job.location || "—"} · {job.pay || "—"}
                      </p>
                      {job.postedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Posted {new Date(job.postedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Select value={job.status ?? "Active"} onValueChange={(v) => handleQuickStatus(job.id, v)}>
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => openEditForm(job)} className="flex items-center gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteJob(job.id)}
                        className="flex items-center gap-1.5 border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Applications ──────────────────────────────────────────────── */}
        {activeTab === "applications" && (
          <div>
            <h2 className="font-display font-semibold text-base mb-4">
              Received Applications
              <span className="text-muted-foreground font-normal text-sm ml-2">({applications.length})</span>
            </h2>
            {applications.length === 0 ? (
              <div className="border border-border bg-card px-5 py-12 text-center text-muted-foreground text-sm">
                <p>No applications received yet. Applications will appear here when drivers apply to your company.</p>
              </div>
            ) : (() => {
              const totalPages = Math.ceil(applications.length / APP_PAGE_SIZE);
              const pageApps = applications.slice(appPage * APP_PAGE_SIZE, (appPage + 1) * APP_PAGE_SIZE);
              return (
                <>
                  <div className="space-y-3">
                    {pageApps.map((app) => <AppCard key={app.id} app={app} />)}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm">
                      <span className="text-muted-foreground">
                        Showing {appPage * APP_PAGE_SIZE + 1}–{Math.min((appPage + 1) * APP_PAGE_SIZE, applications.length)} of {applications.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAppPage((p) => p - 1)} disabled={appPage === 0}>
                          Previous
                        </Button>
                        <span className="text-muted-foreground text-xs">
                          {appPage + 1} / {totalPages}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setAppPage((p) => p + 1)} disabled={appPage >= totalPages - 1}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ── Tab: Pipeline ──────────────────────────────────────────────────── */}
        {activeTab === "pipeline" && (
          <div>
            <div className="flex items-start justify-between mb-5 gap-3">
              <div>
                <h2 className="font-display font-semibold text-base">Recruitment Pipeline</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Move applicants through hiring stages using the dropdown on each card.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {applications.length > 0 && (
                  <button
                    onClick={async () => {
                      const { error } = await supabase
                        .from("applications")
                        .delete()
                        .eq("company_id", user!.id);
                      if (!error) {
                        qc.setQueryData(appsKey, []);
                        toast.success("All applications cleared.");
                      } else {
                        toast.error("Failed to clear applications.");
                      }
                    }}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="border border-border bg-card px-5 py-12 text-center text-muted-foreground text-sm">
                <p>No applications received yet. The pipeline will show applicants as they apply.</p>
              </div>
            ) : (
              <DndContext
                collisionDetection={pointerWithin}
                onDragStart={(e) => setDragActiveId(e.active.id as string)}
                onDragEnd={(e) => {
                  setDragActiveId(null);
                  const { active, over } = e;
                  if (!over) return;
                  const targetStage = over.id as PipelineStage;
                  if (PIPELINE_STAGES.some((s) => s.label === targetStage)) {
                    updateAppStage(active.id as string, targetStage);
                  }
                }}
                onDragCancel={() => setDragActiveId(null)}
              >
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-3" style={{ minWidth: `${PIPELINE_STAGES.length * 210}px` }}>
                    {PIPELINE_STAGES.map(({ label, headerClass }) => {
                      const stageApps = applications.filter((app) => app.pipeline_stage === label);
                      return (
                        <PipelineColumn
                          key={label}
                          label={label}
                          headerClass={headerClass}
                          apps={stageApps}
                          onStageChange={updateAppStage}
                        />
                      );
                    })}
                  </div>
                </div>

                <DragOverlay dropAnimation={null}>
                  {dragActiveId ? (() => {
                    const activeApp = applications.find((a) => a.id === dragActiveId);
                    if (!activeApp) return null;
                    return (
                      <PipelineCard
                        app={activeApp}
                        stage={activeApp.pipeline_stage}
                        onStageChange={() => {}}
                        isDragOverlay
                      />
                    );
                  })() : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        )}

        {/* ── Tab: Profile Settings ──────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div>
            <h2 className="font-display font-semibold text-base mb-4">Company Profile Settings</h2>
            <div className="border border-border bg-card p-5">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                {/* Logo upload */}
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs text-muted-foreground">Company Logo</Label>
                  <div className="flex items-center gap-5">
                    <div className="h-20 w-20 border border-border flex items-center justify-center bg-muted shrink-0 overflow-hidden">
                      {profileLogo ? (
                        <img src={profileLogo} alt="Company logo" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="font-display text-3xl font-bold text-primary">{user!.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="cursor-pointer inline-block">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border hover:bg-muted transition-colors rounded-sm">
                          <Upload className="h-3.5 w-3.5" />
                          {profileLogo ? "Change Logo" : "Upload Logo"}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      {profileLogo && (
                        <button type="button" onClick={() => setProfileLogo("")} className="block text-xs text-red-500 hover:underline">
                          Remove logo
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 2MB.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Company Name</Label>
                  <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Company Email</Label>
                  <Input type="email" placeholder="contact@yourcompany.com" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input placeholder="(555) 000-0000" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <Input placeholder="123 Main St, City, State ZIP" value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)} />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Website (optional)</Label>
                  <Input placeholder="https://yourcompany.com" value={profileWebsite} onChange={(e) => setProfileWebsite(e.target.value)} />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">About</Label>
                  <Textarea placeholder="Tell drivers about your company, culture, and opportunities..."
                    value={profileAbout} onChange={(e) => setProfileAbout(e.target.value)}
                    rows={5} className="resize-none" />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="px-8">{savingProfile ? "Saving…" : "Save Changes"}</Button>
            </div>
          </div>
        )}

        {/* ── Tab: Messages ──────────────────────────────────────────────────── */}
        {activeTab === "messages" && (
          <ChatPanel userId={user!.id} userRole="company" userName={user!.name} initialApplicationId={initialChatAppId} />
        )}

        {/* ── Tab: Leads ───────────────────────────────────────────────────── */}
        {activeTab === "leads" && (() => {
          const uniqueStates = [...new Set(leads.map((l) => l.state).filter(Boolean))].sort() as string[];
          const activeLeads = leads.filter((l) => l.status !== "dismissed" && l.status !== "hired");
          const dismissedLeads = leads.filter((l) => l.status === "dismissed");
          const filtered = activeLeads.filter((l) => {
            if (leadStateFilter !== "all" && l.state !== leadStateFilter) return false;
            if (leadTypeFilter === "owner-op" && !l.isOwnerOp) return false;
            if (leadTypeFilter === "company" && l.isOwnerOp) return false;
            return true;
          });
          const LEAD_PAGE_SIZE = 10;
          const totalPages = Math.ceil(filtered.length / LEAD_PAGE_SIZE);
          const pageLeads = filtered.slice(leadPage * LEAD_PAGE_SIZE, (leadPage + 1) * LEAD_PAGE_SIZE);
          const isFreePlan = !subscription || subscription.plan === "free";
          const leadsAllowed = leadLimit;

          const expLabel = (v: string | null) => {
            if (!v) return "N/A";
            if (v === "less-1") return "< 1 year";
            if (v === "5+") return "5+ years";
            return `${v} years`;
          };

          const statusDot = (s: string) => {
            if (s === "new") return "bg-blue-500";
            if (s === "contacted") return "bg-green-500";
            if (s === "hired") return "bg-emerald-600";
            return "bg-gray-400";
          };

          const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

          const timeAgo = (iso: string) => {
            const diff = Date.now() - new Date(iso).getTime();
            const mins = Math.floor(diff / 60_000);
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            const days = Math.floor(hrs / 24);
            return `${days}d ago`;
          };

          return (
            <div>
              {/* Subscription status banner */}
              <div className={`mb-4 border p-3 flex items-center justify-between gap-3 text-sm ${isFreePlan ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "border-primary/20 bg-primary/5"}`}>
                <p>
                  {isFreePlan ? (
                    <>You're on the <strong>Free</strong> plan ({leadsAllowed} leads). Upgrade to access more leads.</>
                  ) : (
                    <>
                      <strong className="text-primary">{PLANS[subscription!.plan].label}</strong> plan — {leadsAllowed === 9999 ? "Unlimited" : `${leadsAllowed}`} leads/month.
                      {subscription!.leadsUsed > 0 && <span className="text-muted-foreground"> {leadsAllowed - subscription!.leadsUsed} remaining.</span>}
                    </>
                  )}
                </p>
                <Link to="/pricing">
                  <Button size="sm" variant={isFreePlan ? "default" : "outline"} className="text-xs h-7 shrink-0">
                    {isFreePlan ? "Upgrade" : "Manage Plan"}
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display font-semibold text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Driver Leads
                    <span className="text-muted-foreground font-normal text-sm">({filtered.length})</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Facebook lead ad responses from drivers looking for jobs.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 gap-1.5"
                    disabled={syncLeads.isPending}
                    onClick={() => {
                      syncLeads.mutate(undefined, {
                        onSuccess: (result) => {
                          toast.success(`Synced ${result.synced} leads: ${result.new} new, ${result.updated} updated`);
                          if (result.errors.length > 0) {
                            toast.warning(`${result.errors.length} row(s) had issues`);
                          }
                        },
                        onError: (err) => {
                          toast.error(err instanceof Error ? err.message : "Sync failed");
                        },
                      });
                    }}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncLeads.isPending ? "animate-spin" : ""}`} />
                    {syncLeads.isPending ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Select value={leadStateFilter} onValueChange={(v) => { setLeadStateFilter(v); setLeadPage(0); }}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {uniqueStates.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex border border-border rounded-md overflow-hidden">
                    {(["all", "owner-op", "company"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setLeadTypeFilter(t); setLeadPage(0); }}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          leadTypeFilter === t
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {t === "all" ? "All" : t === "owner-op" ? "Owner Op" : "Company"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {leadsLoading ? (
                <div className="border border-border bg-card px-5 py-12 text-center text-muted-foreground text-sm">
                  Loading leads...
                </div>
              ) : leadsIsError ? (
                <div className="border border-destructive/30 bg-destructive/5 px-5 py-8 text-center">
                  <p className="text-sm text-destructive">
                    {leadsError instanceof Error ? leadsError.message : "Failed to load leads."}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchLeads()}>
                      Retry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      disabled={syncLeads.isPending}
                      onClick={() => {
                        syncLeads.mutate(undefined, {
                          onSuccess: (result) => {
                            toast.success(`Synced ${result.synced} leads: ${result.new} new, ${result.updated} updated`);
                          },
                          onError: (err) => {
                            toast.error(err instanceof Error ? err.message : "Sync failed");
                          },
                        });
                      }}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncLeads.isPending ? "animate-spin" : ""}`} />
                      {syncLeads.isPending ? "Syncing..." : "Sync Now"}
                    </Button>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="border border-border bg-card px-5 py-12 text-center text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p>No leads match your filters.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {pageLeads.map((lead, idx) => {
                      const globalIdx = leadPage * LEAD_PAGE_SIZE + idx;
                      const isLocked = leadsAllowed !== 9999 && globalIdx >= leadsAllowed;

                      return (
                      <div key={lead.id} className={`relative border bg-card p-4 transition-colors ${isLocked ? "border-border" : lead.status === "dismissed" ? "border-border opacity-60" : lead.status === "new" ? "border-blue-200 dark:border-blue-800" : "border-border"}`}>
                        {isLocked && (
                          <div className="absolute inset-0 z-10 backdrop-blur-sm bg-background/60 flex items-center justify-center">
                            <Link to="/pricing">
                              <Button size="sm" className="text-xs">Upgrade to Unlock</Button>
                            </Link>
                          </div>
                        )}
                        <div className={`flex items-start justify-between gap-3 ${isLocked ? "select-none" : ""}`}>
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Avatar */}
                            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                              {lead.fullName.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              {/* Name + status */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm">{lead.fullName}</p>
                                <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot(lead.status)}`} title={statusLabel(lead.status)} />
                                <span className="text-[10px] text-muted-foreground">{statusLabel(lead.status)}</span>
                              </div>
                              {/* Contact info */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                {lead.phone && (
                                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                                    <PhoneIcon className="h-3 w-3" />{lead.phone}
                                  </a>
                                )}
                                {lead.email && (
                                  <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                                    <MailIcon className="h-3 w-3" />{lead.email}
                                  </a>
                                )}
                              </div>
                              {/* Badges */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {lead.state && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[11px] font-medium">
                                    <MapPin className="h-3 w-3" />{lead.state}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                                  {expLabel(lead.yearsExp)} exp
                                </span>
                                {lead.isOwnerOp && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[11px] font-medium">
                                    Owner Operator
                                  </span>
                                )}
                                {!lead.isOwnerOp && (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[11px] font-medium">
                                    Company Driver
                                  </span>
                                )}
                              </div>
                              {/* Truck info for owner ops */}
                              {lead.isOwnerOp && lead.truckYear && (
                                <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                                  <TruckIcon className="h-3 w-3" />
                                  {lead.truckYear} {lead.truckMake} {lead.truckModel}
                                </div>
                              )}
                              {/* Time */}
                              <p className="text-[10px] text-muted-foreground mt-1.5">Added {timeAgo(lead.syncedAt)}</p>
                            </div>
                          </div>
                          {/* Actions */}
                          {!isLocked && (
                          <div className="flex flex-col gap-1.5 shrink-0 relative">
                            {lead.status !== "contacted" && lead.status !== "hired" && (
                              <Button
                                size="sm"
                                variant="default"
                                className="text-xs h-7 px-3"
                                onClick={() => setContactLeadId(contactLeadId === lead.id ? null : lead.id)}
                              >
                                Contact
                              </Button>
                            )}
                            {lead.status === "contacted" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => updateLeadStatus.mutate({ leadId: lead.id, status: "hired" })}
                                >
                                  Mark Hired
                                </Button>
                                {lead.email && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-3"
                                    onClick={() => setSendApplyLeadId(sendApplyLeadId === lead.id ? null : lead.id)}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    Send Apply Link
                                  </Button>
                                )}
                              </>
                            )}
                            {lead.status !== "dismissed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 px-3 text-muted-foreground"
                                onClick={() => updateLeadStatus.mutate({ leadId: lead.id, status: "dismissed" })}
                              >
                                Dismiss
                              </Button>
                            )}
                            {/* Click-outside backdrop for popups */}
                            {(contactLeadId === lead.id || sendApplyLeadId === lead.id) && (
                              <div className="fixed inset-0 z-10" onClick={() => { setContactLeadId(null); setSendApplyLeadId(null); }} />
                            )}
                            {/* Contact popup */}
                            {contactLeadId === lead.id && (
                              <div className="absolute right-0 top-8 z-20 w-56 border border-border bg-card shadow-lg p-3 space-y-2 overflow-hidden">
                                <p className="text-xs font-semibold mb-2 truncate">Contact {lead.fullName}</p>
                                {lead.phone && (
                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors overflow-hidden"
                                    onClick={() => {
                                      updateLeadStatus.mutate({ leadId: lead.id, status: "contacted" });
                                      setContactLeadId(null);
                                    }}
                                  >
                                    <PhoneIcon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">Call {lead.phone}</span>
                                  </a>
                                )}
                                {lead.email && (
                                  <a
                                    href={`mailto:${lead.email}`}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors overflow-hidden"
                                    onClick={() => {
                                      updateLeadStatus.mutate({ leadId: lead.id, status: "contacted" });
                                      setContactLeadId(null);
                                    }}
                                  >
                                    <MailIcon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">Email {lead.email}</span>
                                  </a>
                                )}
                                {!lead.phone && !lead.email && (
                                  <p className="text-xs text-muted-foreground">No contact info available.</p>
                                )}
                                <button
                                  className="text-[10px] text-muted-foreground hover:text-foreground mt-1"
                                  onClick={() => setContactLeadId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            {/* Send Apply Link job picker */}
                            {sendApplyLeadId === lead.id && (
                              <div className="absolute right-0 top-8 z-20 w-64 border border-border bg-card shadow-lg p-3 space-y-2">
                                <p className="text-xs font-semibold mb-2">Send apply link to {lead.fullName}</p>
                                {jobs.filter((j) => !j.status || j.status === "Active").length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No active jobs. Post a job first.</p>
                                ) : (
                                  <div className="max-h-48 overflow-y-auto space-y-1">
                                    {jobs.filter((j) => !j.status || j.status === "Active").map((job) => {
                                      const applyUrl = `${window.location.origin}/jobs/${job.id}`;
                                      const subject = encodeURIComponent(`Apply for: ${job.title}`);
                                      const body = encodeURIComponent(
                                        `Hi ${lead.fullName},\n\nWe think you'd be a great fit for our "${job.title}" position.\n\nClick the link below to view the job and apply:\n${applyUrl}\n\nLooking forward to hearing from you!`
                                      );
                                      const mailto = `mailto:${lead.email}?subject=${subject}&body=${body}`;
                                      return (
                                        <a
                                          key={job.id}
                                          href={mailto}
                                          className="flex items-center gap-2 w-full px-3 py-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
                                          onClick={() => setSendApplyLeadId(null)}
                                        >
                                          <Send className="h-3 w-3 shrink-0" />
                                          <span className="truncate">{job.title}</span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                                <button
                                  className="text-[10px] text-muted-foreground hover:text-foreground mt-1"
                                  onClick={() => setSendApplyLeadId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm">
                      <span className="text-muted-foreground">
                        Showing {leadPage * LEAD_PAGE_SIZE + 1}–{Math.min((leadPage + 1) * LEAD_PAGE_SIZE, filtered.length)} of {filtered.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setLeadPage((p) => p - 1)} disabled={leadPage === 0}>
                          Previous
                        </Button>
                        <span className="text-muted-foreground text-xs">{leadPage + 1} / {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setLeadPage((p) => p + 1)} disabled={leadPage >= totalPages - 1}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Dismissed section — collapsible */}
              {dismissedLeads.length > 0 && (() => {
                const DISMISSED_PAGE_SIZE = 10;
                const searchedDismissed = dismissedSearch
                  ? dismissedLeads.filter((l) => {
                      const q = dismissedSearch.toLowerCase();
                      return l.fullName.toLowerCase().includes(q) || (l.email ?? "").toLowerCase().includes(q) || (l.phone ?? "").includes(q) || (l.state ?? "").toLowerCase().includes(q);
                    })
                  : dismissedLeads;
                const dismissedTotalPages = Math.ceil(searchedDismissed.length / DISMISSED_PAGE_SIZE);
                const pageDismissed = searchedDismissed.slice(dismissedPage * DISMISSED_PAGE_SIZE, (dismissedPage + 1) * DISMISSED_PAGE_SIZE);

                return (
                  <div className="mt-6 border border-border bg-card">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => { setShowDismissed(!showDismissed); setDismissedPage(0); setDismissedSearch(""); }}
                    >
                      <span className="font-medium">Dismissed ({dismissedLeads.length})</span>
                      {showDismissed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showDismissed && (
                      <div className="px-4 pb-4 space-y-3">
                        {dismissedLeads.length > DISMISSED_PAGE_SIZE && (
                          <Input
                            placeholder="Search dismissed leads..."
                            value={dismissedSearch}
                            onChange={(e) => { setDismissedSearch(e.target.value); setDismissedPage(0); }}
                            className="h-8 text-xs"
                          />
                        )}
                        <div className="space-y-2">
                          {pageDismissed.map((lead) => (
                            <div key={lead.id} className="flex items-center justify-between border border-border p-3 opacity-60">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-sm truncate">{lead.fullName}</span>
                                {lead.state && <span className="text-xs text-muted-foreground shrink-0">{lead.state}</span>}
                                {lead.phone && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{lead.phone}</span>}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 px-3 shrink-0"
                                onClick={() => updateLeadStatus.mutate({ leadId: lead.id, status: "new" })}
                              >
                                Restore
                              </Button>
                            </div>
                          ))}
                          {searchedDismissed.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">No matches.</p>
                          )}
                        </div>
                        {dismissedTotalPages > 1 && (
                          <div className="flex items-center justify-between text-sm pt-1">
                            <span className="text-xs text-muted-foreground">
                              {dismissedPage * DISMISSED_PAGE_SIZE + 1}–{Math.min((dismissedPage + 1) * DISMISSED_PAGE_SIZE, searchedDismissed.length)} of {searchedDismissed.length}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDismissedPage((p) => p - 1)} disabled={dismissedPage === 0}>
                                Prev
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDismissedPage((p) => p + 1)} disabled={dismissedPage >= dismissedTotalPages - 1}>
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ── Tab: Hired ──────────────────────────────────────────────────────── */}
        {activeTab === "hired" && (() => {
          const hiredLeads = leads.filter((l) => l.status === "hired");

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Hired Drivers ({hiredLeads.length})
                </h2>
              </div>

              {hiredLeads.length === 0 ? (
                <div className="border border-dashed border-border p-12 text-center">
                  <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No hired drivers yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mark leads as hired from the Leads tab to see them here.
                  </p>
                </div>
              ) : (
                <div className="border border-border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Phone</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">State</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Experience</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hiredLeads.map((lead) => (
                        <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{lead.fullName}</td>
                          <td className="px-4 py-3">
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="text-primary hover:underline flex items-center gap-1">
                                <PhoneIcon className="h-3 w-3" />{lead.phone}
                              </a>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {lead.email ? (
                              <a href={`mailto:${lead.email}`} className="text-primary hover:underline flex items-center gap-1">
                                <MailIcon className="h-3 w-3" />{lead.email}
                              </a>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {lead.state ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                <MapPin className="h-3 w-3" />{lead.state}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs">{lead.yearsExp ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${lead.isOwnerOp ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                              {lead.isOwnerOp ? "Owner Op" : "Company"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
                              onClick={() => updateLeadStatus.mutate({ leadId: lead.id, status: "contacted" })}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Tab: Analytics ─────────────────────────────────────────────────── */}
        {activeTab === "analytics" && (() => {
          const total = applications.length;
          const stageCounts = (["New", "Reviewing", "Interview", "Hired", "Rejected"] as PipelineStage[]).reduce<Record<string, number>>(
            (acc, s) => {
              acc[s] = applications.filter((a) => a.pipeline_stage === s).length;
              return acc;
            }, {}
          );
          const activeJobs = jobs.filter((j) => !j.status || j.status === "Active").length;
          const hireRate = total > 0 ? Math.round((stageCounts["Hired"] / total) * 100) : 0;
          const rejectRate = total > 0 ? Math.round((stageCounts["Rejected"] / total) * 100) : 0;

          const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
            <div className="border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="font-display font-bold text-3xl text-foreground">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
          );

          return (
            <div className="space-y-6">
              <h2 className="font-display font-semibold text-base">Analytics Overview</h2>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Active Leads" value={leads.filter(l => l.status !== "dismissed").length} sub={`${leads.filter(l => l.status === "hired").length} hired`} />
                <StatCard label="Total Applications" value={total} sub="all time" />
                <StatCard label="Active Jobs" value={activeJobs} sub={`of ${jobs.length} total`} />
                <StatCard label="Hire Rate" value={`${hireRate}%`} sub={`${stageCounts["Hired"]} hired from apps`} />
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
                          <span className="font-medium">{stage}</span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${colors[stage]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lead funnel */}
              <div className="border border-border bg-card p-5">
                <p className="font-semibold text-sm mb-4">Lead Funnel</p>
                {leads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No leads synced yet.</p>
                ) : (() => {
                  const leadStatuses = ["new", "contacted", "hired", "dismissed"] as const;
                  const leadCounts = leadStatuses.reduce<Record<string, number>>((acc, s) => {
                    acc[s] = leads.filter((l) => l.status === s).length;
                    return acc;
                  }, {});
                  const leadColors: Record<string, string> = {
                    new: "bg-blue-500",
                    contacted: "bg-yellow-500",
                    hired: "bg-green-500",
                    dismissed: "bg-slate-400",
                  };
                  const leadLabels: Record<string, string> = {
                    new: "New",
                    contacted: "Contacted",
                    hired: "Hired",
                    dismissed: "Dismissed",
                  };
                  return (
                    <div className="space-y-3">
                      {(() => {
                        const activeFunnel = leads.length - leadCounts["dismissed"];
                        const convRate = activeFunnel > 0 ? Math.round((leadCounts["hired"] / activeFunnel) * 100) : 0;
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <div className="text-center">
                              <p className="font-display font-bold text-2xl">{activeFunnel}</p>
                              <p className="text-xs text-muted-foreground">Active Leads</p>
                            </div>
                            <div className="text-center">
                              <p className="font-display font-bold text-2xl text-yellow-500">{leadCounts["contacted"]}</p>
                              <p className="text-xs text-muted-foreground">Contacted</p>
                            </div>
                            <div className="text-center">
                              <p className="font-display font-bold text-2xl text-green-500">{leadCounts["hired"]}</p>
                              <p className="text-xs text-muted-foreground">Hired</p>
                            </div>
                            <div className="text-center">
                              <p className="font-display font-bold text-2xl">{convRate}%</p>
                              <p className="text-xs text-muted-foreground">Conversion Rate</p>
                            </div>
                          </div>
                        );
                      })()}
                      {leadStatuses.map((s) => {
                        const count = leadCounts[s] ?? 0;
                        const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                        return (
                          <div key={s}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{leadLabels[s]}</span>
                              <span className="text-muted-foreground">{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${leadColors[s]}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Job status breakdown */}
              <div className="border border-border bg-card p-5">
                <p className="font-semibold text-sm mb-4">Job Status Breakdown</p>
                {jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No jobs posted yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(["Active", "Draft", "Paused", "Closed"] as const).map((status) => {
                      const cnt = jobs.filter((j) => (j.status ?? "Active") === status).length;
                      const badgeColor: Record<string, string> = {
                        Active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                        Draft: "bg-muted text-muted-foreground",
                        Paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                        Closed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                      };
                      return (
                        <div key={status} className="border border-border p-3 text-center">
                          <p className={`text-xs font-semibold px-2 py-0.5 inline-block rounded-full mb-2 ${badgeColor[status]}`}>{status}</p>
                          <p className="font-display font-bold text-2xl">{cnt}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {total === 0 && (
                <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No data yet. Analytics will appear here as applications are received.
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Tab: Subscription ────────────────────────────────────────────── */}
        {activeTab === "subscription" && (() => {
          const plan = subscription?.plan ?? "free";
          const planInfo = PLANS[plan];
          const isFreePlan = plan === "free";

          return (
            <div className="space-y-6">
              <h2 className="font-display font-semibold text-base">
                Subscription Management
              </h2>

              {/* Current plan card */}
              <div className="border border-border bg-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Plan</p>
                    <p className="font-display font-bold text-2xl">{planInfo.label}</p>
                    {!isFreePlan && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${planInfo.price}/month
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 font-semibold rounded-full ${
                    plan === "unlimited"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      : plan === "growth"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : plan === "starter"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {subscription?.status ?? "active"}
                  </span>
                </div>

                {/* Lead usage */}
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Leads Used</span>
                    <span className="font-medium">
                      {subscription?.leadsUsed ?? 0} / {planInfo.leads === 9999 ? "Unlimited" : planInfo.leads}
                    </span>
                  </div>
                  {planInfo.leads !== 9999 && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(((subscription?.leadsUsed ?? 0) / planInfo.leads) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Renewal date */}
                {subscription?.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Plan comparison */}
              <div className="border border-border bg-card p-6">
                <p className="font-semibold text-sm mb-4">All Plans</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((p) => {
                    const info = PLANS[p];
                    const isCurrent = p === plan;
                    return (
                      <div
                        key={p}
                        className={`border p-4 rounded ${
                          isCurrent
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <p className="font-semibold text-sm">{info.label}</p>
                        <p className="font-display font-bold text-xl mt-1">
                          {info.price === 0 ? "Free" : `$${info.price}`}
                          {info.price > 0 && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {info.leads === 9999 ? "Unlimited" : info.leads} leads/month
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-primary font-medium mt-2">Current plan</p>
                        )}
                        {!isCurrent && p !== "free" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full text-xs"
                            onClick={() => navigate("/pricing")}
                          >
                            Upgrade
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manage Billing */}
              {!isFreePlan && subscription?.stripeCustomerId && (
                <div className="border border-border bg-card p-6">
                  <p className="font-semibold text-sm">
                    Manage Billing
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    View invoices, update payment method, or cancel your subscription via the Stripe billing portal.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={portalLoading}
                    onClick={async () => {
                      try {
                        setPortalLoading(true);
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;

                        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`;
                        const res = await fetch(fnUrl, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session.access_token}`,
                          },
                        });
                        if (!res.ok) throw new Error("Failed to open billing portal");

                        const { url } = await res.json();
                        window.location.href = url;
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
                      } finally {
                        setPortalLoading(false);
                      }
                    }}
                  >
                    {portalLoading ? "Opening..." : "Open Billing Portal"}
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
