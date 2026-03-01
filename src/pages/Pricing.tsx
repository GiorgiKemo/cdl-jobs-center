import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import { PLANS, useSubscription, type Plan } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase";
import { Check, Zap, TrendingUp, Crown } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";

const tierDetails: Array<{
  plan: Plan;
  icon: React.ReactNode;
  features: string[];
  popular?: boolean;
}> = [
  {
    plan: "starter",
    icon: <Zap className="h-6 w-6" />,
    features: [
      "25 driver leads per month",
      "Filter by state & driver type",
      "Contact info (phone + email)",
      "Lead status tracking",
      "Email support",
    ],
  },
  {
    plan: "growth",
    icon: <TrendingUp className="h-6 w-6" />,
    popular: true,
    features: [
      "100 driver leads per month",
      "Everything in Starter",
      "Owner operator truck details",
      "Priority lead delivery",
      "Priority support",
    ],
  },
  {
    plan: "unlimited",
    icon: <Crown className="h-6 w-6" />,
    features: [
      "Unlimited driver leads",
      "Everything in Growth",
      "Real-time lead notifications",
      "Dedicated account manager",
      "Custom matching criteria",
    ],
  },
];

const Pricing = () => {
  usePageTitle("Pricing");
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCompany = user?.role === "company";
  const { data: subscription } = useSubscription(isCompany ? user?.id : undefined);
  const [loading, setLoading] = useState<Plan | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      navigate("/signin");
      return;
    }
    if (user.role !== "company") {
      toast.error("Only company accounts can subscribe to lead plans.");
      return;
    }

    const planInfo = PLANS[plan];
    if (!planInfo.priceId) {
      toast.error("This plan is not available for purchase.");
      return;
    }

    try {
      setLoading(plan);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/signin");
        return;
      }

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? `Checkout failed (${res.status})`);
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Get Access to <span className="text-primary">Driver Leads</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect with CDL drivers actively looking for jobs. Choose a plan based on how many leads you need each month.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tierDetails.map(({ plan, icon, features, popular }) => {
            const info = PLANS[plan];
            const isCurrent = subscription?.plan === plan;

            return (
              <div
                key={plan}
                className={`relative border bg-card p-6 flex flex-col ${
                  popular
                    ? "border-primary shadow-lg ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    popular ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg">{info.label}</h3>
                    <p className="text-xs text-muted-foreground">{info.leads === 9999 ? "Unlimited" : info.leads} leads/month</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="font-display text-4xl font-bold">${info.price}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/dashboard?tab=subscription")}
                  >
                    Manage Subscription
                  </Button>
                ) : (
                  <Button
                    variant={popular ? "default" : "outline"}
                    className={`w-full ${popular ? "glow-orange" : ""}`}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading !== null}
                  >
                    {loading === plan ? "Redirecting..." : `Get ${info.label}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Free tier note */}
        <div className="text-center mt-8 text-sm text-muted-foreground max-w-xl mx-auto">
          <p>
            All company accounts start with <strong>3 free leads</strong> to preview the quality.
            {subscription?.plan === "free" && isCompany && (
              <span className="text-primary font-medium"> You're currently on the free tier.</span>
            )}
          </p>
          <p className="mt-2">
            Plans renew monthly. Cancel anytime from your dashboard. Prices and lead limits can be adjusted.
          </p>
        </div>

        {/* Current plan banner for logged-in companies */}
        {isCompany && subscription && subscription.plan !== "free" && (
          <div className="mt-8 max-w-xl mx-auto border border-primary/20 bg-primary/5 p-4 text-center text-sm">
            <p>
              You're on the <strong className="text-primary">{PLANS[subscription.plan].label}</strong> plan.{" "}
              {subscription.leadLimit === 9999
                ? "Unlimited leads."
                : `${subscription.leadLimit - subscription.leadsUsed} leads remaining this period.`}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
