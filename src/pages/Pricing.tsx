import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import { PLANS, useSubscription, useUpgradeSubscription, type Plan } from "@/hooks/useSubscription";
import { Check, Zap, TrendingUp, Crown } from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCompany = user?.role === "company";
  const { data: subscription } = useSubscription(isCompany ? user?.id : undefined);
  const upgrade = useUpgradeSubscription();

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

    // If Stripe key is configured, redirect to Stripe Checkout
    if (STRIPE_KEY && planInfo.priceId && !planInfo.priceId.includes("placeholder")) {
      try {
        const stripe = await loadStripe(STRIPE_KEY);
        if (!stripe) throw new Error("Failed to load Stripe");

        // In production, this would call a backend endpoint to create a Checkout Session.
        // For now, we do a direct upgrade to demo the flow.
        toast.info("Stripe Checkout would open here. Simulating upgrade...");
      } catch {
        toast.error("Payment processing unavailable. Simulating upgrade.");
      }
    }

    // Demo mode: directly upgrade the subscription
    try {
      await upgrade.mutateAsync({ companyId: user.id, plan });
      toast.success(`Upgraded to ${PLANS[plan].label} plan!`);
      navigate("/dashboard?tab=leads");
    } catch {
      toast.error("Failed to upgrade. Please try again.");
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
                  <Button variant="outline" disabled className="w-full">
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant={popular ? "default" : "outline"}
                    className={`w-full ${popular ? "glow-orange" : ""}`}
                    onClick={() => handleSubscribe(plan)}
                    disabled={upgrade.isPending}
                  >
                    {upgrade.isPending ? "Processing..." : `Get ${info.label}`}
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
