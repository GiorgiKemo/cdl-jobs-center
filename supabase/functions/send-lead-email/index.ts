/**
 * send-lead-email — Send an outbound email to a lead or registered driver via Mailgun.
 *
 * Called from the browser (company dashboard). Requires a valid user JWT.
 * Gated by subscription plan: starter / growth / unlimited.
 *
 * Env vars required: MAILGUN_API_KEY, MAILGUN_DOMAIN
 * Optional:          MAILGUN_SENDER_EMAIL (defaults to noreply@{domain})
 *
 * Body: { lead_id: string, subject: string, body: string (HTML or plain) }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLANS_WITH_EMAIL = new Set(["starter", "growth", "unlimited"]);

/** Convert UUID to hex string without dashes */
function uuidToHex(uuid: string): string {
  return uuid.replace(/-/g, "");
}

async function mailgunSend(
  apiKey: string,
  domain: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  replyTo: string,
): Promise<string> {
  const body = new URLSearchParams({ from, to, subject, html });
  body.set("h:Reply-To", replyTo);
  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa("api:" + apiKey)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mailgun ${res.status}: ${err}`);
  }
  const data = await res.json();
  return (data.id as string) ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth header" }, 401);

    // Use anon key + user JWT to verify identity (standard Supabase pattern)
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Service-role client for DB operations that bypass RLS
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { lead_id, subject, body } = await req.json() as {
      lead_id?: string; subject?: string; body?: string;
    };
    if (!lead_id || !subject || !body) {
      return json({ error: "Missing fields: lead_id, subject, body" }, 400);
    }

    // Check subscription plan
    const { data: sub } = await db
      .from("subscriptions")
      .select("plan")
      .eq("company_id", user.id)
      .maybeSingle();

    if (!sub || !PLANS_WITH_EMAIL.has(sub.plan)) {
      return json({ error: "Email outreach requires Starter plan or higher" }, 403);
    }

    // Look up recipient email — check leads table first, then registered profiles
    let recipientEmail: string | null = null;

    const { data: lead } = await db
      .from("leads")
      .select("email")
      .eq("id", lead_id)
      .maybeSingle();

    if (lead?.email) {
      recipientEmail = lead.email;
    } else {
      // Registered driver — look up from auth profiles
      const { data: profile } = await db
        .from("profiles")
        .select("email")
        .eq("id", lead_id)
        .maybeSingle();
      recipientEmail = profile?.email ?? null;
    }

    if (!recipientEmail) {
      return json({ error: "Recipient has no email address on file" }, 400);
    }

    // Get company name for the From header
    const { data: company } = await db
      .from("company_profiles")
      .select("company_name")
      .eq("id", user.id)
      .maybeSingle();
    const companyName = company?.company_name || "A CDL Employer";

    // Mailgun credentials
    const apiKey = Deno.env.get("MAILGUN_API_KEY");
    const domain = Deno.env.get("MAILGUN_DOMAIN");
    const senderEmail = Deno.env.get("MAILGUN_SENDER_EMAIL") ?? `noreply@${domain}`;
    if (!apiKey || !domain) {
      return json({ error: "Email service not configured" }, 503);
    }

    // Encode company + lead in the reply-to so inbound routing can match them
    const replyTo = `reply+${uuidToHex(user.id)}_${uuidToHex(lead_id)}@${domain}`;

    const mgId = await mailgunSend(
      apiKey, domain,
      `${companyName} via CDL Jobs Center <${senderEmail}>`,
      recipientEmail,
      subject,
      body,
      replyTo,
    );

    // Log to lead_messages
    await db.from("lead_messages").insert({
      company_id: user.id,
      lead_id,
      direction: "outbound",
      channel: "email",
      subject,
      body,
      from_addr: senderEmail,
      to_addr: recipientEmail,
      mg_id: mgId,
      status: "sent",
    });

    return json({ sent: true, mg_id: mgId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("send-lead-email error:", message);
    return json({ error: message }, 500);
  }
});
