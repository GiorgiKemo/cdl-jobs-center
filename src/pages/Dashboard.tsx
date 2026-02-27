import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useJobs } from "@/hooks/useJobs";
import { Job } from "@/data/jobs";
import { toast } from "sonner";
import { Pencil, Trash2, ChevronDown, ChevronUp, Plus, X, Upload } from "lucide-react";

const FREIGHT_TYPES = [
  "Box", "Car Hauler", "Drop and Hook", "Dry Bulk", "Dry Van", "Flatbed",
  "Hopper Bottom", "Intermodal", "Oil Field", "Oversize Load",
  "Refrigerated", "Tanker", "Yard Spotter", "Owner Operator", "Students", "Teams",
];

const DRIVER_TYPES = ["Owner Operator", "Company Driver", "Student"];
const ROUTE_TYPES = ["OTR", "Local", "Regional", "Dedicated", "LTL"];
const TEAM_OPTIONS = ["Solo", "Team", "Both"];

interface ReceivedApplication {
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
};

// Tab identifier
type Tab = "jobs" | "applications" | "profile";

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

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loadAll, add, update, remove } = useJobs();

  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Applications
  const [applications, setApplications] = useState<ReceivedApplication[]>([]);

  // Profile settings
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileAbout, setProfileAbout] = useState("");
  const [profileWebsite, setProfileWebsite] = useState("");
  const [profileLogo, setProfileLogo] = useState("");

  // Access guard — company only
  useEffect(() => {
    if (!user || user.role !== "company") {
      toast.error("Dashboard is available for company accounts only.");
      navigate("/");
    }
  }, [user, navigate]);

  // Load jobs for this company
  useEffect(() => {
    if (user) {
      setJobs(loadAll().filter((j) => j.company === user.name));
    }
  }, [user]);

  // Load applications for this company
  useEffect(() => {
    if (user) {
      try {
        const stored = localStorage.getItem("cdl-applications-received");
        const all: ReceivedApplication[] = stored ? JSON.parse(stored) : [];
        setApplications(all.filter((a) => a.companyName === user.name));
      } catch {
        setApplications([]);
      }
    }
  }, [user]);

  // Load profile settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cdl-company-profile");
      if (stored) {
        const p = JSON.parse(stored);
        setProfileName(p.name ?? user?.name ?? "");
        setProfilePhone(p.phone ?? "");
        setProfileAddress(p.address ?? "");
        setProfileAbout(p.about ?? "");
        setProfileWebsite(p.website ?? "");
      } else if (user) {
        setProfileName(user.name);
      }
      // Load logo from the logos map
      const logos = JSON.parse(localStorage.getItem("cdl-company-logos") ?? "{}");
      setProfileLogo(logos[user?.name ?? ""] ?? "");
    } catch {
      if (user) setProfileName(user.name);
    }
  }, [user]);

  if (!user || user.role !== "company") return null;

  const refreshJobs = () => {
    setJobs(loadAll().filter((j) => j.company === user.name));
  };

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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
    });
    setEditingId(job.id);
    setShowForm(true);
  };

  const handleSaveJob = () => {
    if (!form.title.trim()) {
      toast.error("Job title is required.");
      return;
    }
    if (editingId) {
      update(editingId, { ...form });
      toast.success("Job updated.");
    } else {
      add({ ...form, company: user.name });
      toast.success("Job posted successfully.");
    }
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    refreshJobs();
  };

  const handleDeleteJob = (id: string) => {
    remove(id);
    refreshJobs();
    toast.success("Job removed.");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfileLogo(reader.result as string);
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";
  };

  const handleSaveProfile = () => {
    localStorage.setItem(
      "cdl-company-profile",
      JSON.stringify({
        name: profileName,
        phone: profilePhone,
        address: profileAddress,
        about: profileAbout,
        website: profileWebsite,
      })
    );
    // Save logo in a shared map keyed by company name so JobDetail can look it up
    const logos = JSON.parse(localStorage.getItem("cdl-company-logos") ?? "{}");
    if (profileLogo) {
      logos[user.name] = profileLogo;
    } else {
      delete logos[user.name];
    }
    localStorage.setItem("cdl-company-logos", JSON.stringify(logos));
    toast.success("Profile saved.");
  };

  const tabClass = (tab: Tab) =>
    `px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
    }`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8 max-w-5xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          Dashboard
        </p>

        {/* Welcome header */}
        <div className="bg-foreground text-background dark:bg-muted dark:text-foreground border border-border px-5 py-4 mb-6">
          <h1 className="font-display font-bold text-lg">Welcome, {user.name}</h1>
          <p className="text-sm opacity-70 mt-0.5">Company Dashboard</p>
        </div>

        {/* Tab bar */}
        <div className="border-b border-border mb-6 flex">
          <button className={tabClass("jobs")} onClick={() => setActiveTab("jobs")}>
            My Jobs ({jobs.length})
          </button>
          <button className={tabClass("applications")} onClick={() => setActiveTab("applications")}>
            Applications ({applications.length})
          </button>
          <button className={tabClass("profile")} onClick={() => setActiveTab("profile")}>
            Profile Settings
          </button>
        </div>

        {/* ── Tab: My Jobs ─────────────────────────────────────────────────── */}
        {activeTab === "jobs" && (
          <div>
            {/* Header row */}
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
                  <h3 className="font-semibold text-sm">
                    {editingId ? "Edit Job" : "New Job Posting"}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="p-1 hover:text-primary transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Job Title *</Label>
                    <Input
                      placeholder="e.g. OTR Dry Van Driver"
                      value={form.title}
                      onChange={(e) => handleFormChange("title", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Driver Type</Label>
                    <Select value={form.driverType} onValueChange={(v) => handleFormChange("driverType", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {DRIVER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Freight Type</Label>
                    <Select value={form.type} onValueChange={(v) => handleFormChange("type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {FREIGHT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Route Type</Label>
                    <Select value={form.routeType} onValueChange={(v) => handleFormChange("routeType", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {ROUTE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Team Driving</Label>
                    <Select value={form.teamDriving} onValueChange={(v) => handleFormChange("teamDriving", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEAM_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <Input
                      placeholder="e.g. Illinois or Nationwide"
                      value={form.location}
                      onChange={(e) => handleFormChange("location", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Pay</Label>
                    <Input
                      placeholder="e.g. $0.65/mile or $1,500/week"
                      value={form.pay}
                      onChange={(e) => handleFormChange("pay", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea
                      placeholder="Describe the position, requirements, and benefits..."
                      value={form.description}
                      onChange={(e) => handleFormChange("description", e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSaveJob} size="sm" className="px-6">
                    {editingId ? "Update Job" : "Save Job"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
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
                      <p className="font-semibold text-foreground">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.driverType || "—"} · {job.routeType || "—"} · {job.location || "—"} · {job.pay || "—"}
                      </p>
                      {job.postedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Posted {new Date(job.postedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditForm(job)}
                        className="flex items-center gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                        className="flex items-center gap-1.5 border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
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
                No applications received yet. Applications will appear here when drivers apply to your company.
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app, i) => (
                  <AppCard key={i} app={app} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Profile Settings ──────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div>
            <h2 className="font-display font-semibold text-base mb-4">Profile Settings</h2>
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
                        <span className="font-display text-3xl font-bold text-primary">{user.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="cursor-pointer inline-block">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border hover:bg-muted transition-colors rounded-sm">
                          <Upload className="h-3.5 w-3.5" />
                          {profileLogo ? "Change Logo" : "Upload Logo"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {profileLogo && (
                        <button
                          type="button"
                          onClick={() => setProfileLogo("")}
                          className="block text-xs text-red-500 hover:underline"
                        >
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
                  <Textarea
                    placeholder="Tell drivers about your company, culture, and opportunities..."
                    value={profileAbout}
                    onChange={(e) => setProfileAbout(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>
              </div>
              <Button onClick={handleSaveProfile} className="px-8">Save Changes</Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
