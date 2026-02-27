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

interface SignInModalProps {
  onClose: () => void;
}

export function SignInModal({ onClose }: SignInModalProps) {
  const [view, setView] = useState<View>("login");
  const { signIn, register } = useAuth();

  // Login state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [role, setRole] = useState<"driver" | "company">("driver");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regEmail, setRegEmail] = useState("");

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regEmail) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("Passwords do not match.");
      return;
    }
    await register(regUsername, regEmail, regPassword, role);
    toast.success("Account created! Welcome to CDL Jobs Center.");
    onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border w-full max-w-md shadow-lg">

        {/* ── LOGIN VIEW ── */}
        {view === "login" && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display font-bold text-lg">Login</h2>
              <button onClick={onClose} className="p-1 hover:text-primary transition-colors">
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-primary" />
                <h2 className="font-display font-bold text-base">General rules on the website</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:text-primary transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-96 overflow-y-auto">
              {RULES_TEXT.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-3 leading-relaxed whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border">
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-primary" />
                <h2 className="font-display font-bold text-base">New user registration</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:text-primary transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRegister} className="px-5 py-5 space-y-3">
              <div>
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
              <button
                type="button"
                onClick={() => setView("login")}
                className="w-full text-center text-sm text-primary hover:underline"
              >
                ← Back to login
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
