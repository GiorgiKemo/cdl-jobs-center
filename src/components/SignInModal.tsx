import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";

type View = "login" | "rules" | "register";

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

const COMPANY_GOALS = [
  "Acquire more driver leads",
  "Hire more CDL Class A drivers",
  "Post Jobs to attract applicants",
  "Receive driver exposure",
  "Use CDL Jobs Center Recruiting team to help you hire drivers",
];

const DRIVER_INTERESTS = [
  "Lease purchase",
  "Company driver",
  "Owner operator",
  "Team driving",
  "Local routes",
  "Regional routes",
  "OTR (Over the road)",
];

const DRIVER_NEXT_JOB = [
  "Higher pay",
  "Better home time",
  "Sign-on bonus",
  "Health benefits",
  "Stable routes",
  "Career growth",
  "Newer equipment",
];

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

export function SignInModal({ onClose }: SignInModalProps) {
  const [view, setView] = useState<View>("login");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, register } = useAuth();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Shared register state
  const [role, setRole] = useState<"driver" | "company">("driver");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Driver-specific
  const [regUsername, setRegUsername] = useState("");
  const [driverName, setDriverName] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [cdlNumber, setCdlNumber] = useState("");
  const [interestedIn, setInterestedIn] = useState(DRIVER_INTERESTS[0]);
  const [nextJobWant, setNextJobWant] = useState(DRIVER_NEXT_JOB[0]);
  const [hasAccidents, setHasAccidents] = useState("No");
  const [wantsContact, setWantsContact] = useState("Yes");

  // Company-specific
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyGoal, setCompanyGoal] = useState(COMPANY_GOALS[0]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    const timeout = setTimeout(() => {
      setSubmitting(false);
      toast.error("Sign in is taking too long. Please try again.");
    }, 15000);
    try {
      await signIn(loginEmail, loginPassword);
      clearTimeout(timeout);
      toast.success("Welcome back!");
      onClose();
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("not confirmed")) {
        toast.error("Your email is not confirmed yet. Check your inbox or contact support.");
      } else if (msg.toLowerCase().includes("invalid login")) {
        toast.error("Incorrect email or password.");
      } else {
        toast.error(msg || "Sign in failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const friendlyRegisterError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered"))
      return "This email is already registered. Please sign in instead.";
    if (msg.toLowerCase().includes("password") || msg.includes("422"))
      return "Password must be at least 6 characters.";
    return msg || "Registration failed. Please try again.";
  };

  const handleDriverRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regEmail) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const newUser = await register(regUsername, regEmail, regPassword, "driver");
      // Save driver profile fields collected during registration
      if (newUser) {
        const [first, ...rest] = driverName.trim().split(/\s+/);
        await supabase.from("driver_profiles").upsert({
          id: newUser.id,
          first_name: first || "",
          last_name: rest.join(" ") || "",
          phone: driverPhone || "",
          cdl_number: cdlNumber || "",
        });
      }
      toast.success("Account created! You're now signed in.");
      onClose();
    } catch (err) {
      toast.error(friendlyRegisterError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompanyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !companyName || !regEmail || !regPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const newUser = await register(companyName, regEmail, regPassword, "company");
      // Save company profile fields collected during registration
      if (newUser) {
        await supabase.from("company_profiles").upsert({
          id: newUser.id,
          company_name: companyName,
          phone: companyPhone || "",
          address: companyAddress || "",
          email: regEmail,
        });
      }
      toast.success("Company account created! You're now signed in.");
      onClose();
    } catch (err) {
      toast.error(friendlyRegisterError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border w-full max-w-md shadow-lg max-h-[90vh] flex flex-col">

        {/* ── LOGIN VIEW ── */}
        {view === "login" && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display font-bold text-lg">Login</h2>
              <button onClick={onClose} className="p-1 hover:text-primary transition-colors" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleLogin} className="px-5 py-5 space-y-3">
              <Input
                placeholder="Email"
                type="email"
                name="email"
                aria-label="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="username"
              />
              <Input
                type="password"
                placeholder="Password"
                name="loginPassword"
                aria-label="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Signing in…" : "Login"}</Button>
              <hr className="border-border" />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => toast.info("Password reset coming soon.")}
                >
                  Forgot it?
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

        {/* ── REGISTER VIEW ── */}
        {view === "register" && (
          <>
            <ModalHeader title="New user registration" onClose={onClose} />

            {/* Role selector — always visible at top */}
            <div className="px-5 pt-4 pb-2 border-b border-border shrink-0">
              <label className="text-sm text-primary font-medium block mb-1">Who are you?</label>
              <Select value={role} onValueChange={(v) => setRole(v as "driver" | "company")}>
                <SelectTrigger className="w-full" aria-label="Who are you?">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── DRIVER FORM ── */}
            {role === "driver" && (
              <form onSubmit={handleDriverRegister} className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
                <Input
                  placeholder="Username *"
                  name="registerUsername"
                  aria-label="Username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  autoComplete="username"
                />
                <Input
                  type="email"
                  placeholder="Your e-mail *"
                  name="registerEmail"
                  aria-label="Email address"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="Password *"
                  name="registerPassword"
                  aria-label="Password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  placeholder="Confirm password *"
                  name="registerConfirmPassword"
                  aria-label="Confirm password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <hr className="border-border" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Driver Profile</p>
                <Input
                  placeholder="Your name"
                  name="driverName"
                  aria-label="Your name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  autoComplete="name"
                />
                <Input
                  placeholder="Home Address"
                  name="homeAddress"
                  aria-label="Home address"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  autoComplete="street-address"
                />
                <Input
                  placeholder="Zip Code"
                  name="zipCode"
                  aria-label="Zip code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  autoComplete="postal-code"
                />
                <Input
                  placeholder="Phone Number"
                  type="tel"
                  name="driverPhone"
                  aria-label="Phone number"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  autoComplete="tel"
                />
                <Input
                  placeholder="CDL Number"
                  name="cdlNumber"
                  aria-label="CDL number"
                  value={cdlNumber}
                  onChange={(e) => setCdlNumber(e.target.value)}
                />
                <div>
                  <label className="text-sm text-primary font-medium block mb-1">I am interested in:</label>
                  <Select value={interestedIn} onValueChange={setInterestedIn}>
                    <SelectTrigger className="w-full" aria-label="I am interested in"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DRIVER_INTERESTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-primary font-medium block mb-1">In my next job I want:</label>
                  <Select value={nextJobWant} onValueChange={setNextJobWant}>
                    <SelectTrigger className="w-full" aria-label="In my next job I want"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DRIVER_NEXT_JOB.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-primary font-medium block mb-1">Any accidents or violations in the last 2 years?</label>
                  <Select value={hasAccidents} onValueChange={setHasAccidents}>
                    <SelectTrigger className="w-full" aria-label="Any accidents or violations in the last 2 years"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-primary font-medium block mb-1">I want CDL Jobs Center staff to contact me with employment offers</label>
                  <Select value={wantsContact} onValueChange={setWantsContact}>
                    <SelectTrigger className="w-full" aria-label="Contact me with employment offers"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Submitting…" : "Submit"}</Button>
                <button type="button" onClick={() => setView("login")} className="w-full text-center text-sm text-primary hover:underline">
                  ← Back to login
                </button>
              </form>
            )}

            {/* ── COMPANY FORM ── */}
            {role === "company" && (
              <form onSubmit={handleCompanyRegister} className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
                <Input
                  type="email"
                  placeholder="Your e-mail *"
                  name="companyEmail"
                  aria-label="Company email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="Password *"
                  name="companyPassword"
                  aria-label="Company password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  placeholder="Confirm password *"
                  name="companyConfirmPassword"
                  aria-label="Confirm company password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <hr className="border-border" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Company Profile</p>
                <Input
                  placeholder="Your name *"
                  name="contactName"
                  aria-label="Contact name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <Input
                  placeholder="Your title"
                  name="contactTitle"
                  aria-label="Contact title"
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                />
                <Input
                  placeholder="Company Name *"
                  name="companyName"
                  aria-label="Company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <Input
                  placeholder="Company Address"
                  name="companyAddress"
                  aria-label="Company address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
                <Input
                  placeholder="Company phone number"
                  type="tel"
                  name="companyPhone"
                  aria-label="Company phone number"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
                <div>
                  <label className="text-sm text-primary font-medium block mb-1">
                    What do you want to accomplish by using CDL Jobs Center?
                  </label>
                  <Select value={companyGoal} onValueChange={setCompanyGoal}>
                    <SelectTrigger className="w-full" aria-label="Company goal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_GOALS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Submitting…" : "Submit"}</Button>
                <button type="button" onClick={() => setView("login")} className="w-full text-center text-sm text-primary hover:underline">
                  ← Back to login
                </button>
              </form>
            )}
          </>
        )}

      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
