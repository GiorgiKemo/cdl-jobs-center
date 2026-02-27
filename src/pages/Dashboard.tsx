import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, X, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

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

type Tab = "jobs" | "applications" | "pipeline" | "profile" | "analytics";

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

  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const [appPage, setAppPage] = useState(0);
  const APP_PAGE_SIZE = 10;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

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
        .order("submitted_at", { ascending: false });
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
      toast.error(err instanceof Error ? err.message : "Failed to save job.");
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
      .update({ pipeline_stage: stage })
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

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.from("company_profiles").upsert({
        id: user!.id,
        company_name: profileName,
        email: profileEmail,
        phone: profilePhone,
        address: profileAddress,
        about: profileAbout,
        website: profileWebsite,
        logo_url: profileLogo || null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Profile saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "applications") setAppPage(0);
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
        <div className="bg-foreground text-background dark:bg-muted dark:text-foreground border border-border px-5 py-4 mb-6">
          <h1 className="font-display font-bold text-lg">Welcome, {user!.name}</h1>
          <p className="text-sm opacity-70 mt-0.5">Company Dashboard</p>
        </div>

        {/* Tab bar */}
        <div className="border-b border-border mb-6 flex overflow-x-auto">
          <button className={tabClass("jobs")} onClick={() => switchTab("jobs")}>
            My Jobs ({jobs.length})
          </button>
          <button className={tabClass("applications")} onClick={() => switchTab("applications")}>
            Applications ({applications.length})
          </button>
          <button className={tabClass("pipeline")} onClick={() => switchTab("pipeline")}>
            Pipeline ({applications.length})
          </button>
          <button className={tabClass("profile")} onClick={() => switchTab("profile")}>
            Company Profile
          </button>
          <button className={tabClass("analytics")} onClick={() => switchTab("analytics")}>
            Analytics
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
                  <Button onClick={handleSaveJob} size="sm" className="px-6">
                    {editingId ? "Update Job" : "Save Job"}
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
              <Button onClick={handleSaveProfile} className="px-8">Save Changes</Button>
            </div>
          </div>
        )}

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
                <StatCard label="Total Applications" value={total} sub="all time" />
                <StatCard label="Active Jobs" value={activeJobs} sub={`of ${jobs.length} total`} />
                <StatCard label="Hire Rate" value={`${hireRate}%`} sub={`${stageCounts["Hired"]} hired`} />
                <StatCard label="Rejection Rate" value={`${rejectRate}%`} sub={`${stageCounts["Rejected"]} rejected`} />
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
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
