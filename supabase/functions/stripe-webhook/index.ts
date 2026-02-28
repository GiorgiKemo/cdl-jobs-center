import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Map plan name → lead limit */
const PLAN_LEADS: Record<string, number> = {
  free: 3,
  starter: 25,
  growth: 100,
  unlimited: 9999,
};

/** Map Stripe subscription status → app status */
const STATUS_MAP: Record<string, string> = {
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  trialing: "trialing",
  unpaid: "past_due",
  incomplete: "past_due",
  incomplete_expired: "canceled",
  paused: "canceled",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Must read as text for signature verification
    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get("STRIPE_WEBHOOK_SECRET")!
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid signature";
      console.error("Webhook signature verification failed:", msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!userId || !plan) {
          console.error("checkout.session.completed missing metadata", {
            userId,
            plan,
          });
          break;
        }

        // Fetch subscription from Stripe to get period dates
        const stripeSub = await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        );

        await supabase.from("subscriptions").upsert(
          {
            company_id: userId,
            plan,
            lead_limit: PLAN_LEADS[plan] ?? 3,
            leads_used: 0,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            status: "active",
            current_period_start: new Date(
              stripeSub.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              stripeSub.current_period_end * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id" }
        );

        console.log(
          `checkout.session.completed: userId=${userId} plan=${plan}`
        );
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const plan = sub.metadata?.plan ?? "free";

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan,
            lead_limit: PLAN_LEADS[plan] ?? 3,
            status: STATUS_MAP[sub.status] ?? "active",
            current_period_start: new Date(
              sub.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              sub.current_period_end * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        if (error) console.error("subscription.updated error:", error);
        else console.log(`subscription.updated: subId=${sub.id} plan=${plan}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            lead_limit: 3,
            status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        if (error) console.error("subscription.deleted error:", error);
        else console.log(`subscription.deleted: subId=${sub.id} → free`);
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Webhook handler error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
