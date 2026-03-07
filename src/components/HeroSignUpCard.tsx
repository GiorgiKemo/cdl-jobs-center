import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Truck, Briefcase, Mail, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { SocialLoginButtons, OrDivider } from "@/components/SocialLoginButtons";
import { withTimeout } from "@/lib/withTimeout";
import { getPasswordStrength, type PasswordStrengthLevel } from "@/lib/passwordStrength";

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
  const hints = [
    { ok: password.length >= 12, label: "12+ chars" },
    { ok: /[A-Z]/.test(password), label: "uppercase" },
    { ok: /[a-z]/.test(password), label: "lowercase" },
    { ok: /\d/.test(password), label: "number" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "symbol" },
  ];
  const missing = hints.filter((h) => !h.ok).map((h) => h.label);
  const conciseHint = missing.length === 0 ? "Looks strong." : `Add ${missing.slice(0, 2).join(" + ")}.`;
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

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

type SignUpRole = "driver" | "company";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegistrationModal({ open, onOpenChange }: Props) {
  const [signUpRole, setSignUpRole] = useState<SignUpRole | null>(null);
  // Driver fields (same as /signin)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  // Company fields (same as /signin)
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  // Auth fields (same as /signin)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Additional details (optional — NOT on /signin)
  const [showAdditional, setShowAdditional] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [licenseClass, setLicenseClass] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [interestedIn, setInterestedIn] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");

  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const { register } = useAuth();

  const reset = () => {
    setSignUpRole(null); setFirstName(""); setLastName(""); setDriverPhone("");
    setCompanyName(""); setContactName(""); setCompanyPhone("");
    setEmail(""); setPassword("");
    setZipCode(""); setLicenseClass(""); setYearsExp(""); setLicenseState("");
    setInterestedIn(""); setAddress(""); setWebsite("");
    setShowAdditional(false); setEmailSent(false); setSentEmail("");
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpRole) { toast.error("Please select whether you are a driver or a company."); return; }
    if (!email || !password) { toast.error("Please enter your email and password."); return; }
    if (signUpRole === "driver" && (!firstName.trim() || !lastName.trim() || !driverPhone.trim())) {
      toast.error("Please fill in all required fields."); return;
    }
    if (signUpRole === "company" && (!companyName.trim() || !contactName.trim() || !companyPhone.trim())) {
      toast.error("Please fill in all required fields."); return;
    }
    if (password.length < 12) { toast.error("Password must be at least 12 characters."); return; }

    setLoading(true);
    try {
      const displayName = signUpRole === "driver"
        ? `${firstName.trim()} ${lastName.trim()}`
        : contactName.trim();
      const profileFields: Record<string, string> = signUpRole === "driver"
        ? {
            first_name: firstName.trim(), last_name: lastName.trim(), phone: driverPhone.trim(),
            ...(zipCode && { zip_code: zipCode.trim() }),
            ...(licenseClass && { license_class: licenseClass }),
            ...(yearsExp && { years_exp: yearsExp }),
            ...(licenseState && { license_state: licenseState }),
            ...(interestedIn && { interested_in: interestedIn }),
          }
        : {
            company_name: companyName.trim(), contact_name: contactName.trim(), phone: companyPhone.trim(),
            ...(address && { address: address.trim() }),
            ...(website && { website: website.trim() }),
          };

      await withTimeout(register(displayName, email, password, signUpRole, profileFields), 15_000);
      setSentEmail(email);
      setEmailSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header — same as /signin */}
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="border-l-4 border-primary pl-3">
            <DialogTitle className="font-display font-bold text-lg">Create Your Account</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Join CDL Jobs Center as a driver or company</p>
          </div>
        </DialogHeader>

        {emailSent ? (
          <div className="px-5 py-10 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-display font-bold text-lg">Check Your Email</p>
              <p className="text-sm text-muted-foreground mt-1">We sent a confirmation link to</p>
              <p className="text-sm font-medium mt-1">{sentEmail}</p>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Click the link in the email to verify your account. Once confirmed, you can sign in.
            </p>
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <>
            {/* Social login — same as /signin */}
            <div className="px-5 pt-6 space-y-4">
              <SocialLoginButtons />
              <OrDivider text="or sign up with email" />
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-4">
              {/* Role selection — same card buttons as /signin */}
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

              {/* Driver fields — same as /signin */}
              {signUpRole === "driver" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-first-name">First name <span className="text-destructive">*</span></Label>
                      <Input id="modal-first-name" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-last-name">Last name <span className="text-destructive">*</span></Label>
                      <Input id="modal-last-name" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-driver-phone">Phone number <span className="text-destructive">*</span></Label>
                    <Input id="modal-driver-phone" type="tel" placeholder="(555) 123-4567" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} autoComplete="tel" />
                  </div>
                </>
              )}

              {/* Company fields — same as /signin */}
              {signUpRole === "company" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-company-name">Company name <span className="text-destructive">*</span></Label>
                    <Input id="modal-company-name" placeholder="Acme Trucking LLC" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-contact-name">Contact name <span className="text-destructive">*</span></Label>
                    <Input id="modal-contact-name" placeholder="Jane Smith" value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-company-phone">Phone number <span className="text-destructive">*</span></Label>
                    <Input id="modal-company-phone" type="tel" placeholder="(555) 123-4567" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} autoComplete="tel" />
                  </div>
                </>
              )}

              {/* Email — same as /signin */}
              <div className="space-y-1.5">
                <Label htmlFor="modal-email">Email address <span className="text-destructive">*</span></Label>
                <Input id="modal-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>

              {/* Password — same as /signin */}
              <div className="space-y-1.5">
                <Label htmlFor="modal-password">Password <span className="text-destructive">*</span></Label>
                <Input id="modal-password" type="password" placeholder="Min. 12 characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                <PasswordStrengthIndicator password={password} />
              </div>

              {/* Additional Details — NOT on /signin, these are the extra optional fields */}
              {signUpRole && (
                <div className="border border-border rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdditional(!showAdditional)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Additional Details
                      <span className="text-xs text-primary font-normal">(Increases Matches)</span>
                    </span>
                    {showAdditional
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {showAdditional && signUpRole === "driver" && (
                    <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border">
                      <div className="space-y-1.5">
                        <Label htmlFor="modal-zip">Zip Code</Label>
                        <Input id="modal-zip" placeholder="60601" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="modal-cdlclass">CDL Class</Label>
                        <Select value={licenseClass} onValueChange={setLicenseClass}>
                          <SelectTrigger id="modal-cdlclass"><SelectValue placeholder="Select class..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Class A">Class A</SelectItem>
                            <SelectItem value="Class B">Class B</SelectItem>
                            <SelectItem value="Class C">Class C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="modal-yearsexp">Years of Experience</Label>
                        <Input id="modal-yearsexp" type="number" min="0" max="50" placeholder="e.g. 5" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="modal-licstate">License State</Label>
                        <Select value={licenseState} onValueChange={setLicenseState}>
                          <SelectTrigger id="modal-licstate"><SelectValue placeholder="Select state..." /></SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="modal-interested">Interested In</Label>
                        <Select value={interestedIn} onValueChange={setInterestedIn}>
                          <SelectTrigger id="modal-interested"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Company driver">Company driver</SelectItem>
                            <SelectItem value="Owner operator">Owner operator</SelectItem>
                            <SelectItem value="Lease purchase">Lease purchase</SelectItem>
                            <SelectItem value="Team driving">Team driving</SelectItem>
                            <SelectItem value="Local routes">Local routes</SelectItem>
                            <SelectItem value="OTR (Over the road)">OTR (Over the road)</SelectItem>
                            <SelectItem value="Regional routes">Regional routes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {showAdditional && signUpRole === "company" && (
                    <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border">
                      <div className="space-y-1.5">
                        <Label htmlFor="modal-address">Address</Label>
                        <Input id="modal-address" placeholder="123 Main St, Chicago, IL" value={address} onChange={(e) => setAddress(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="modal-website">Website</Label>
                        <Input id="modal-website" type="url" placeholder="https://yourcompany.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit — same as /signin */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating account...</> : "Create Account"}
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-2">
                Already have an account?{" "}
                <Link to="/signin" className="text-primary font-medium hover:underline" onClick={() => handleOpenChange(false)}>
                  Sign In
                </Link>
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
