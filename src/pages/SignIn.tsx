import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Truck, Briefcase, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { usePageTitle, useNoIndex } from "@/hooks/usePageTitle";
import { supabase } from "@/lib/supabase";
import { friendlySignInError } from "@/lib/authErrorMessages";
import { getPasswordStrength, type PasswordStrengthLevel } from "@/lib/passwordStrength";
import { SocialLoginButtons, OrDivider } from "@/components/SocialLoginButtons";
import { withTimeout } from "@/lib/withTimeout";
import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";
import { COMPANY_DRIVER_TYPES, COMPANY_ENDORSEMENTS } from "@/data/constants";

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
          {strength.label.charAt(0).toUpperCase() + strength.label.slice(1)}
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

type SignUpRole = "driver" | "company";

const SignIn = () => {
  usePageTitle("Sign In");
  useNoIndex();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpRole, setSignUpRole] = useState<SignUpRole | null>(null);
  // Driver fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  // Company fields
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyDriverType, setCompanyDriverType] = useState("");
  const [companyEndorsements, setCompanyEndorsements] = useState<string[]>([]);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { signIn, register } = useAuth();
  const navigate = useNavigate();

  // Detect PASSWORD_RECOVERY event when user clicks reset link from email
  useEffect(() => {
    // Check URL hash for recovery token (in case event fired before mount)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setRecovering(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovering(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password: newPassword }), 15_000);
      if (error) throw error;
      toast.success("Password updated successfully!");
      setRecovering(false);
      setNewPassword("");
      setConfirmPassword("");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    if (isSignUp) {
      if (!signUpRole) {
        toast.error("Please select whether you are a driver or a company.");
        return;
      }
      if (signUpRole === "driver") {
        if (!firstName.trim() || !lastName.trim() || !driverPhone.trim()) {
          toast.error("Please fill in all required fields.");
          return;
        }
      } else {
        if (!companyName.trim() || !contactName.trim() || !companyPhone.trim()) {
          toast.error("Please fill in all required fields.");
          return;
        }
        if (!companyDriverType) {
          toast.error("Please select the type of drivers you want to hire.");
          return;
        }
      }
      if (password.length < 12) {
        toast.error("Password must be at least 12 characters.");
        return;
      }
      setLoading(true);
      try {
        const displayName = signUpRole === "driver"
          ? `${firstName.trim()} ${lastName.trim()}`
          : contactName.trim();
        const profileFields = signUpRole === "driver"
          ? { first_name: firstName.trim(), last_name: lastName.trim(), phone: driverPhone.trim() }
          : {
              company_name: companyName.trim(),
              contact_name: contactName.trim(),
              phone: companyPhone.trim(),
              company_driver_type: companyDriverType,
              company_endorsements: JSON.stringify(companyEndorsements),
            };
        await withTimeout(register(displayName, email, password, signUpRole, profileFields), 15_000);
        setSentEmail(email);
        setEmailSent(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Registration failed.");
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      await withTimeout(signIn(email, password), 15_000);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      toast.error(friendlySignInError(err));
    } finally {
      setLoading(false);
    }
  };

  // Determine page title and breadcrumb
  const pageLabel = recovering
    ? "Reset Password"
    : emailSent
    ? "Check Your Email"
    : isSignUp
    ? "Create Account"
    : "Sign In";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border">
        <div className="container mx-auto py-4">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="font-display">
              <span className="text-xl font-bold">CDL</span>
              <span className="text-xl font-bold text-primary"> Jobs</span>
              <span className="text-xl font-light">Center</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Breadcrumb */}
          <PageBreadcrumb items={[{ label: "Main", to: "/" }, { label: pageLabel }]} />

          <div className="border border-border bg-card">
            {/* ── Email Confirmation Screen ─────────────────────────────── */}
            {emailSent ? (
              <div className="px-5 py-10 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-lg">Check Your Email</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We sent a confirmation link to
                  </p>
                  <p className="text-sm font-medium mt-1">{sentEmail}</p>
                </div>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Click the link in the email to verify your account. Once confirmed, you can sign in and complete your profile setup.
                </p>
                <div className="pt-2 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setEmailSent(false);
                      setIsSignUp(false);
                      setPassword("");
                    }}
                  >
                    Back to Sign In
                  </Button>
                </div>
              </div>
            ) : recovering ? (
              <>
                {/* Header */}
                <div className="border-b border-border px-5 py-4">
                  <div className="border-l-4 border-primary pl-3">
                    <p className="font-display font-bold text-lg">Set a New Password</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Choose a strong password for your account
                    </p>
                  </div>
                </div>
                <form onSubmit={handleResetPassword} className="px-5 py-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <PasswordInput
                      id="new-password"
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <PasswordStrengthIndicator password={newPassword} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <PasswordInput
                      id="confirm-password"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      aria-invalid={confirmPassword.length > 0 && newPassword !== confirmPassword}
                      className={confirmPassword.length > 0 && newPassword !== confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </>
            ) : (
              <>
                {/* Header */}
                <div className="border-b border-border px-5 py-4">
                  <div className="border-l-4 border-primary pl-3">
                    <p className="font-display font-bold text-lg">
                      {isSignUp ? "Create Your Account" : "Sign In to Your Account"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {isSignUp
                        ? "Join CDL Jobs Center as a driver or company"
                        : "Access your driver profile and saved jobs"}
                    </p>
                  </div>
                </div>

                <div className="px-5 pt-6 space-y-4">
                  <SocialLoginButtons />
                  <OrDivider text={isSignUp ? "or sign up with email" : "or sign in with email"} />
                </div>
                <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-4">
                  {isSignUp && (
                    <>
                      {/* Role selection */}
                      <div className="space-y-1.5">
                        <Label>I am a... <span className="text-destructive">*</span></Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setSignUpRole("driver")}
                            className={`flex items-center gap-2.5 rounded-lg border-2 p-3 text-left transition-all ${
                              signUpRole === "driver"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/40"
                            }`}
                          >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              signUpRole === "driver" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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
                            onClick={() => setSignUpRole("company")}
                            className={`flex items-center gap-2.5 rounded-lg border-2 p-3 text-left transition-all ${
                              signUpRole === "company"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/40"
                            }`}
                          >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              signUpRole === "company" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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

                      {/* Role-specific fields */}
                      {signUpRole === "driver" && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="first-name">First name <span className="text-destructive">*</span></Label>
                              <Input id="first-name" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="last-name">Last name <span className="text-destructive">*</span></Label>
                              <Input id="last-name" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="driver-phone">Phone number <span className="text-destructive">*</span></Label>
                            <Input id="driver-phone" type="tel" placeholder="(555) 123-4567" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} autoComplete="tel" />
                          </div>
                        </>
                      )}
                      {signUpRole === "company" && (
                        <>
                          <div className="space-y-1.5">
                            <Label htmlFor="company-name">Company name <span className="text-destructive">*</span></Label>
                            <Input id="company-name" placeholder="Acme Trucking LLC" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="contact-name">Contact name <span className="text-destructive">*</span></Label>
                            <Input id="contact-name" placeholder="Jane Smith" value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="company-phone">Phone number <span className="text-destructive">*</span></Label>
                            <Input id="company-phone" type="tel" placeholder="(555) 123-4567" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} autoComplete="tel" />
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
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address {isSignUp && <span className="text-destructive">*</span>}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password {isSignUp && <span className="text-destructive">*</span>}</Label>
                      {!isSignUp && (
                        <button
                          type="button"
                          className="text-xs text-primary underline hover:opacity-80"
                          onClick={async () => {
                            if (!email) {
                              toast.error("Enter your email first, then click Forgot password.");
                              return;
                            }
                            try {
                              const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(email, {
                                redirectTo: `${window.location.origin}/signin`,
                              }), 15_000);
                              if (error) throw error;
                              toast.success("Password reset email sent! Check your inbox.");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Failed to send reset email.");
                            }
                          }}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <PasswordInput
                      id="password"
                      placeholder={isSignUp ? "Min. 12 characters" : "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                    />
                    {isSignUp && <PasswordStrengthIndicator password={password} />}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {isSignUp ? "Creating account..." : "Signing in..."}
                      </>
                    ) : isSignUp ? "Create Account" : "Sign In"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground pt-2">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                      type="button"
                      className="text-primary font-medium hover:underline"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setSignUpRole(null);
                      }}
                    >
                      {isSignUp ? "Sign In" : "Create Account"}
                    </button>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignIn;
