import { useState, useEffect, useCallback } from "react";
import { X, Mail, RotateCw, Loader2, Check, XCircle, ChevronDown, Sparkles, Truck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";
import { friendlySignInError } from "@/lib/authErrorMessages";
import { getPasswordStrength, type PasswordStrengthLevel } from "@/lib/passwordStrength";
import { US_STATES, DRIVER_INTERESTS, DRIVER_NEXT_JOB, COMPANY_GOALS, COMPANY_DRIVER_TYPES, COMPANY_ENDORSEMENTS } from "@/data/constants";
import { SocialLoginButtons, OrDivider } from "@/components/SocialLoginButtons";
import { withTimeout } from "@/lib/withTimeout";

type View = "login" | "rules" | "register" | "forgot" | "confirm-email";

const RULES_TEXT = `General rules of conduct on the website:

To begin with, hundreds of people of different backgrounds work with CDL Jobs Center, and all of them are full-fledged users of our platform, so if we want a community of people to function, then we need rules. We strongly recommend that you read these rules. It will take just five minutes, but it will save your and our time and will help make the platform more interesting and organized.

Firstly, you should behave respectfully to all visitors on our website. Do not insult other participants — it is always unwanted. If you have a complaint, contact administrators or moderators. We consider insulting other visitors one of the most serious violations and it is severely punished by the administration. Racism, religious and political speech are strictly forbidden. Thank you for your understanding.

The following is strictly prohibited:

- Messages not related to the content of job listings or to the context of the discussion
- Insults and threats to other users
- Expressions that contain profanity, degrading or inciting language
- Spam and advertising of any goods and services not related to CDL job postings

Let us respect each other and the site where drivers and companies come to connect. The Administration reserves the right to remove content, or accounts, if they do not meet these requirements.

If you violate the rules you may be given a warning. In some cases, you may be banned without warning. Contact the Administrator regarding ban removal.

Insulting administrators and moderators is also punishable by a ban — Respect other people's labor.`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;

const REG_DRAFT_KEY = "cdl-reg-draft";

function loadRegDraft(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(REG_DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveRegDraft(fields: Record<string, string>) {
  sessionStorage.setItem(REG_DRAFT_KEY, JSON.stringify(fields));
}

function clearRegDraft() {
  sessionStorage.removeItem(REG_DRAFT_KEY);
}

interface SignInModalProps {
  onClose: () => void;
}

const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
    <div className="flex items-center gap-3">
      <div className="w-1 h-5 bg-primary shrink-0" />
      <h2 className="font-display font-bold text-base">{title}</h2>
    </div>
    <button onClick={onClose} className="p-1 hover:text-primary transition-colors" aria-label="Close">
      <X className="h-5 w-5" />
    </button>
  </div>
);

const strengthGradientByLevel: Record<PasswordStrengthLevel, string> = {
  weak: "from-rose-600 to-red-500",
  fair: "from-amber-500 to-orange-500",
  good: "from-lime-500 to-emerald-500",
  strong: "from-emerald-500 via-teal-500 to-cyan-500",
};

const strengthTextByLevel: Record<PasswordStrengthLevel, string> = {
  weak: "text-destructive",
  fair: "text-amber-700 dark:text-amber-400",
  good: "text-lime-700 dark:text-lime-400",
  strong: "text-emerald-700 dark:text-emerald-400",
};

const formatStrengthLabel = (level: PasswordStrengthLevel) =>
  level.charAt(0).toUpperCase() + level.slice(1);

type SubmitStatus = "idle" | "submitting" | "success" | "error";

function SubmitButtonLabel({ status, idle, working }: { status: SubmitStatus; idle: string; working: string }) {
  if (status === "submitting") return <><Loader2 className="h-4 w-4 animate-spin mr-2" />{working}</>;
  if (status === "success") return <><Check className="h-4 w-4 mr-2" />Done!</>;
  if (status === "error") return <><XCircle className="h-4 w-4 mr-2" />Failed</>;
  return <>{idle}</>;
}

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const width = Math.max((strength.score / 5) * 100, 8);
  const hints: Array<{ ok: boolean; label: string }> = [
    { ok: password.length >= 12, label: "12+ chars" },
    { ok: /[A-Z]/.test(password), label: "uppercase" },
    { ok: /[a-z]/.test(password), label: "lowercase" },
    { ok: /\d/.test(password), label: "number" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "symbol" },
  ];
  const missing = hints.filter((h) => !h.ok).map((h) => h.label);
  const conciseHint =
    missing.length === 0 ? "Looks strong." : `Add ${missing.slice(0, 2).join(" + ")}.`;

  return (
    <div className="space-y-1.5 pt-0.5" aria-live="polite">
      <div className="flex items-center justify-between text-[11px] leading-none">
        <span className="text-muted-foreground">{conciseHint}</span>
        <span className={`font-semibold ${strengthTextByLevel[strength.label]}`}>
          {formatStrengthLabel(strength.label)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out ${strengthGradientByLevel[strength.label]}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

export function SignInModal({ onClose }: SignInModalProps) {
  const [view, setView] = useState<View>("login");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const submitting = submitStatus === "submitting";
  const { signIn, register } = useAuth();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  // Shared register state — hydrate from sessionStorage draft
  const [draft] = useState(loadRegDraft);
  const [role, setRole] = useState<"driver" | "company">((draft.role as "driver" | "company") || "driver");
  const [regEmail, setRegEmail] = useState(draft.regEmail || "");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const passwordsDoNotMatch = regConfirm.length > 0 && regPassword !== regConfirm;
  const [zipError, setZipError] = useState("");

  // Driver-specific
  const [firstName, setFirstName] = useState(draft.firstName || "");
  const [lastName, setLastName] = useState(draft.lastName || "");
  const [homeAddress, setHomeAddress] = useState(draft.homeAddress || "");
  const [zipCode, setZipCode] = useState(draft.zipCode || "");
  const [driverPhone, setDriverPhone] = useState(draft.driverPhone || "");
  const [cdlNumber, setCdlNumber] = useState(draft.cdlNumber || "");
  const [interestedIn, setInterestedIn] = useState<string>(draft.interestedIn || DRIVER_INTERESTS[0]);
  const [nextJobWant, setNextJobWant] = useState<string>(draft.nextJobWant || DRIVER_NEXT_JOB[0]);
  const [hasAccidents, setHasAccidents] = useState(draft.hasAccidents || "No");
  const [wantsContact, setWantsContact] = useState(draft.wantsContact || "Yes");
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Company-specific
  const [contactName, setContactName] = useState(draft.contactName || "");
  const [contactTitle, setContactTitle] = useState(draft.contactTitle || "");
  const [companyName, setCompanyName] = useState(draft.companyName || "");
  const [companyAddress, setCompanyAddress] = useState(draft.companyAddress || "");
  const [companyPhone, setCompanyPhone] = useState(draft.companyPhone || "");
  const [companyState, setCompanyState] = useState(draft.companyState || "");
  const [companyGoal, setCompanyGoal] = useState<string>(draft.companyGoal || COMPANY_GOALS[0]);
  const [companyDriverType, setCompanyDriverType] = useState<string>(draft.companyDriverType || "");
  const [companyEndorsements, setCompanyEndorsements] = useState<string[]>(
    draft.companyEndorsements ? (JSON.parse(draft.companyEndorsements) as string[]) : []
  );

  // Persist registration fields to sessionStorage on change
  const saveDraft = useCallback(() => {
    saveRegDraft({
      role, regEmail, firstName, lastName, homeAddress, zipCode,
      driverPhone, cdlNumber, interestedIn, nextJobWant, hasAccidents, wantsContact,
      contactName, contactTitle, companyName, companyAddress, companyPhone, companyState, companyGoal,
      companyDriverType, companyEndorsements: JSON.stringify(companyEndorsements),
    });
  }, [role, regEmail, firstName, lastName, homeAddress, zipCode,
      driverPhone, cdlNumber, interestedIn, nextJobWant, hasAccidents, wantsContact,
      contactName, contactTitle, companyName, companyAddress, companyPhone, companyState, companyGoal,
      companyDriverType, companyEndorsements]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Please enter your email and password.");
      return;
    }
    setSubmitStatus("submitting");
    const timeout = setTimeout(() => {
      setSubmitStatus("idle");
      toast.error("Sign in is taking too long. Please try again.");
    }, 15000);
    try {
      await signIn(loginEmail, loginPassword);
      clearTimeout(timeout);
      setSubmitStatus("success");
      toast.success("Welcome back!");
      await new Promise((r) => setTimeout(r, 800));
      onClose();
    } catch (err) {
      clearTimeout(timeout);
      setSubmitStatus("error");
      toast.error(friendlySignInError(err));
      await new Promise((r) => setTimeout(r, 800));
      setSubmitStatus("idle");
    }
  };

  const friendlyRegisterError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered"))
      return "This email is already registered. Please sign in instead.";
    if (msg.toLowerCase().includes("password") || msg.includes("422"))
      return "Password must be at least 12 characters.";
    return msg || "Registration failed. Please try again.";
  };

  const handleDriverRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPassword || !regEmail || !firstName.trim() || !lastName.trim() || !driverPhone.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!EMAIL_RE.test(regEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (regPassword.length < 12) {
      toast.error("Password must be at least 12 characters.");
      return;
    }
    if (zipCode && !ZIP_RE.test(zipCode)) {
      setZipError("Enter a valid US zip code (e.g. 33304).");
      toast.error("Enter a valid US zip code.");
      return;
    }
    setZipError("");
    setSubmitStatus("submitting");
    const timeout = setTimeout(() => {
      setSubmitStatus("idle");
      toast.error("Registration is taking too long. Please try again.");
    }, 15000);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      const driverFields = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: driverPhone || "",
        cdl_number: cdlNumber || "",
        zip_code: zipCode || "",
        home_address: homeAddress || "",
        interested_in: interestedIn || "",
        next_job_want: nextJobWant || "",
        has_accidents: hasAccidents || "",
        wants_contact: wantsContact || "",
      };
      await register(displayName, regEmail, regPassword, "driver", driverFields);

      // Check if session was created (email confirmation not required)
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 10_000);
      if (session) {
        try {
          const { error: upsertErr } = await supabase.from("driver_profiles").upsert({ id: session.user.id, ...driverFields });
          // If full upsert fails (e.g. new columns not yet migrated), retry with base columns only
          if (upsertErr) {
            await supabase.from("driver_profiles").upsert({
              id: session.user.id,
              first_name: driverFields.first_name,
              last_name: driverFields.last_name,
              phone: driverFields.phone,
              cdl_number: driverFields.cdl_number,
              zip_code: driverFields.zip_code,
            });
          }
        } catch { /* deferred population in AuthContext handles this */ }
        clearRegDraft();
        setSubmitStatus("success");
        toast.success("Registration successful!");
        await new Promise((r) => setTimeout(r, 800));
        onClose();
      } else {
        clearRegDraft();
        setSubmitStatus("success");
        await new Promise((r) => setTimeout(r, 800));
        setSubmitStatus("idle");
        setView("confirm-email");
      }
    } catch (err) {
      console.error("[SignInModal] driver register error:", err);
      setSubmitStatus("error");
      toast.error(friendlyRegisterError(err));
      await new Promise((r) => setTimeout(r, 800));
      setSubmitStatus("idle");
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleCompanyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !companyName || !companyPhone || !regEmail || !regPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!companyDriverType) {
      toast.error("Please select the type of drivers you want to hire.");
      return;
    }
    if (!EMAIL_RE.test(regEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (regPassword.length < 12) {
      toast.error("Password must be at least 12 characters.");
      return;
    }
    setSubmitStatus("submitting");
    const timeout = setTimeout(() => {
      setSubmitStatus("idle");
      toast.error("Registration is taking too long. Please try again.");
    }, 15000);
    try {
      const companyFields = {
        company_name: companyName,
        company_phone: companyPhone || "",
        company_address: companyAddress || "",
        company_state: companyState || "",
        company_email: regEmail,
        contact_name: contactName || "",
        contact_title: contactTitle || "",
        company_goal: companyGoal || "",
        company_driver_type: companyDriverType,
        company_endorsements: JSON.stringify(companyEndorsements),
      };
      await register(companyName, regEmail, regPassword, "company", companyFields);

      // Check if session was created (email confirmation not required)
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 10_000);
      if (session) {
        try {
          await supabase.from("company_profiles").upsert({
            id: session.user.id,
            company_name: companyName,
            phone: companyPhone || "",
            address: companyAddress || "",
            email: regEmail,
            contact_name: contactName || "",
            contact_title: contactTitle || "",
            company_goal: companyGoal || "",
            driver_types_wanted: companyDriverType,
            endorsements_needed: companyEndorsements.length > 0 ? companyEndorsements : null,
          });
        } catch { /* deferred population in AuthContext handles this */ }
        clearRegDraft();
        setSubmitStatus("success");
        toast.success("Registration successful!");
        await new Promise((r) => setTimeout(r, 800));
        onClose();
      } else {
        clearRegDraft();
        setSubmitStatus("success");
        await new Promise((r) => setTimeout(r, 800));
        setSubmitStatus("idle");
        setView("confirm-email");
      }
    } catch (err) {
      console.error("[SignInModal] company register error:", err);
      setSubmitStatus("error");
      toast.error(friendlyRegisterError(err));
      await new Promise((r) => setTimeout(r, 800));
      setSubmitStatus("idle");
    } finally {
      clearTimeout(timeout);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full max-w-md p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">
          {view === "login" ? "Login" : view === "forgot" ? "Reset Password" : view === "rules" ? "Rules" : view === "confirm-email" ? "Confirm Email" : "Register"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {view === "login" ? "Sign in to your account" : view === "forgot" ? "Reset your password" : view === "confirm-email" ? "Confirm your email address" : "Create a new account"}
        </DialogDescription>

        {/* ── LOGIN VIEW ── */}
        {view === "login" && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-primary shrink-0" />
                <h2 className="font-display font-bold text-base">Login</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:text-primary transition-colors" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 pt-5">
              <SocialLoginButtons />
              <OrDivider />
            </div>
            <form onSubmit={handleLogin} className="px-5 pb-5 space-y-3">
              <Input
                id="login-email"
                placeholder="Email"
                type="email"
                name="email"
                aria-label="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="username"
              />
              <PasswordInput
                id="login-password"
                placeholder="Password"
                name="loginPassword"
                aria-label="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button type="submit" disabled={submitStatus !== "idle"} className="w-full"><SubmitButtonLabel status={submitStatus} idle="Login" working="Signing in…" /></Button>
              <hr className="border-border" />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setResetEmail(loginEmail); setView("forgot"); }}
                >
                  Forgot Password?
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-foreground text-background hover:bg-foreground/90 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80"
                  onClick={() => setView("rules")}
                >
                  Registration
                </Button>
              </div>
            </form>
          </>
        )}

        {/* ── FORGOT PASSWORD VIEW ── */}
        {view === "forgot" && (
          <>
            <ModalHeader title="Reset Password" onClose={onClose} />
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!resetEmail) { toast.error("Please enter your email."); return; }
                setSubmitStatus("submitting");
                try {
                  const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(resetEmail, {
                    redirectTo: `${window.location.origin}/signin`,
                  }), 15_000);
                  if (error) throw error;
                  toast.success("Password reset email sent! Check your inbox.");
                  setView("login");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to send reset email.");
                } finally {
                  setSubmitStatus("idle");
                }
              }}
              className="px-5 py-5 space-y-3"
            >
              <p className="text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <Input
                id="reset-email"
                type="email"
                placeholder="Email address"
                name="resetEmail"
                aria-label="Email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
              />
              <Button type="submit" disabled={submitStatus !== "idle"} className="w-full">
                <SubmitButtonLabel status={submitStatus} idle="Send Reset Link" working="Sending…" />
              </Button>
              <button
                type="button"
                onClick={() => setView("login")}
                className="w-full text-center text-sm text-primary underline hover:opacity-80"
              >
                ← Back to login
              </button>
            </form>
          </>
        )}

        {/* ── RULES VIEW ── */}
        {view === "rules" && (
          <>
            <ModalHeader title="General rules on the website" onClose={onClose} />
            <div className="px-5 py-4 overflow-y-auto flex-1">
              {RULES_TEXT.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-3 leading-relaxed whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
              <Button className="flex-1" onClick={() => setView("register")}>
                Accept
              </Button>
              <Button variant="outline" className="flex-1 border-primary text-primary hover:bg-primary/5" onClick={() => setView("login")}>
                Decline
              </Button>
            </div>
          </>
        )}

        {/* ── REGISTER VIEW — matches /signin page layout ── */}
        {view === "register" && (
          <>
            <ModalHeader title="Create Your Account" onClose={onClose} />

            <div className="px-5 pt-5 space-y-4">
              <SocialLoginButtons />
              <OrDivider text="or sign up with email" />
            </div>

            <form
              onSubmit={role === "driver" ? handleDriverRegister : handleCompanyRegister}
              className="px-5 pb-5 space-y-4 overflow-y-auto flex-1"
            >
              {/* Role selector — card buttons like /signin */}
              <div className="space-y-1.5">
                <Label>I am a... <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("driver")}
                    className={`flex items-center gap-2.5 rounded-lg border-2 p-3 text-left transition-all ${
                      role === "driver" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      role === "driver" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <Truck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Driver</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">Find CDL jobs</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("company")}
                    className={`flex items-center gap-2.5 rounded-lg border-2 p-3 text-left transition-all ${
                      role === "company" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      role === "company" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <Briefcase className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Company</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">Hire drivers</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Driver required fields — same as /signin */}
              {role === "driver" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-firstName">First name <span className="text-destructive">*</span></Label>
                      <Input id="reg-firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-lastName">Last name <span className="text-destructive">*</span></Label>
                      <Input id="reg-lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-driverPhone">Phone number <span className="text-destructive">*</span></Label>
                    <Input id="reg-driverPhone" type="tel" placeholder="(555) 123-4567" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} autoComplete="tel" />
                  </div>
                </>
              )}

              {/* Company required fields — same as /signin */}
              {role === "company" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-companyName">Company name <span className="text-destructive">*</span></Label>
                    <Input id="co-companyName" placeholder="Acme Trucking LLC" value={companyName} onChange={(e) => setCompanyName(e.target.value)} autoComplete="organization" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-contactName">Contact name <span className="text-destructive">*</span></Label>
                    <Input id="co-contactName" placeholder="Jane Smith" value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-companyPhone">Phone number <span className="text-destructive">*</span></Label>
                    <Input id="co-companyPhone" type="tel" placeholder="(555) 123-4567" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} autoComplete="tel" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type of drivers needed <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-3 gap-2">
                      {COMPANY_DRIVER_TYPES.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCompanyDriverType(value)}
                          className={`text-xs py-2 px-1 rounded border transition-colors text-center ${
                            companyDriverType === value
                              ? "border-primary bg-primary/10 text-primary font-semibold"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Endorsements required <span className="text-xs text-muted-foreground font-normal">(select all that apply)</span></Label>
                    <div className="grid grid-cols-3 gap-2">
                      {COMPANY_ENDORSEMENTS.map((endorsement) => {
                        const checked = companyEndorsements.includes(endorsement);
                        return (
                          <button
                            key={endorsement}
                            type="button"
                            onClick={() =>
                              setCompanyEndorsements((prev) =>
                                checked ? prev.filter((e) => e !== endorsement) : [...prev, endorsement]
                              )
                            }
                            className={`text-xs py-2 px-1 rounded border transition-colors text-center ${
                              checked
                                ? "border-primary bg-primary/10 text-primary font-semibold"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            {endorsement}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Email — same as /signin */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email address <span className="text-destructive">*</span></Label>
                <Input id="reg-email" type="email" placeholder="you@example.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} autoComplete="email" />
              </div>

              {/* Password — same as /signin */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Password <span className="text-destructive">*</span></Label>
                <PasswordInput id="reg-password" placeholder="Min. 12 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} autoComplete="new-password" />
                <PasswordStrengthIndicator password={regPassword} />
              </div>

              {/* Additional Details — optional fields not on /signin */}
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="w-full flex items-center justify-between py-2.5 px-3 border border-border rounded-md text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Additional Details
                  <span className="text-xs text-primary font-medium">(Increases Matches)</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showOptionalFields ? "rotate-180" : ""}`} />
              </button>

              {showOptionalFields && role === "driver" && (
                <div className="space-y-3 pl-1 border-l-2 border-primary/30 ml-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-zipCode">Zip Code</Label>
                    <Input
                      id="reg-zipCode" placeholder="33304" value={zipCode}
                      onChange={(e) => { setZipCode(e.target.value); setZipError(""); }}
                      autoComplete="postal-code"
                      className={zipError ? "border-destructive" : ""}
                    />
                    {zipError && <p className="text-xs text-destructive">{zipError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-homeAddress">Home Address</Label>
                    <Input id="reg-homeAddress" placeholder="123 Main St" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} autoComplete="street-address" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-cdlNumber">CDL Number</Label>
                    <Input id="reg-cdlNumber" placeholder="CDL number" value={cdlNumber} onChange={(e) => setCdlNumber(e.target.value)} autoComplete="off" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>I am interested in</Label>
                    <Select value={interestedIn} onValueChange={setInterestedIn} name="interestedIn">
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DRIVER_INTERESTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>In my next job I want</Label>
                    <Select value={nextJobWant} onValueChange={setNextJobWant} name="nextJobWant">
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DRIVER_NEXT_JOB.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Any accidents or violations in last 2 years?</Label>
                    <Select value={hasAccidents} onValueChange={setHasAccidents} name="hasAccidents">
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="Yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {showOptionalFields && role === "company" && (
                <div className="space-y-3 pl-1 border-l-2 border-primary/30 ml-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="co-contactTitle">Your title</Label>
                    <Input id="co-contactTitle" placeholder="e.g. Fleet Manager" value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="co-companyAddress">Company Address</Label>
                    <Input id="co-companyAddress" placeholder="123 Main St, Chicago, IL" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} autoComplete="street-address" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Select value={companyState} onValueChange={setCompanyState} name="companyState">
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>What do you want to accomplish?</Label>
                    <Select value={companyGoal} onValueChange={setCompanyGoal} name="companyGoal">
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMPANY_GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={submitStatus !== "idle"} className="w-full">
                <SubmitButtonLabel status={submitStatus} idle="Create Account" working="Creating account…" />
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-1">
                Already have an account?{" "}
                <button type="button" onClick={() => setView("login")} className="text-primary font-medium hover:underline">
                  Sign In
                </button>
              </p>
            </form>
          </>
        )}

        {/* ── CONFIRM EMAIL VIEW ── */}
        {view === "confirm-email" && (
          <>
            <ModalHeader title="Check Your Email" onClose={onClose} />
            <div className="px-5 py-8 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">Confirm your email address</p>
                <p className="text-sm text-muted-foreground mt-2">
                  We sent a confirmation link to <span className="font-medium text-foreground">{regEmail}</span>.
                  Click the link in the email to activate your account.
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitStatus("submitting");
                    try {
                      const { error } = await supabase.auth.resend({
                        type: "signup",
                        email: regEmail,
                      });
                      if (error) throw error;
                      toast.success("Confirmation email resent! Check your inbox.");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to resend email.");
                    } finally {
                      setSubmitStatus("idle");
                    }
                  }}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  {submitting ? "Sending…" : "Resend Confirmation Email"}
                </Button>
                <Button className="w-full" onClick={() => setView("login")}>
                  Back to Login
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder or try resending.
              </p>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
