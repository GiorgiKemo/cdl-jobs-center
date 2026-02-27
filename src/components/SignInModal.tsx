import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

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

interface SignInModalProps {
  onClose: () => void;
}

export function SignInModal({ onClose }: SignInModalProps) {
  const [view, setView] = useState<View>("login");
  const { signIn, register } = useAuth();

  // Login state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Shared register state
  const [role, setRole] = useState<"driver" | "company">("driver");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  // Driver-specific
  const [regUsername, setRegUsername] = useState("");

  // Company-specific
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyGoal, setCompanyGoal] = useState(COMPANY_GOALS[0]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      toast.error("Please enter your username and password.");
      return;
    }
    await signIn(loginUsername, loginPassword);
    toast.success("Welcome back!");
    onClose();
  };

  const handleDriverRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regEmail) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("Passwords do not match.");
      return;
    }
    await register(regUsername, regEmail, regPassword, "driver");
    toast.success("Account created! Welcome to CDL Jobs Center.");
    onClose();
  };

  const handleCompanyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !companyName || !regEmail || !regPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("Passwords do not match.");
      return;
    }
    await register(companyName, regEmail, regPassword, "company");
    toast.success("Company account created! Welcome to CDL Jobs Center.");
    onClose();
  };

  const ModalHeader = ({ title }: { title: string }) => (
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
                placeholder="Username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoComplete="username"
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full">Login</Button>
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
            <ModalHeader title="General rules on the website" />
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
            <ModalHeader title="New user registration" />

            {/* Role selector — always visible at top */}
            <div className="px-5 pt-4 pb-2 border-b border-border shrink-0">
              <label className="text-sm text-primary font-medium block mb-1">Who are you?</label>
              <Select value={role} onValueChange={(v) => setRole(v as "driver" | "company")}>
                <SelectTrigger className="w-full">
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
                  placeholder="Username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  autoComplete="username"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  type="email"
                  placeholder="Your e-mail"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                />
                <Button type="submit" className="w-full">Submit</Button>
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
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="Password *"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  placeholder="Confirm password *"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <hr className="border-border" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Company Profile</p>
                <Input
                  placeholder="Your name *"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <Input
                  placeholder="Your title"
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                />
                <Input
                  placeholder="Company Name *"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <Input
                  placeholder="Company Address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
                <Input
                  placeholder="Company phone number"
                  type="tel"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
                <div>
                  <label className="text-sm text-primary font-medium block mb-1">
                    What do you want to accomplish by using CDL Jobs Center?
                  </label>
                  <Select value={companyGoal} onValueChange={setCompanyGoal}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_GOALS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Submit</Button>
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
