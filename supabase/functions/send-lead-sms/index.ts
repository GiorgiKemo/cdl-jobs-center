/**
 * send-lead-sms — Send an outbound SMS to a lead via Twilio.
 *
 * Called from the browser (company dashboard). Requires a valid user JWT.
 * Gated by subscription plan: unlimited only.
 *
 * Env vars required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *
 * Body: { lead_id: string, body: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Normalize a phone number to E.164 format (US assumed if no country code). */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { lead_id, body } = await req.json() as { lead_id?: string; body?: string };
    if (!lead_id || !body) {
      return json({ error: "Missing fields: lead_id, body" }, 400);
    }

    // SMS is unlimited plan only
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("company_id", user.id)
      .maybeSingle();

    if (!sub || sub.plan !== "unlimited") {
      return json({ error: "SMS outreach requires Unlimited plan" }, 403);
    }

    // Get lead phone
    const { data: lead } = await supabase
      .from("leads")
      .select("phone, full_name")
      .eq("id", lead_id)
      .maybeSingle();

    if (!lead?.phone) {
      return json({ error: "Lead has no phone number on file" }, 400);
    }

    // Twilio credentials
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!sid || !authToken || !fromNumber) {
      return json({ error: "SMS service not configured" }, 503);
    }

    const toNumber = normalizePhone(lead.phone);

    const twilioBody = new URLSearchParams({
      From: fromNumber,
      To: toNumber,
      Body: body,
    });

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: twilioBody,
      },
    );

    if (!twilioRes.ok) {
      const err = await twilioRes.text();
      throw new Error(`Twilio ${twilioRes.status}: ${err}`);
    }

    const twilioData = await twilioRes.json();

    // Log to lead_messages
    await supabase.from("lead_messages").insert({
      company_id: user.id,
      lead_id,
      direction: "outbound",
      channel: "sms",
      body,
      from_addr: fromNumber,
      to_addr: toNumber,
      status: "sent",
    });

    return json({ sent: true, twilio_sid: twilioData.sid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("send-lead-sms error:", message);
    return json({ error: message }, 500);
  }
});
