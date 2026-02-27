import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Star, CheckCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApplyModal } from "@/components/ApplyModal";
import { SignInModal } from "@/components/SignInModal";
import { COMPANIES } from "@/data/companies";
import { toast } from "sonner";

const CompanyProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applyOpen, setApplyOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const company = COMPANIES.find((c) => c.slug === slug);

  // Redirect if company not found — done in effect to avoid render-time navigation
  useEffect(() => {
    if (!company) {
      toast.error("Company not found.");
      navigate("/companies");
    }
  }, [company, navigate]);

  // Load any dashboard-edited profile overrides for this company
  const profileOverride = (() => {
    try {
      const all = JSON.parse(localStorage.getItem("cdl-company-profiles") ?? "{}");
      return all[company?.name ?? ""] ?? null;
    } catch { return null; }
  })();

  if (!company) return null;

  const handleApplyClick = () => {
    if (!user) {
      setSignInOpen(true);
    } else if (user.role === "company") {
      toast.info("Company accounts cannot submit driver applications.");
    } else {
      setApplyOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8 max-w-4xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          <Link to="/companies" className="text-primary hover:underline">Companies</Link>
          <span className="mx-1">»</span>
          {company.name}
        </p>

        {/* Header card */}
        <div className="border border-border bg-card p-5 mb-4">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Logo */}
            {(() => {
              let logo = "";
              try { logo = JSON.parse(localStorage.getItem("cdl-company-logos") ?? "{}")[company.name] ?? ""; } catch {}
              return (
                <div className="shrink-0 h-20 w-20 bg-muted flex items-center justify-center font-display text-3xl font-bold text-primary border border-border overflow-hidden">
                  {logo ? (
                    <img src={logo} alt={company.name} className="h-full w-full object-contain p-1" />
                  ) : (
                    company.name.charAt(0)
                  )}
                </div>
              );
            })()}

            {/* Info — dashboard overrides take precedence over static data */}
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-primary text-lg mb-2">{profileOverride?.name ?? company.name}</h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                <Phone className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                {profileOverride?.phone || company.phone}
              </p>
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground mb-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
                {profileOverride?.address || company.address}
              </p>
              {(profileOverride?.website || company.website) && (
                <a
                  href={profileOverride?.website ?? company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Visit Company Website
                </a>
              )}
            </div>

            {/* Rating + actions */}
            <div className="shrink-0 flex flex-col items-end gap-3">
              <div className="flex gap-0.5">
                {Array.from({ length: company.rating }).map((_, j) => (
                  <Star key={j} className="h-5 w-5 fill-cdl-amber text-cdl-amber" />
                ))}
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 text-xs font-medium">
                <CheckCircle className="h-3 w-3" aria-hidden="true" /> VERIFIED COMPANY
              </span>
              <Button onClick={handleApplyClick} className="mt-1">
                Submit an Application
              </Button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="border border-border bg-card p-5 mb-4">
          <h2 className="font-display font-semibold text-base mb-2">About company</h2>
          <hr className="border-primary/20 mb-3" />
          <p className="text-sm text-muted-foreground leading-relaxed">{profileOverride?.about || company.about}</p>
        </div>

        {/* Information panel */}
        {(!user || user.role !== "driver") && (
          <div className="border border-border bg-blue-50/50 dark:bg-blue-950/20 p-5">
            <h2 className="font-semibold text-sm mb-2">Information</h2>
            {!user ? (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Users of <strong className="text-foreground">Guests</strong> are not allowed to submit applications.
                </p>
                <Button size="sm" onClick={() => setSignInOpen(true)}>Sign in</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Company accounts cannot submit driver applications.</p>
            )}
          </div>
        )}
      </main>
      <Footer />

      {applyOpen && (
        <ApplyModal companyName={company.name} onClose={() => setApplyOpen(false)} />
      )}
      {signInOpen && (
        <SignInModal onClose={() => setSignInOpen(false)} />
      )}
    </div>
  );
};

export default CompanyProfile;
