import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useApplication } from "@/hooks/useApplication";
import { useAuth } from "@/context/auth";
import { SignInModal } from "@/components/SignInModal";
import { Truck, CheckCircle2 } from "lucide-react";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const DRIVER_TYPE_LABELS: Record<string, string> = {
  company: "Company Driver",
  "owner-operator": "Owner Operator",
  lease: "Lease Operator",
  student: "Student / Trainee",
};

const LICENSE_CLASS_LABELS: Record<string, string> = {
  a: "Class A",
  b: "Class B",
  c: "Class C",
  permit: "Permit Only",
};

// Reusable toggle row: label on left, OFF · switch · ON on right
const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-foreground">{label}</span>
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-medium ${!checked ? "text-foreground" : "text-muted-foreground"}`}>OFF</span>
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=unchecked]:bg-muted" />
      <span className={`text-xs font-medium ${checked ? "text-primary" : "text-muted-foreground"}`}>ON</span>
    </div>
  </div>
);

// Section header with left red border accent
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-l-4 border-primary bg-primary/5 px-3 py-2 mb-4">
    <p className="text-primary text-sm font-semibold">{children}</p>
  </div>
);

const ApplyNow = () => {
  // All hooks must be declared before any conditional return
  const { user } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const { load, save } = useApplication();
  const saved = load();

  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState(saved.firstName ?? "");
  const [lastName, setLastName] = useState(saved.lastName ?? "");
  const [email, setEmail] = useState(saved.email ?? "");
  const [phone, setPhone] = useState(saved.phone ?? "");
  const [cdlNumber, setCdlNumber] = useState(saved.cdlNumber ?? "");
  const [zipCode, setZipCode] = useState(saved.zipCode ?? "");
  const [date, setDate] = useState(saved.date ?? "");
  const [driverType, setDriverType] = useState(saved.driverType ?? "");
  const [licenseClass, setLicenseClass] = useState(saved.licenseClass ?? "");
  const [yearsExp, setYearsExp] = useState(saved.yearsExp ?? "");
  const [licenseState, setLicenseState] = useState(saved.licenseState ?? "");
  const [soloTeam, setSoloTeam] = useState(saved.soloTeam ?? "Solo");
  const [notes, setNotes] = useState(saved.notes ?? "");
  const [prefs, setPrefs] = useState({
    betterPay: false, betterHomeTime: false,
    healthInsurance: false, bonuses: false,
    newEquipment: false,
    ...(saved.prefs ?? {}),
  });
  const [endorse, setEndorse] = useState({
    doublesTriples: false, hazmat: false,
    tankVehicles: false, tankerHazmat: false,
    ...(saved.endorse ?? {}),
  });
  const [hauler, setHauler] = useState({
    box: false, carHaul: false, dropAndHook: false,
    dryBulk: false, dryVan: false, flatbed: false,
    hopperBottom: false, intermodal: false, oilField: false,
    oversizeLoad: false, refrigerated: false, tanker: false,
    ...(saved.hauler ?? {}),
  });
  const [route, setRoute] = useState({
    dedicated: false, local: false, ltl: false,
    otr: false, regional: false,
    ...(saved.route ?? {}),
  });
  const [extra, setExtra] = useState({
    leasePurchase: false, accidents: false,
    suspended: false, newsletters: false,
    ...(saved.extra ?? {}),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auth gate — guests and company accounts cannot use this form
  if (!user || user.role === "company") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-16 max-w-xl text-center">
          <p className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="text-primary hover:underline">Main</Link>
            <span className="mx-1">»</span>
            Add Application
          </p>
          <div className="border border-border bg-card p-12">
            <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            {!user ? (
              <>
                <h2 className="font-display font-bold text-lg mb-2">Sign in to apply</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  You need a driver account to submit an application.
                </p>
                <Button onClick={() => setSignInOpen(true)}>Sign In / Register</Button>
              </>
            ) : (
              <>
                <h2 className="font-display font-bold text-lg mb-2">Not available</h2>
                <p className="text-sm text-muted-foreground">
                  Company accounts cannot submit driver applications.
                </p>
              </>
            )}
          </div>
        </main>
        <Footer />
        {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
      </div>
    );
  }

  // Confirmation screen after successful submission
  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-8 max-w-3xl">
          <p className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="text-primary hover:underline">Main</Link>
            <span className="mx-1">»</span>
            Add Application
          </p>
          <div className="border border-border bg-card p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="font-display font-bold text-2xl mb-2">Application Submitted!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              <strong>{firstName} {lastName}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {DRIVER_TYPE_LABELS[driverType] ?? driverType} &mdash; {LICENSE_CLASS_LABELS[licenseClass] ?? licenseClass}
            </p>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              Your application has been received. You can track its status from your driver dashboard.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button asChild>
                <Link to="/driver-dashboard">View My Applications</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/jobs">Browse Jobs</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tog = <T extends Record<string, boolean>>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T) =>
    (v: boolean) => setter((prev) => ({ ...prev, [key]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!phone.trim()) e.phone = "Phone is required";
    if (!cdlNumber.trim()) e.cdlNumber = "CDL number is required";
    if (!zipCode.trim()) e.zipCode = "Zip code is required";
    else if (!/^\d{5}(-\d{4})?$/.test(zipCode)) e.zipCode = "Enter a valid zip code";
    if (!driverType) e.driverType = "Select a driver type";
    if (!licenseClass) e.licenseClass = "Select a license class";
    if (!yearsExp) e.yearsExp = "Select years of experience";
    if (!licenseState) e.licenseState = "Select your license state";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the errors before submitting.");
      return;
    }
    setErrors({});
    const data = {
      firstName, lastName, email, phone, cdlNumber, zipCode, date,
      driverType, licenseClass, yearsExp, licenseState, soloTeam, notes,
      prefs, endorse, hauler, route, extra,
    };
    save(data);

    // Track in driver's own application history
    const KEY_HISTORY = "cdl-driver-applications";
    const history = JSON.parse(localStorage.getItem(KEY_HISTORY) ?? "[]");
    const appId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    history.push({ ...data, id: appId, companyName: "General Application", jobId: null, jobTitle: "General Application", submittedAt: new Date().toISOString() });
    localStorage.setItem(KEY_HISTORY, JSON.stringify(history));

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto py-8 max-w-3xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          Add Application
        </p>

        <form onSubmit={handleSubmit} className="bg-card border border-border shadow-sm">
          {/* Form title */}
          <div className="border-l-4 border-primary px-4 py-3 mb-6 mx-6 mt-6">
            <p className="font-semibold text-foreground">Let's Get Started!</p>
          </div>

          <div className="px-6 pb-8 space-y-8">

            {/* Job preferences */}
            <div>
              <SectionHeader>What do you want in your next job selections?</SectionHeader>
              <div className="grid sm:grid-cols-2 gap-x-12 gap-y-1">
                <ToggleRow label="Better pay" checked={prefs.betterPay} onChange={tog(setPrefs, "betterPay")} />
                <ToggleRow label="Better home time" checked={prefs.betterHomeTime} onChange={tog(setPrefs, "betterHomeTime")} />
                <ToggleRow label="Health Insurance" checked={prefs.healthInsurance} onChange={tog(setPrefs, "healthInsurance")} />
                <ToggleRow label="Bonuses" checked={prefs.bonuses} onChange={tog(setPrefs, "bonuses")} />
                <ToggleRow label="New equipment" checked={prefs.newEquipment} onChange={tog(setPrefs, "newEquipment")} />
              </div>
            </div>

            {/* Basic info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Input placeholder="First name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={errors.firstName ? "border-destructive" : ""} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-1">
                <Input placeholder="Last name *" value={lastName} onChange={(e) => setLastName(e.target.value)} className={errors.lastName ? "border-destructive" : ""} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
              <div className="space-y-1">
                <Input placeholder="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? "border-destructive" : ""} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1">
                <Input placeholder="Phone *" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={errors.phone ? "border-destructive" : ""} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
              <div className="space-y-1">
                <Input placeholder="CDL # *" value={cdlNumber} onChange={(e) => setCdlNumber(e.target.value)} className={errors.cdlNumber ? "border-destructive" : ""} />
                {errors.cdlNumber && <p className="text-xs text-destructive">{errors.cdlNumber}</p>}
              </div>
              <div className="space-y-1">
                <Input placeholder="Zip Code *" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className={errors.zipCode ? "border-destructive" : ""} />
                {errors.zipCode && <p className="text-xs text-destructive">{errors.zipCode}</p>}
              </div>
              <div className="space-y-1">
                <Input placeholder="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {/* Driving experience */}
            <div>
              <SectionHeader>Tell us about your driving experience.</SectionHeader>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Driver Type *</Label>
                  <Select value={driverType} onValueChange={(v) => { setDriverType(v); setErrors((p) => ({ ...p, driverType: "" })); }}>
                    <SelectTrigger className={errors.driverType ? "border-destructive" : ""}><SelectValue placeholder="Owner Operator" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Company Driver</SelectItem>
                      <SelectItem value="owner-operator">Owner Operator</SelectItem>
                      <SelectItem value="lease">Lease Operator</SelectItem>
                      <SelectItem value="student">Student / Trainee</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.driverType && <p className="text-xs text-destructive">{errors.driverType}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">License Class *</Label>
                  <Select value={licenseClass} onValueChange={(v) => { setLicenseClass(v); setErrors((p) => ({ ...p, licenseClass: "" })); }}>
                    <SelectTrigger className={errors.licenseClass ? "border-destructive" : ""}><SelectValue placeholder="Class A" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Class A</SelectItem>
                      <SelectItem value="b">Class B</SelectItem>
                      <SelectItem value="c">Class C</SelectItem>
                      <SelectItem value="permit">Permit Only</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.licenseClass && <p className="text-xs text-destructive">{errors.licenseClass}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Years Experience *</Label>
                  <Select value={yearsExp} onValueChange={(v) => { setYearsExp(v); setErrors((p) => ({ ...p, yearsExp: "" })); }}>
                    <SelectTrigger className={errors.yearsExp ? "border-destructive" : ""}><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="less-1">Less than 1 year</SelectItem>
                      <SelectItem value="1-3">1–3 years</SelectItem>
                      <SelectItem value="3-5">3–5 years</SelectItem>
                      <SelectItem value="5+">5+ years</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.yearsExp && <p className="text-xs text-destructive">{errors.yearsExp}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">License State *</Label>
                  <Select value={licenseState} onValueChange={(v) => { setLicenseState(v); setErrors((p) => ({ ...p, licenseState: "" })); }}>
                    <SelectTrigger className={errors.licenseState ? "border-destructive" : ""}><SelectValue placeholder="Alabama" /></SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.licenseState && <p className="text-xs text-destructive">{errors.licenseState}</p>}
                </div>
              </div>
            </div>

            {/* Endorsements */}
            <div>
              <SectionHeader>Endorsements (optional):</SectionHeader>
              <div className="grid sm:grid-cols-2 gap-x-12 gap-y-1">
                <ToggleRow label="Doubles/Triples (T)" checked={endorse.doublesTriples} onChange={tog(setEndorse, "doublesTriples")} />
                <ToggleRow label="HAZMAT (H)" checked={endorse.hazmat} onChange={tog(setEndorse, "hazmat")} />
                <ToggleRow label="Tank Vehicles (N)" checked={endorse.tankVehicles} onChange={tog(setEndorse, "tankVehicles")} />
                <ToggleRow label="Tanker + HAZMAT (X)" checked={endorse.tankerHazmat} onChange={tog(setEndorse, "tankerHazmat")} />
              </div>
            </div>

            {/* Hauler experience */}
            <div>
              <SectionHeader>Hauler Experience:</SectionHeader>
              <div className="grid sm:grid-cols-3 gap-x-8 gap-y-1">
                <ToggleRow label="Box" checked={hauler.box} onChange={tog(setHauler, "box")} />
                <ToggleRow label="Car Hauler" checked={hauler.carHaul} onChange={tog(setHauler, "carHaul")} />
                <ToggleRow label="Drop and Hook" checked={hauler.dropAndHook} onChange={tog(setHauler, "dropAndHook")} />
                <ToggleRow label="Dry Bulk" checked={hauler.dryBulk} onChange={tog(setHauler, "dryBulk")} />
                <ToggleRow label="Dry Van" checked={hauler.dryVan} onChange={tog(setHauler, "dryVan")} />
                <ToggleRow label="Flatbed" checked={hauler.flatbed} onChange={tog(setHauler, "flatbed")} />
                <ToggleRow label="Hopper Bottom" checked={hauler.hopperBottom} onChange={tog(setHauler, "hopperBottom")} />
                <ToggleRow label="Intermodal" checked={hauler.intermodal} onChange={tog(setHauler, "intermodal")} />
                <ToggleRow label="Oil Field" checked={hauler.oilField} onChange={tog(setHauler, "oilField")} />
                <ToggleRow label="Oversize Load" checked={hauler.oversizeLoad} onChange={tog(setHauler, "oversizeLoad")} />
                <ToggleRow label="Refrigerated" checked={hauler.refrigerated} onChange={tog(setHauler, "refrigerated")} />
                <ToggleRow label="Tanker" checked={hauler.tanker} onChange={tog(setHauler, "tanker")} />
              </div>
            </div>

            {/* Route preference */}
            <div>
              <SectionHeader>Route Preference:</SectionHeader>
              <div className="grid sm:grid-cols-3 gap-x-8 gap-y-1">
                <ToggleRow label="Dedicated" checked={route.dedicated} onChange={tog(setRoute, "dedicated")} />
                <ToggleRow label="Local" checked={route.local} onChange={tog(setRoute, "local")} />
                <ToggleRow label="LTL" checked={route.ltl} onChange={tog(setRoute, "ltl")} />
                <ToggleRow label="OTR" checked={route.otr} onChange={tog(setRoute, "otr")} />
                <ToggleRow label="Regional" checked={route.regional} onChange={tog(setRoute, "regional")} />
              </div>
            </div>

            <Separator />

            {/* Additional questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Interested in solo or team driving?</span>
                <Select value={soloTeam} onValueChange={setSoloTeam}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solo">Solo</SelectItem>
                    <SelectItem value="Team">Team</SelectItem>
                    <SelectItem value="Either">Either</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ToggleRow label="Interested in lease purchase?" checked={extra.leasePurchase} onChange={tog(setExtra, "leasePurchase")} />
              <ToggleRow label="Have you had any accidents or violations in the past 3 years?" checked={extra.accidents} onChange={tog(setExtra, "accidents")} />
              <ToggleRow label="Have you had your license suspended or DUI/DWI charges in the past 10 years?" checked={extra.suspended} onChange={tog(setExtra, "suspended")} />
              <ToggleRow label="Yes! Sign me up to receive newsletters and job alerts" checked={extra.newsletters} onChange={tog(setExtra, "newsletters")} />
            </div>

            {/* Notes area */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Message to companies (optional):</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell companies about yourself, your experience, or anything else you'd like them to know..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {notes.trim() ? notes.trim().split(/\s+/).length : 0} words
              </p>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center gap-3">
              <Button type="submit" className="px-8">Send Application</Button>
            </div>

          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default ApplyNow;
