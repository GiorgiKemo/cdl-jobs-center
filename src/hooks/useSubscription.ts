import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Plan = "free" | "starter" | "growth" | "unlimited";

export interface Subscription {
  id: string;
  companyId: string;
  plan: Plan;
  leadLimit: number;
  leadsUsed: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodEnd: string | null;
  createdAt: string;
}

export const PLANS = {
  free:      { label: "Free",      price: 0,   leads: 3,    priceId: "" },
  starter:   { label: "Starter",   price: 49,  leads: 25,   priceId: "price_1T5bgMBFInekdfRO2i7HVDfU" },
  growth:    { label: "Growth",    price: 149, leads: 100,  priceId: "price_1T5bgmBFInekdfROyARtm9fx" },
  unlimited: { label: "Unlimited", price: 299, leads: 9999, priceId: "price_1T5bgyBFInekdfRO05OK8At6" },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSub(row: Record<string, any>): Subscription {
  return {
    id: row.id,
    companyId: row.company_id,
    plan: row.plan ?? "free",
    leadLimit: row.lead_limit ?? 3,
    leadsUsed: row.leads_used ?? 0,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    status: row.status ?? "active",
    currentPeriodEnd: row.current_period_end ?? null,
    createdAt: row.created_at,
  };
}

/** Get (or create) the company's subscription */
export function useSubscription(companyId: string | undefined) {
  return useQuery({
    queryKey: ["subscription", companyId],
    queryFn: async () => {
      // Try to fetch existing
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        // Table might not exist yet — return mock free sub
        return mockFreeSub(companyId!);
      }

      if (data) return rowToSub(data);

      // No subscription row — create a free one
      const { data: newRow, error: insertErr } = await supabase
        .from("subscriptions")
        .insert({ company_id: companyId!, plan: "free", lead_limit: 3, leads_used: 0 })
        .select()
        .single();

      if (insertErr) return mockFreeSub(companyId!);
      return rowToSub(newRow);
    },
    enabled: !!companyId,
  });
}

/** Upgrade subscription (called after Stripe Checkout success) */
export function useUpgradeSubscription() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      companyId: string;
      plan: Plan;
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
    }) => {
      const planInfo = PLANS[params.plan];
      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          company_id: params.companyId,
          plan: params.plan,
          lead_limit: planInfo.leads,
          leads_used: 0,
          stripe_customer_id: params.stripeCustomerId ?? null,
          stripe_subscription_id: params.stripeSubscriptionId ?? null,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["subscription", vars.companyId] });
    },
  });
}

/** Cancel subscription — revert to free plan */
export function useCancelSubscription() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: "free",
          lead_limit: 3,
          status: "active",
          stripe_customer_id: null,
          stripe_subscription_id: null,
          current_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: (_data, companyId) => {
      qc.invalidateQueries({ queryKey: ["subscription", companyId] });
    },
  });
}

function mockFreeSub(companyId: string): Subscription {
  return {
    id: "mock-free",
    companyId,
    plan: "free",
    leadLimit: 3,
    leadsUsed: 0,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    status: "active",
    currentPeriodEnd: null,
    createdAt: new Date().toISOString(),
  };
}
